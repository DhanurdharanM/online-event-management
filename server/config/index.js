import Stripe from 'stripe';

export const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
export const CURRENCY = (process.env.CURRENCY || 'usd').toLowerCase();
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
export const PENDING_MINUTES = 30; // how long unpaid orders hold inventory
