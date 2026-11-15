import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ['deadline', 'reminder', 'overdue', 'attendance'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
