import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    rating: { type: Number, required: [true, 'Please choose a rating'], min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);
feedbackSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Feedback', feedbackSchema);
