import mongoose from 'mongoose';

const { Schema } = mongoose;
export const CATEGORIES = [
  'Music', 'Technology', 'Business', 'Arts & Culture', 'Food & Drink',
  'Sports & Fitness', 'Education', 'Health & Wellness', 'Community', 'Other',
];
const opts = { toJSON: { virtuals: true }, toObject: { virtuals: true } };

const ticketTypeSchema = new Schema(
  {
    name: { type: String, required: [true, 'Ticket name is required'], trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    sold: { type: Number, default: 0, min: 0 },
  },
  opts
);
ticketTypeSchema.virtual('available').get(function () {
  return Math.max(0, this.quantity - this.sold);
});

const sessionSchema = new Schema(
  {
    title: { type: String, required: [true, 'Session title is required'], trim: true },
    description: String,
    speaker: String,
    speakerRole: String,
    room: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
  },
  opts
);

const eventSchema = new Schema(
  {
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, required: [true, 'Description is required'], minlength: [20, 'Description should be at least 20 characters'] },
    category: { type: String, enum: CATEGORIES, required: true },
    startDate: { type: Date, required: [true, 'Start date & time is required'] },
    endDate: {
      type: Date,
      required: [true, 'End date & time is required'],
      validate: { validator(v) { return !this.startDate || v >= this.startDate; }, message: 'End must be after the start' },
    },
    venue: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    isOnline: { type: Boolean, default: false },
    images: [String],
    videoUrl: String,
    ticketTypes: {
      type: [ticketTypeSchema],
      validate: { validator: (v) => v.length > 0, message: 'Add at least one ticket type' },
    },
    schedule: [sessionSchema],
    announcements: [{ message: String, createdAt: { type: Date, default: Date.now } }],
    minPrice: Number,
    maxPrice: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    rejectionReason: String,
  },
  { timestamps: true, ...opts }
);

eventSchema.pre('save', function () {
  const prices = this.ticketTypes.map((t) => t.price);
  this.minPrice = Math.min(...prices);
  this.maxPrice = Math.max(...prices);
});
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.virtual('capacity').get(function () {
  return (this.ticketTypes || []).reduce((s, t) => s + t.quantity, 0);
});
eventSchema.virtual('ticketsSold').get(function () {
  return (this.ticketTypes || []).reduce((s, t) => s + t.sold, 0);
});

export default mongoose.model('Event', eventSchema);
