import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    remindMe: {
      type: Boolean,
      default: false,
    },
    reminderNotified: {
      type: Boolean,
      default: false,
    },
    overdueNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient reminder cron queries
AssignmentSchema.index({ userId: 1, deadline: 1 });
AssignmentSchema.index({ status: 1, deadline: 1, overdueNotified: 1 });
AssignmentSchema.index({ remindMe: 1, reminderNotified: 1, status: 1, deadline: 1 });

export default mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
