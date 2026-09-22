import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler, httpError } from '../utils/http.js';

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, bio: u.bio, avatar: u.avatar });
const reply = (res, user, status = 200) => res.status(status).json({ token: sign(user._id), user: publicUser(user) });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const role = req.body.role === 'organizer' ? 'organizer' : 'user'; // admins can only be created via seed / admin panel
  if (await User.findOne({ email: String(email).toLowerCase() })) throw httpError(400, 'An account with this email already exists');
  const user = await User.create({ name, email, password, phone, role });
  reply(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) throw httpError(401, 'Incorrect email or password');
  if (!user.isActive) throw httpError(403, 'This account has been deactivated. Contact support.');
  reply(res, user);
});

export const me = (req, res) => res.json({ user: publicUser(req.user) });

export const updateMe = asyncHandler(async (req, res) => {
  ['name', 'phone', 'bio', 'avatar'].forEach((k) => { if (req.body[k] !== undefined) req.user[k] = req.body[k]; });
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) throw httpError(400, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
