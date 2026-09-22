import crypto from 'crypto';
import Event from '../models/Event.js';
import Order from '../models/Order.js';
import { stripe, PENDING_MINUTES } from '../config/index.js';
import { sendMail, wrap } from '../utils/email.js';
import { httpError } from '../utils/http.js';

export const makeCode = () => `TKT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const dateText = (d) => new Date(d).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

/** Atomically reserve inventory. Returns false if not enough tickets are left. */
export async function reserveTickets(event, ticketType, qty) {
  const res = await Event.updateOne(
    { _id: event._id, ticketTypes: { $elemMatch: { _id: ticketType._id, sold: { $lte: ticketType.quantity - qty } } } },
    { $inc: { 'ticketTypes.$[t].sold': qty } },
    { arrayFilters: [{ 't._id': ticketType._id }] }
  );
  return res.modifiedCount === 1;
}

export const releaseTickets = (eventId, ticketTypeId, qty) =>
  Event.updateOne({ _id: eventId }, { $inc: { 'ticketTypes.$[t].sold': -qty } }, { arrayFilters: [{ 't._id': ticketTypeId }] });

/** Mark an order paid (idempotent) and send the confirmation email. */
export async function finalizeOrder(orderId, { provider, method, paymentIntentId }) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'paid', paidAt: new Date(), paymentProvider: provider, paymentMethod: method, paymentIntentId } },
    { new: true }
  );
  if (!order) return Order.findById(orderId); // already processed
  const event = await Event.findById(order.event);
  sendMail({
    to: order.registrant.email,
    subject: `Your tickets for ${event.title}`,
    html: wrap(
      'You are registered!',
      `<p>Hi ${order.registrant.name}, your booking is confirmed.</p>
       <p><b>${event.title}</b><br/>${dateText(event.startDate)}<br/>${event.isOnline ? 'Online event' : [event.venue, event.city].filter(Boolean).join(', ')}</p>
       <p>${order.quantity} x ${order.ticketTypeName} - total ${order.totalAmount.toFixed(2)} ${(order.currency || '').toUpperCase()}</p>
       <p><b>Ticket codes</b></p>
       <ul>${order.tickets.map((t) => `<li><code>${t.code}</code> - ${t.attendeeName}</li>`).join('')}</ul>
       <p>Show the code (or QR from your dashboard) at the entrance. You can cancel or transfer tickets from your dashboard until the event starts.</p>`
    ),
  });
  return order;
}

/** Cancel a paid order, refund it and put the tickets back on sale. */
export async function cancelPaidOrder(order, reason = 'Cancelled by attendee') {
  if (order.status !== 'paid') throw httpError(400, 'Only paid orders can be cancelled');
  if (order.tickets.some((t) => t.checkedIn)) throw httpError(400, 'Checked-in tickets cannot be cancelled');
  if (order.paymentProvider === 'stripe' && stripe && order.paymentIntentId) {
    await stripe.refunds.create({ payment_intent: order.paymentIntentId });
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.refundAmount = order.totalAmount;
  await order.save();
  const eventId = order.event._id || order.event;
  await releaseTickets(eventId, order.ticketTypeId, order.quantity);
  const event = await Event.findById(eventId);
  sendMail({
    to: order.registrant.email,
    subject: `Booking cancelled: ${event?.title}`,
    html: wrap(
      'Booking cancelled',
      `<p>${reason}. Your order for <b>${event?.title}</b> (${order.quantity} x ${order.ticketTypeName}) was cancelled.</p>
       ${order.totalAmount > 0 ? `<p>A refund of ${order.totalAmount.toFixed(2)} ${(order.currency || '').toUpperCase()} has been issued to your original payment method (allow 5-10 business days).</p>` : ''}`
    ),
  });
  return order;
}

/** Free unpaid orders' inventory after the hold period. Run on an interval. */
export async function releaseExpiredOrders() {
  const cutoff = new Date(Date.now() - PENDING_MINUTES * 60 * 1000);
  const stale = await Order.find({ status: 'pending', createdAt: { $lt: cutoff } });
  for (const o of stale) {
    const flipped = await Order.findOneAndUpdate({ _id: o._id, status: 'pending' }, { status: 'expired' });
    if (!flipped) continue;
    await releaseTickets(o.event, o.ticketTypeId, o.quantity);
    if (stripe && o.stripeSessionId) stripe.checkout.sessions.expire(o.stripeSessionId).catch(() => {});
  }
}
