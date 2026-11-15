import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      maxlength: [20, 'Subject code cannot exceed 20 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

// A user cannot have two subjects with the same name
SubjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
