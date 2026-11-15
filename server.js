/**
 * server.js — Standalone Socket.IO server + cron-based in-app notifications
 *
 * Run with: node server.js
 * Deploy to: Render (free tier) — connect your GitHub repo and set env vars
 *
 * This process handles:
 *   1. Real-time Socket.IO events (authenticated via JWT)
 *   2. node-cron job that checks for upcoming and overdue assignment deadlines
 *      and persists in-app notifications
 */

require('dotenv').config({ path: '.env.local' });

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cron      = require('node-cron');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');
const mongoose  = require('mongoose');

// ─── Environment Validation ────────────────────────────────────────────────

const required = ['MONGODB_URI', 'JWT_SECRET'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`[server] Missing required env var: ${key}`);
    process.exit(1);
  }
});

// ─── Express App ───────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Socket.IO ─────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// JWT auth middleware for Socket.IO connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = String(decoded.id);
    next();
  } catch {
    next(new Error('Invalid or expired token.'));
  }
});

io.on('connection', (socket) => {
  const room = `student:${socket.userId}`;
  socket.join(room);
  console.log(`[socket] Connected: ${socket.userId} → room ${room}`);

  socket.on('disconnect', () => {
    console.log(`[socket] Disconnected: ${socket.userId}`);
  });
});

// ─── MongoDB Connection ────────────────────────────────────────────────────

let db = null;

async function connectDB() {
  if (db) return db;
  await mongoose.connect(process.env.MONGODB_URI);
  db = mongoose.connection;
  console.log('[db] Connected to MongoDB');
  return db;
}

// ─── Mongoose Models (inline, no Next.js import) ──────────────────────────

const AssignmentSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  title:        { type: String },
  description:  { type: String, default: '' },
  deadline:     { type: Date },
  status:       { type: String, default: 'pending' },
  remindMe:     { type: Boolean, default: false },
  reminderNotified: { type: Boolean, default: false },
  overdueNotified: { type: Boolean, default: false },
}, { timestamps: true });

const SubjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:   { type: String },
  code:   { type: String, default: '' },
}, { timestamps: true });

// Prevent model re-registration on hot reload
const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
const Subject    = mongoose.models.Subject    || mongoose.model('Subject', SubjectSchema);
const NotificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key:       { type: String, required: true },
  type:      { type: String, required: true },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  dismissed: { type: Boolean, default: false },
}, { timestamps: true });
NotificationSchema.index({ userId: 1, key: 1 }, { unique: true });
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

async function createNotification({ userId, key, type, title, message }) {
  await Notification.updateOne(
    { userId, key },
    { $setOnInsert: { userId, key, type, title, message } },
    { upsert: true }
  );
}

// Runs every minute and stores each alert once; no external delivery is attempted.
cron.schedule('* * * * *', async () => {
  try {
    await connectDB();

    const now = new Date();
    const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const assignments = await Assignment.find({
      status: 'pending',
      deadline: { $lte: cutoff },
      $or: [{ deadline: { $gte: now } }, { overdueNotified: { $ne: true } }],
    }).populate('subjectId', 'name');

    for (const assignment of assignments) {
      const deadlineKey = assignment.deadline.getTime();
      const subjectName = assignment.subjectId?.name || 'Unknown subject';

      if (assignment.deadline <= now) {
        await createNotification({
          userId: assignment.userId,
          key: `overdue:${assignment._id}:${deadlineKey}`,
          type: 'overdue',
          title: 'Assignment overdue',
          message: `"${assignment.title}" for ${subjectName} is overdue.`,
        });
        if (!assignment.overdueNotified) {
          assignment.overdueNotified = true;
          await assignment.save();
        }
        continue;
      }

      const isReminder = assignment.remindMe;
      await createNotification({
        userId: assignment.userId,
        key: `${isReminder ? 'reminder' : 'deadline'}:${assignment._id}:${deadlineKey}`,
        type: isReminder ? 'reminder' : 'deadline',
        title: isReminder ? 'Upcoming assignment reminder' : 'Assignment deadline approaching',
        message: `"${assignment.title}" for ${subjectName} is due ${assignment.deadline.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      });

      if (isReminder && !assignment.reminderNotified) {
        assignment.reminderNotified = true;
        await assignment.save();
      }
    }
  } catch (err) {
    console.error('[cron] Error creating assignment notifications:', err.message);
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────

const PORT = process.env.SOCKET_PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] Socket.IO + cron server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('[server] Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
