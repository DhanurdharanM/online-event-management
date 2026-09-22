import Event from '../models/Event.js';
import Order from '../models/Order.js';
import { stripe, CLIENT_URL, CURRENCY } from '../config/index.js';
import { asyncHandler, httpError } from '../utils/http.js';
import { sendMail, wrap } from '../utils/email.js';
import { makeCode, reserveTickets, releaseTickets, finalizeOrder, cancelPaidOrder } from '../services/orderService.js';

const MAX_PER_ORDER = 10;
const isEmail = (s) => /^\S+@\S+\.\S+$/.test(String(s || ''));

/** POST /orders/checkout - create a registration + start payment */
export const checkout = asyncHandler(async (req, res) => {
  const { eventId, ticketTypeId, registrant = {}, attendees = [] } = req.body;
  const qty = parseInt(req.body.quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_PER_ORDER) throw httpError(400, `Choose between 1 and ${MAX_PER_ORDER} tickets`);
  if (!registrant.name?.trim() || !isEmail(registrant.email)) throw httpError(400, 'Name and a valid email are required');

  const event = await Event.findById(eventId);
  if (!event || event.status !== 'approved') throw httpError(404, 'Event not available');
  if (event.endDate < new Date()) throw httpError(400, 'This event has already ended');
  const tt = event.ticketTypes.id(ticketTypeId);
  if (!tt) throw httpError(404, 'Ticket type not found');
  if (!(await reserveTickets(event, tt, qty))) throw httpError(409, 'Not enough tickets left for that selection');

  const total = Math.round(tt.price * qty * 100) / 100;
  const order = await Order.create({
    user: req.user._id,
    event: event._id,
    ticketTypeId: tt._id,
    ticketTypeName: tt.name,
    quantity: qty,
    unitPrice: tt.price,
    totalAmount: total,
    currency: CURRENCY,
    registrant: { name: registrant.name.trim(), email: registrant.email.toLowerCase(), phone: registrant.phone },
    tickets: Array.from({ length: qty }, (_, i) => ({
      code: makeCode(),
      attendeeName: attendees[i]?.name?.trim() || registrant.name.trim(),
      attendeeEmail: (isEmail(attendees[i]?.email) ? attendees[i].email : registrant.email).toLowerCase(),
    })),
  });

  if (total === 0) {
    const paid = await finalizeOrder(order._id, { provider: 'free', method: 'free' });
    return res.status(201).json({ orderId: paid._id, free: true });
  }
  if (!stripe) return res.status(201).json({ orderId: order._id, url: `${CLIENT_URL}/mock-payment/${order._id}`, mode: 'mock' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.registrant.email,
      line_items: [{
        quantity: qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: Math.round(tt.price * 100),
          product_data: { name: `${event.title} - ${tt.name}` },
        },
      }],
      metadata: { orderId: String(order._id) },
      success_url: `${CLIENT_URL}/payment/success?order=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payment/cancelled?order=${order._id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    order.stripeSessionId = session.id;
    await order.save();
    res.status(201).json({ orderId: order._id, url: session.url, mode: 'stripe' });
  } catch (e) {
    order.status = 'failed';
    await order.save();
    await releaseTickets(order.event, order.ticketTypeId, qty);
    throw httpError(502, `Payment provider error: ${e.message}`);
  }
});

/** POST /orders/confirm - called by the success page after Stripe redirects back */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { orderId, sessionId } = req.body;
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw httpError(404, 'Order not found');
  if (order.status === 'paid') return res.json({ order });
  if (order.status !== 'pending') throw httpError(400, `This order is ${order.status}`);
  if (!stripe) throw httpError(400, 'Use the demo payment page for this order');

  const session = await stripe.checkout.sessions.retrieve(sessionId || order.stripeSessionId, { expand: ['payment_intent.payment_method'] });
  if (session.metadata?.orderId !== String(order._id)) throw httpError(400, 'Payment does not match this order');
  if (session.payment_status !== 'paid') throw httpError(402, 'Payment has not been completed yet');
  const paid = await finalizeOrder(order._id, {
    provider: 'stripe',
    method: session.payment_intent?.payment_method?.type || 'card',
    paymentIntentId: session.payment_intent?.id,
  });
  res.json({ order: paid });
});

/** POST /orders/webhook - Stripe -> server (raw body) */
export const webhook = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.json({ received: true });
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }
  try {
    const s = evt.data.object;
    if (evt.type === 'checkout.session.completed' && s.payment_status === 'paid') {
      await finalizeOrder(s.metadata.orderId, { provider: 'stripe', method: 'card', paymentIntentId: s.payment_intent });
    }
    if (evt.type === 'checkout.session.expired') {
      const o = await Order.findOneAndUpdate({ _id: s.metadata.orderId, status: 'pending' }, { status: 'expired' });
      if (o) await releaseTickets(o.event, o.ticketTypeId, o.quantity);
    }
  } catch (e) {
    console.error('Webhook handling failed', e);
  }
  res.json({ received: true });
};

/** POST /orders/:id/mock-pay - demo gateway used only when Stripe is not configured */
export const mockPay = asyncHandler(async (req, res) => {
  if (stripe) throw httpError(400, 'Demo gateway is disabled when Stripe is configured');
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw httpError(404, 'Order not found');
  if (order.status !== 'pending') throw httpError(400, `This order is ${order.status}`);
  const method = ['card', 'digital_wallet', 'upi'].includes(req.body.method) ? req.body.method : 'card';
  const paid = await finalizeOrder(order._id, { provider: 'mock', method });
  res.json({ order: paid });
});

const shapeOrder = (o, user) => {
  const obj = o.toObject();
  obj.isOwner = String(o.user._id || o.user) === String(user._id);
  if (!obj.isOwner) {
    obj.tickets = obj.tickets.filter((t) => t.attendeeEmail === user.email);
    delete obj.registrant;
    delete obj.transfers;
  }
  return obj;
};

/** GET /orders/mine - my registrations + tickets transferred to me */
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    status: { $in: ['paid', 'cancelled'] },
    $or: [{ user: req.user._id }, { 'tickets.attendeeEmail': req.user.email }],
  })
    .populate('event', 'title startDate endDate venue city isOnline images status')
    .sort('-createdAt');
  res.json({ orders: orders.map((o) => shapeOrder(o, req.user)) });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate('event', 'title startDate venue city images');
  if (!order) throw httpError(404, 'Order not found');
  res.json({ order });
});

const loadOwnedUpcoming = async (id, userId) => {
  const order = await Order.findOne({ _id: id, user: userId }).populate('event');
  if (!order) throw httpError(404, 'Order not found');
  if (order.event.startDate <= new Date()) throw httpError(400, 'This event has already started');
  return order;
};

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedUpcoming(req.params.id, req.user._id);
  await cancelPaidOrder(order);
  res.json({ order });
});

export const transferTicket = asyncHandler(async (req, res) => {
  const { code, name, email } = req.body;
  if (!name?.trim() || !isEmail(email)) throw httpError(400, 'Enter the new attendee name and a valid email');
  const order = await loadOwnedUpcoming(req.params.id, req.user._id);
  if (order.status !== 'paid') throw httpError(400, 'Only paid tickets can be transferred');
  const ticket = order.tickets.find((t) => t.code === code);
  if (!ticket) throw httpError(404, 'Ticket not found');
  if (ticket.checkedIn) throw httpError(400, 'This ticket was already used');
  const from = ticket.attendeeEmail;
  if (from === email.toLowerCase()) throw httpError(400, 'That person already holds this ticket');

  ticket.attendeeName = name.trim();
  ticket.attendeeEmail = email.toLowerCase();
  ticket.code = makeCode(); // old QR/code stops working
  order.transfers.push({ ticketCode: ticket.code, fromEmail: from, toEmail: ticket.attendeeEmail });
  await order.save();

  sendMail({
    to: ticket.attendeeEmail,
    subject: `${req.user.name} sent you a ticket for ${order.event.title}`,
    html: wrap('A ticket was transferred to you', `<p><b>${order.event.title}</b></p><p>Your ticket code: <code>${ticket.code}</code></p><p>Log in with this email address to see it in your dashboard.</p>`),
  });
  if (from !== ticket.attendeeEmail) {
    sendMail({ to: from, subject: 'Ticket transferred', html: wrap('Ticket transferred', `<p>Your ticket for <b>${order.event.title}</b> now belongs to ${ticket.attendeeName}. The previous code is no longer valid.</p>`) });
  }
  res.json({ order });
});
