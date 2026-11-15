import mongoose from 'mongoose';

const EmailSendQuotaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    windowStartedAt: { type: Date, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { timestamps: false }
);

EmailSendQuotaSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.EmailSendQuota
  || mongoose.model('EmailSendQuota', EmailSendQuotaSchema);
