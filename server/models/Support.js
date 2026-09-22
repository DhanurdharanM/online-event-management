import mongoose from 'mongoose';

const supportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 140 },
    message: { type: String, required: [true, 'Message is required'], maxlength: 3000 },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    replies: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: String,
        authorRole: String,
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Support', supportSchema);
