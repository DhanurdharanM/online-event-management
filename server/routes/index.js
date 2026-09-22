import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as ev from '../controllers/eventController.js';
import * as orders from '../controllers/orderController.js';
import * as misc from '../controllers/miscControllers.js';
import * as admin from '../controllers/adminController.js';
import { httpError } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const org = [protect, authorize('organizer', 'admin')];
const adminOnly = [protect, authorize('admin')];

/* auth */
export const authRouter = express.Router();
authRouter.post('/register', auth.register);
authRouter.post('/login', auth.login);
authRouter.get('/me', protect, auth.me);
authRouter.put('/me', protect, auth.updateMe);
authRouter.put('/me/password', protect, auth.changePassword);

/* events (order matters: static paths before /:id) */
export const eventRouter = express.Router();
eventRouter.get('/', ev.listEvents);
eventRouter.get('/mine', ...org, ev.listMine);
eventRouter.get('/mine/analytics', ...org, ev.organizerAnalytics);
eventRouter.post('/', ...org, ev.createEvent);
eventRouter.get('/:id', optionalAuth, ev.getEvent);
eventRouter.put('/:id', ...org, ev.updateEvent);
eventRouter.delete('/:id', ...org, ev.deleteEvent);
eventRouter.put('/:id/cancel', ...org, ev.cancelEvent);
eventRouter.put('/:id/schedule', ...org, ev.updateSchedule);
eventRouter.post('/:id/announce', ...org, ev.announce);
eventRouter.get('/:id/analytics', ...org, ev.eventAnalytics);
eventRouter.get('/:id/attendees', ...org, ev.listAttendees);
eventRouter.get('/:id/attendees/export', ...org, ev.exportAttendees);
eventRouter.post('/:id/checkin', ...org, ev.checkIn);
eventRouter.get('/:id/feedback', misc.getFeedback);
eventRouter.post('/:id/feedback', protect, misc.addFeedback);

/* orders / registrations */
export const orderRouter = express.Router();
orderRouter.post('/checkout', protect, orders.checkout);
orderRouter.post('/confirm', protect, orders.confirmPayment);
orderRouter.get('/mine', protect, orders.myOrders);
orderRouter.get('/:id', protect, orders.getOrder);
orderRouter.post('/:id/mock-pay', protect, orders.mockPay);
orderRouter.post('/:id/cancel', protect, orders.cancelOrder);
orderRouter.post('/:id/transfer', protect, orders.transferTicket);

/* support */
export const supportRouter = express.Router();
supportRouter.post('/', protect, misc.createInquiry);
supportRouter.get('/mine', protect, misc.myInquiries);
supportRouter.get('/all', ...adminOnly, misc.allInquiries);
supportRouter.post('/:id/reply', protect, misc.replyInquiry);
supportRouter.put('/:id/status', ...adminOnly, misc.setInquiryStatus);

/* admin */
export const adminRouter = express.Router();
adminRouter.use(...adminOnly);
adminRouter.get('/stats', admin.stats);
adminRouter.get('/users', admin.listUsers);
adminRouter.put('/users/:id', admin.updateUser);
adminRouter.get('/events', admin.listAllEvents);
adminRouter.put('/events/:id/review', admin.reviewEvent);
adminRouter.get('/transactions', admin.transactions);
adminRouter.post('/orders/:id/refund', admin.refundOrder);
adminRouter.get('/reports', admin.reports);

/* image upload (local disk; swap for Cloudinary/S3 in production - see README) */
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(httpError(400, 'Only PNG, JPG, WEBP or GIF images are allowed'))),
});
export const uploadRouter = express.Router();
uploadRouter.post('/', ...org, upload.single('image'), (req, res, next) => {
  if (!req.file) return next(httpError(400, 'No image uploaded'));
  res.status(201).json({ url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
});
