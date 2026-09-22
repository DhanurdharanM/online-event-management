import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler, httpError } from '../utils/http.js';

const userFromRequest = async (req) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(id);
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
};

export const protect = asyncHandler(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) throw httpError(401, 'Please log in to continue');
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = await userFromRequest(req);
  next();
});

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission to do that'));
