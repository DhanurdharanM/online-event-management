import mongoose from 'mongoose';

const { Schema } = mongoose;

const ticketSchema = new Schema({
  code: { type: String, index: true },
  attendeeName: { type: String, required: true },
  attendeeEmail: { type: String, required: true, lowercase: true },
  checkedIn: { type: Boolean, default: false },
  checkedInAt: Date,
});

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketTypeId: { type: Schema.Types.ObjectId, required: true },
    ticketTypeName: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: String,
    registrant: { name: String, email: String, phone: String },
    tickets: [ticketSchema],
    transfers: [{ ticketCode: String, fromEmail: String, toEmail: String, at: { type: Date, default: Date.now } }],
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'failed', 'expired'], default: 'pending', index: true },
    paymentProvider: { type: String, enum: ['stripe', 'mock', 'free'] },
    paymentMethod: String,
    stripeSessionId: String,
    paymentIntentId: String,
    paidAt: Date,
    cancelledAt: Date,
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
