import Feedback from '../models/Feedback.js';
import Event from '../models/Event.js';
import Order from '../models/Order.js';
import Support from '../models/Support.js';
import { asyncHandler, httpError } from '../utils/http.js';
import { sendMail, wrap } from '../utils/email.js';

/* ------------------------------ feedback ------------------------------ */
export const getFeedback = asyncHandler(async (req, res) => {
  const items = await Feedback.find({ event: req.params.id }).populate('user', 'name').sort('-createdAt').limit(50);
  res.json({ feedback: items });
});

export const addFeedback = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw httpError(404, 'Event not found');
  if (event.startDate > new Date()) throw httpError(400, 'You can leave feedback once the event has started');
  const attended = await Order.exists({
    event: event._id,
    status: 'paid',
    $or: [{ user: req.user._id }, { 'tickets.attendeeEmail': req.user.email }],
  });
  if (!attended) throw httpError(403, 'Only registered attendees can leave feedback');
  const fb = await Feedback.findOneAndUpdate(
    { user: req.user._id, event: event._id },
    { rating: req.body.rating, comment: req.body.comment },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ feedback: fb });
});

/* ------------------------------ support ------------------------------ */
export const createInquiry = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  const ticket = await Support.create({ user: req.user._id, subject, message });
  res.status(201).json({ inquiry: ticket });
});

export const myInquiries = asyncHandler(async (req, res) => {
  res.json({ inquiries: await Support.find({ user: req.user._id }).sort('-updatedAt') });
});

export const allInquiries = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json({ inquiries: await Support.find(filter).populate('user', 'name email').sort('-updatedAt').limit(200) });
});

export const replyInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Support.findById(req.params.id).populate('user', 'name email');
  if (!inquiry) throw httpError(404, 'Inquiry not found');
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(inquiry.user._id) !== String(req.user._id)) throw httpError(403, 'Not your inquiry');
  if (!req.body.message?.trim()) throw httpError(400, 'Write a reply first');
  inquiry.replies.push({ author: req.user._id, authorName: req.user.name, authorRole: req.user.role, message: req.body.message.trim() });
  if (isAdmin && inquiry.status === 'open') inquiry.status = 'in_progress';
  if (!isAdmin && inquiry.status === 'resolved') inquiry.status = 'open';
  await inquiry.save();
  if (isAdmin) {
    sendMail({ to: inquiry.user.email, subject: `Re: ${inquiry.subject}`, html: wrap('Support replied to your inquiry', `<p>${req.body.message.trim()}</p><p>Reply from your Support page.</p>`) });
  }
  res.json({ inquiry });
});

export const setInquiryStatus = asyncHandler(async (req, res) => {
  const inquiry = await Support.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }).populate('user', 'name email');
  if (!inquiry) throw httpError(404, 'Inquiry not found');
  res.json({ inquiry });
});
