import Event from '../models/Event.js';
import Order from '../models/Order.js';
import Feedback from '../models/Feedback.js';
import { asyncHandler, httpError, escapeRegex, pick } from '../utils/http.js';
import { sendBulk, wrap } from '../utils/email.js';
import { cancelPaidOrder } from '../services/orderService.js';

const FIELDS = ['title', 'description', 'category', 'startDate', 'endDate', 'venue', 'address', 'city', 'isOnline', 'images', 'videoUrl'];
const isOwnerOrAdmin = (event, user) =>
  !!user && (user.role === 'admin' || String(event.organizer._id || event.organizer) === String(user._id));

const loadOwned = async (req) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw httpError(404, 'Event not found');
  if (!isOwnerOrAdmin(event, req.user)) throw httpError(403, 'You can only manage your own events');
  return event;
};

const paidAudience = async (eventId) => {
  const orders = await Order.find({ event: eventId, status: 'paid' });
  const emails = new Set();
  orders.forEach((o) => {
    emails.add(o.registrant.email);
    o.tickets.forEach((t) => emails.add(t.attendeeEmail));
  });
  return [...emails];
};

const notifyAttendees = async (event, subject, message) => {
  const emails = await paidAudience(event._id);
  await sendBulk(emails.map((to) => ({ to, subject, html: wrap(event.title, `<p>${message}</p><p>See the latest schedule on the event page.</p>`) })));
  return emails.length;
};

/* ------------------------------ public ------------------------------ */
export const listEvents = asyncHandler(async (req, res) => {
  const { q, category, location, dateFrom, dateTo, minPrice, maxPrice, sort = 'date', past, online } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, parseInt(req.query.limit, 10) || 12);
  const and = [{ status: 'approved' }];

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { venue: rx }, { city: rx }] });
  }
  if (category) and.push({ category });
  if (location) {
    const rx = new RegExp(escapeRegex(location), 'i');
    and.push({ $or: [{ city: rx }, { venue: rx }, { address: rx }] });
  }
  if (online === 'true') and.push({ isOnline: true });
  if (dateFrom) and.push({ endDate: { $gte: new Date(dateFrom) } });
  else if (past !== 'true') and.push({ endDate: { $gte: new Date() } });
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    and.push({ startDate: { $lte: end } });
  }
  if (minPrice !== undefined && minPrice !== '') and.push({ maxPrice: { $gte: Number(minPrice) } });
  if (maxPrice !== undefined && maxPrice !== '') and.push({ minPrice: { $lte: Number(maxPrice) } });

  const sorts = { date: { startDate: 1 }, newest: { createdAt: -1 }, price_asc: { minPrice: 1 }, price_desc: { minPrice: -1 } };
  const filter = { $and: and };
  const [events, total] = await Promise.all([
    Event.find(filter).select('-schedule -announcements').populate('organizer', 'name').sort(sorts[sort] || sorts.date).skip((page - 1) * limit).limit(limit),
    Event.countDocuments(filter),
  ]);
  res.json({ events, page, pages: Math.ceil(total / limit) || 1, total });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name avatar bio');
  if (!event || (event.status !== 'approved' && !isOwnerOrAdmin(event, req.user))) throw httpError(404, 'Event not found');
  const [rating] = await Feedback.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  res.json({ event, rating: rating ? { avg: Math.round(rating.avg * 10) / 10, count: rating.count } : { avg: 0, count: 0 } });
});

/* ---------------------------- organizer CRUD ---------------------------- */
export const createEvent = asyncHandler(async (req, res) => {
  const data = pick(req.body, [...FIELDS, 'ticketTypes', 'schedule']);
  data.ticketTypes = (data.ticketTypes || []).map((t) => pick(t, ['name', 'description', 'price', 'quantity']));
  const event = await Event.create({ ...data, organizer: req.user._id, status: req.user.role === 'admin' ? 'approved' : 'pending' });
  res.status(201).json({ event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  if (event.status === 'cancelled') throw httpError(400, 'Cancelled events cannot be edited');
  Object.assign(event, pick(req.body, FIELDS));
  if (Array.isArray(req.body.ticketTypes)) {
    const incoming = req.body.ticketTypes;
    const incomingIds = incoming.filter((t) => t._id).map((t) => String(t._id));
    for (const tt of [...event.ticketTypes]) {
      if (!incomingIds.includes(String(tt._id))) {
        if (tt.sold > 0) throw httpError(400, `"${tt.name}" has sales and cannot be removed`);
        event.ticketTypes.pull(tt._id);
      }
    }
    for (const t of incoming) {
      const fields = pick(t, ['name', 'description', 'price', 'quantity']);
      const existing = t._id && event.ticketTypes.id(t._id);
      if (existing) {
        if (Number(fields.quantity) < existing.sold) throw httpError(400, `"${existing.name}" already has ${existing.sold} sold - quantity cannot go below that`);
        existing.set(fields);
      } else {
        event.ticketTypes.push(fields);
      }
    }
  }
  if (Array.isArray(req.body.schedule)) event.schedule = req.body.schedule;
  if (event.status === 'rejected' && req.user.role !== 'admin') {
    event.status = 'pending';
    event.rejectionReason = undefined;
  }
  await event.save();
  res.json({ event });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  if (await Order.exists({ event: event._id, status: 'paid' })) throw httpError(400, 'This event has registrations. Cancel it instead so attendees are refunded.');
  await Order.deleteMany({ event: event._id });
  await event.deleteOne();
  res.json({ message: 'Event deleted' });
});

/** Cancel the whole event: refund every paid order and email attendees. */
export const cancelEvent = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const orders = await Order.find({ event: event._id, status: 'paid' });
  let refunded = 0;
  for (const o of orders) {
    o.tickets.forEach((t) => { t.checkedIn = false; });
    try { await cancelPaidOrder(o, `The organizer cancelled "${event.title}"`); refunded += 1; } catch (e) { console.error('Refund failed', o._id, e.message); }
  }
  event.status = 'cancelled';
  await event.save();
  res.json({ event, refunded });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const { schedule = [], notify = true, message } = req.body;
  for (const s of schedule) {
    if (!s.title || !s.startTime || !s.endTime || new Date(s.endTime) < new Date(s.startTime)) throw httpError(400, 'Every session needs a title and an end time after its start time');
  }
  event.schedule = schedule;
  let notified = 0;
  if (notify) {
    const text = message?.trim() || 'The schedule for this event has been updated.';
    event.announcements.push({ message: text });
    notified = await notifyAttendees(event, `Schedule update: ${event.title}`, text);
  }
  await event.save();
  res.json({ event, notified });
});

export const announce = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const message = req.body.message?.trim();
  if (!message) throw httpError(400, 'Write a message first');
  event.announcements.push({ message });
  await event.save();
  const notified = await notifyAttendees(event, `Update: ${event.title}`, message);
  res.json({ event, notified });
});

/* ----------------------- organizer dashboards ----------------------- */
export const listMine = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { organizer: req.user._id };
  const events = await Event.find(filter).select('-schedule').sort('-createdAt');
  const revenue = await Order.aggregate([
    { $match: { event: { $in: events.map((e) => e._id) }, status: 'paid' } },
    { $group: { _id: '$event', revenue: { $sum: '$totalAmount' } } },
  ]);
  const map = Object.fromEntries(revenue.map((r) => [String(r._id), r.revenue]));
  res.json({ events: events.map((e) => ({ ...e.toJSON(), revenue: map[String(e._id)] || 0 })) });
});

export const organizerAnalytics = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id });
  const ids = events.map((e) => e._id);
  const paid = await Order.find({ event: { $in: ids }, status: 'paid' });
  const perEvent = events.map((e) => {
    const orders = paid.filter((o) => String(o.event) === String(e._id));
    return {
      id: e._id,
      title: e.title.length > 22 ? `${e.title.slice(0, 22)}...` : e.title,
      sold: orders.reduce((s, o) => s + o.quantity, 0),
      revenue: orders.reduce((s, o) => s + o.totalAmount, 0),
      checkedIn: orders.reduce((s, o) => s + o.tickets.filter((t) => t.checkedIn).length, 0),
      capacity: e.capacity,
    };
  });
  const byDay = {};
  paid.forEach((o) => {
    const d = o.paidAt.toISOString().slice(0, 10);
    byDay[d] = byDay[d] || { date: d, revenue: 0, tickets: 0 };
    byDay[d].revenue += o.totalAmount;
    byDay[d].tickets += o.quantity;
  });
  res.json({
    totals: {
      events: events.length,
      ticketsSold: perEvent.reduce((s, e) => s + e.sold, 0),
      revenue: perEvent.reduce((s, e) => s + e.revenue, 0),
      checkedIn: perEvent.reduce((s, e) => s + e.checkedIn, 0),
    },
    perEvent,
    overTime: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
  });
});

export const eventAnalytics = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const [orders, fb] = await Promise.all([
    Order.find({ event: event._id, status: { $in: ['paid', 'cancelled'] } }),
    Feedback.aggregate([{ $match: { event: event._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);
  const paid = orders.filter((o) => o.status === 'paid');
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const ticketsSold = paid.reduce((s, o) => s + o.quantity, 0);
  const revenue = paid.reduce((s, o) => s + o.totalAmount, 0);
  const checkedIn = paid.reduce((s, o) => s + o.tickets.filter((t) => t.checkedIn).length, 0);

  const byDay = {};
  paid.forEach((o) => {
    const d = o.paidAt.toISOString().slice(0, 10);
    byDay[d] = byDay[d] || { date: d, tickets: 0, revenue: 0 };
    byDay[d].tickets += o.quantity;
    byDay[d].revenue += o.totalAmount;
  });
  let cum = 0;
  const overTime = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, cumulative: (cum += d.tickets) }));

  res.json({
    summary: {
      capacity: event.capacity,
      ticketsSold,
      revenue,
      sellThrough: event.capacity ? Math.round((ticketsSold / event.capacity) * 100) : 0,
      checkedIn,
      attendanceRate: ticketsSold ? Math.round((checkedIn / ticketsSold) * 100) : 0,
      cancelledTickets: cancelled.reduce((s, o) => s + o.quantity, 0),
      refunded: cancelled.reduce((s, o) => s + o.refundAmount, 0),
      rating: fb[0] ? { avg: Math.round(fb[0].avg * 10) / 10, count: fb[0].count } : { avg: 0, count: 0 },
    },
    byType: event.ticketTypes.map((t) => {
      const mine = paid.filter((o) => String(o.ticketTypeId) === String(t._id));
      return { name: t.name, sold: mine.reduce((s, o) => s + o.quantity, 0), capacity: t.quantity, revenue: mine.reduce((s, o) => s + o.totalAmount, 0) };
    }),
    overTime,
  });
});

/* ----------------------------- attendees ----------------------------- */
const attendeeRows = async (eventId) => {
  const orders = await Order.find({ event: eventId, status: 'paid' }).sort('-paidAt');
  return orders.flatMap((o) =>
    o.tickets.map((t) => ({
      code: t.code,
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      phone: o.registrant.phone || '',
      buyerName: o.registrant.name,
      buyerEmail: o.registrant.email,
      ticketType: o.ticketTypeName,
      price: o.unitPrice,
      purchasedAt: o.paidAt,
      checkedIn: t.checkedIn,
      checkedInAt: t.checkedInAt,
      orderId: o._id,
    }))
  );
};

export const listAttendees = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  res.json({ attendees: await attendeeRows(event._id) });
});

export const exportAttendees = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const rows = await attendeeRows(event._id);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Ticket code', 'Attendee name', 'Attendee email', 'Phone', 'Buyer', 'Buyer email', 'Ticket type', 'Price', 'Purchased at', 'Checked in'];
  const lines = rows.map((r) => [r.code, r.attendeeName, r.attendeeEmail, r.phone, r.buyerName, r.buyerEmail, r.ticketType, r.price, r.purchasedAt?.toISOString(), r.checkedIn ? 'Yes' : 'No'].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendees-${event._id}.csv"`);
  res.send([head.map(esc).join(','), ...lines].join('\n'));
});

export const checkIn = asyncHandler(async (req, res) => {
  const event = await loadOwned(req);
  const code = String(req.body.code || '').trim().toUpperCase();
  const undo = req.body.undo === true;
  const order = await Order.findOne({ event: event._id, status: 'paid', 'tickets.code': code });
  if (!order) throw httpError(404, 'No valid ticket found for that code');
  const ticket = order.tickets.find((t) => t.code === code);
  if (ticket.checkedIn && !undo) throw httpError(409, `${ticket.attendeeName} is already checked in`);
  ticket.checkedIn = !undo;
  ticket.checkedInAt = undo ? undefined : new Date();
  await order.save();
  res.json({ ticket, ticketType: order.ticketTypeName });
});
