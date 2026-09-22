import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { CURRENCY, stripe } from './config/index.js';
import { authRouter, eventRouter, orderRouter, supportRouter, adminRouter, uploadRouter } from './routes/index.js';
import { webhook } from './controllers/orderController.js';
import { releaseExpiredOrders } from './services/orderService.js';
import { notFound, errorHandler } from './middleware/error.js';

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()) }));

// Stripe needs the raw body, so this must be registered before express.json()
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), webhook);

app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: 'Too many login attempts, try again later' } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/config', (req, res) => res.json({ currency: CURRENCY, paymentMode: stripe ? 'stripe' : 'mock' }));
app.use('/api/auth', authRouter);
app.use('/api/events', eventRouter);
app.use('/api/orders', orderRouter);
app.use('/api/support', supportRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);

app.use(notFound);
app.use(errorHandler);

await connectDB();

// Using the temporary in-memory database? Auto-seed demo data on every startup,
// since each restart creates a brand new empty database.
if (process.env.MONGO_URI === 'memory') {
  const { default: runSeed } = await import('./seed.js');
  await runSeed();
}

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on port ${port} (payments: ${stripe ? 'Stripe' : 'demo gateway'})`));
setInterval(() => releaseExpiredOrders().catch((e) => console.error(e)), 5 * 60 * 1000);