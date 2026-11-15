import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    // Stored as midnight UTC for the given date to avoid timezone drift
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      required: [true, 'Status must be present or absent'],
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for the same user + subject + date
AttendanceSchema.index({ userId: 1, subjectId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
