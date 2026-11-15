import mongoose from 'mongoose';

const EmailDeliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dedupeKey: { type: String, required: true },
    recipient: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'failed'],
      required: true,
      default: 'pending',
    },
    emailId: { type: String },
  },
  { timestamps: true }
);

EmailDeliverySchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });

export default mongoose.models.EmailDelivery || mongoose.model('EmailDelivery', EmailDeliverySchema);
