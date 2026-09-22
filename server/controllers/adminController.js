import User from '../models/User.js';
import Event from '../models/Event.js';
import Order from '../models/Order.js';
import Feedback from '../models/Feedback.js';
import Support from '../models/Support.js';
import { asyncHandler, httpError, escapeRegex } from '../utils/http.js';
import { sendMail, wrap } from '../utils/email.js';
import { cancelPaidOrder } from '../services/orderService.js';

export const stats = asyncHandler(async (req, res) => {
  const [users, organizers, events, pendingEvents, openSupport, totals, monthly, byCategory, top] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'organizer' }),
    Event.countDocuments({ status: 'approved' }),
    Event.countDocuments({ status: 'pending' }),
    Support.countDocuments({ status: { $ne: 'resolved' } }),
    Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, tickets: { $sum: '$quantity' }, orders: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, revenue: { $sum: '$totalAmount' }, tickets: { $sum: '$quantity' } } },
      { $sort: { _id: 1 } },
    ]),
    Event.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$event', tickets: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
      { $unwind: '$event' },
      { $project: { title: '$event.title', tickets: 1, revenue: 1 } },
    ]),
  ]);
  const t = totals[0] || { revenue: 0, tickets: 0, orders: 0 };
  res.json({
    counts: { users, organizers, events, pendingEvents, openSupport, orders: t.orders, ticketsSold: t.tickets, revenue: t.revenue },
    monthly: monthly.map((m) => ({ month: m._id, revenue: m.revenue, tickets: m.tickets })),
    byCategory: byCategory.map((c) => ({ name: c._id, value: c.count })),
    topEvents: top,
  });
});

/* -------------------------------- users -------------------------------- */
export const listUsers = asyncHandler(async (req, res) => {
  const { q, role } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = {};
  if (role) filter.role = role;
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const [users, total] = await Promise.all([User.find(filter).sort('-createdAt').skip((page - 1) * 20).limit(20), User.countDocuments(filter)]);
  res.json({ users, page, pages: Math.ceil(total / 20) || 1, total });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (String(user._id) === String(req.user._id)) throw httpError(400, 'You cannot change your own role or status');
  if (req.body.role) user.role = req.body.role;
  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
  await user.save();
  res.json({ user });
});

/* -------------------------------- events -------------------------------- */
export const listAllEvents = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const events = await Event.find(filter).select('-schedule').populate('organizer', 'name email').sort('-createdAt').limit(200);
  res.json({ events });
});

export const reviewEvent = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw httpError(400, 'Status must be approved or rejected');
  if (status === 'rejected' && !reason?.trim()) throw httpError(400, 'Please give the organizer a reason');
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');
  if (!event) throw httpError(404, 'Event not found');
  event.status = status;
  event.rejectionReason = status === 'rejected' ? reason.trim() : undefined;
  await event.save();
  sendMail({
    to: event.organizer.email,
    subject: `Your event "${event.title}" was ${status}`,
    html: wrap(`Event ${status}`, status === 'approved' ? '<p>Your event is now live and open for ticket sales.</p>' : `<p>It needs a few changes before it can go live:</p><blockquote>${reason}</blockquote><p>Edit the event and it will be re-submitted for review.</p>`),
  });
  res.json({ event });
});

/* ---------------------------- payments monitor ---------------------------- */
export const transactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = req.query.status ? { status: req.query.status } : { status: { $ne: 'expired' } };
  const [orders, total, sums] = await Promise.all([
    Order.find(filter).populate('user', 'name email').populate('event', 'title').sort('-createdAt').skip((page - 1) * 20).limit(20),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$status', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ orders, page, pages: Math.ceil(total / 20) || 1, total, byStatus: sums });
});

export const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Order not found');
  await cancelPaidOrder(order, 'Refunded by platform admin');
  res.json({ order });
});

/* -------------------------------- reports -------------------------------- */
export const reports = asyncHandler(async (req, res) => {
  const [events, sales, ratings, recent] = await Promise.all([
    Event.find({ status: { $in: ['approved', 'cancelled'] } }).select('title category startDate status ticketTypes').populate('organizer', 'name'),
    Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$event', sold: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' }, checkedIn: { $sum: { $size: { $filter: { input: '$tickets', as: 't', cond: '$$t.checkedIn' } } } } } },
    ]),
    Feedback.aggregate([{ $group: { _id: '$event', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Feedback.find().populate('user', 'name').populate('event', 'title').sort('-createdAt').limit(25),
  ]);
  const s = Object.fromEntries(sales.map((x) => [String(x._id), x]));
  const r = Object.fromEntries(ratings.map((x) => [String(x._id), x]));
  const rows = events.map((e) => {
    const sale = s[String(e._id)] || { sold: 0, revenue: 0, checkedIn: 0 };
    return {
      id: e._id,
      title: e.title,
      category: e.category,
      status: e.status,
      organizer: e.organizer?.name,
      startDate: e.startDate,
      capacity: e.capacity,
      sold: sale.sold,
      revenue: sale.revenue,
      attendanceRate: sale.sold ? Math.round((sale.checkedIn / sale.sold) * 100) : 0,
      rating: r[String(e._id)] ? Math.round(r[String(e._id)].avg * 10) / 10 : null,
      feedbackCount: r[String(e._id)]?.count || 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
  res.json({ rows, feedback: recent });
});
