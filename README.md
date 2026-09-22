# Convene - Online Event Management Platform

A full-stack **MERN** application for publishing events, selling tickets, registering attendees, publishing schedules and analysing performance. Styled with **TailwindCSS**; payments via **Stripe Checkout** (cards + wallets such as Google Pay / Apple Pay / Link) with a built-in demo gateway for local testing.

## Requirement coverage

| Requirement | Where it lives |
|---|---|
| **Event listings** - create/manage with title, description, date, time, location, pricing | `EventForm.jsx`, `eventController.js` (create / update / delete / cancel) |
| Search & filter by date, location, category, price range (+ sort, online-only, pagination) | `Events.jsx`, `listEvents` |
| Images, video, detailed descriptions | Gallery + upload or URL, YouTube/Vimeo/MP4 embed, multi-line description (`EventDetail.jsx`) |
| **Ticket sales** - ticket types (GA, VIP...), prices, quantities | `ticketTypes[]` on the Event model; atomic inventory reservation prevents overselling |
| Secure payment gateway, multiple methods | Stripe Checkout (cards, wallets, other methods enabled in your Stripe dashboard); webhook + return-URL confirmation; demo gateway when no key is set |
| Streamlined purchase + email confirmation | Registration modal -> payment -> confirmation email with ticket codes (`orderService.finalizeOrder`) |
| **Attendee registration** - form with personal + payment info | Registration modal (name, email, phone, guests); card details entered on the payment page so they never touch this server |
| View / manage registrations, **cancel** (with refund) or **transfer** tickets | `Dashboard.jsx`, `orderController.js` (cancel, transfer, QR codes) |
| Organizer tools to manage & **export attendee lists** | `ManageEvent.jsx` -> Attendees (search, check-in, CSV export) |
| **Event schedules** - calendar/schedule view with times, sessions, speakers | `ScheduleView.jsx` (day tabs + timeline), `ScheduleEditor.jsx` |
| Update schedules and **notify attendees** of changes | Manage -> Schedule (email to all paid attendees + banner on event page); Manage -> Announcements |
| **Event analytics** - ticket sales, attendance rate, revenue | Manage -> Analytics, organizer dashboard (`MyEvents.jsx`) |
| Charts and graphs | Recharts line / bar / pie / area charts |
| **User features** - secure register/login, profile & settings | JWT + bcrypt (12 rounds), rate-limited login, `Dashboard.jsx` -> Profile & settings, change password |
| User dashboard (upcoming events, purchased tickets, registrations) | `Dashboard.jsx` |
| **Admin features** - dashboard for events, users, ticket sales | `/admin` (`Admin.jsx`) |
| Approve/reject listings, monitor payments, handle support inquiries | Admin -> Event listings / Payments (with refunds) / Support inquiries (threaded replies + status) |
| Reports on performance, revenue, attendee feedback | Admin -> Reports + attendee ratings/comments (feedback form on event pages) |
| MERN + Tailwind + payment gateway | MongoDB/Mongoose, Express, React (Vite), Node; Tailwind 3; Stripe |

## Project structure

```
convene/
  server/   Express API (controllers, models, routes, services, middleware, seed.js)
  client/   React + Vite + Tailwind front end
  render.yaml   optional Render blueprint for the API
```

## Run locally

Requirements: Node 18+, a MongoDB database (local or Atlas).

```bash
# 1. API
cd server
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run seed                # optional demo data + demo accounts
npm run dev                 # http://localhost:5000

# 2. Front end (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@convene.test | Admin@1234 |
| Organizer | organizer@convene.test | Organizer@1234 |
| Attendee | user@convene.test | User@12345 |

New sign-ups can choose Attendee or Organizer. Admins are created via the seed script or by an existing admin changing a user's role.

## Payments

* **Demo gateway (default):** with `STRIPE_SECRET_KEY` empty, checkout redirects to a simulated payment page. Nothing is charged.
  **Do not leave demo mode on for a production site - anyone could "pay" without paying.**
* **Stripe:** set `STRIPE_SECRET_KEY` (test key `sk_test_...`). Checkout redirects to Stripe's hosted page, which offers cards and any wallets/methods enabled in your dashboard (Payment methods settings). Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
  * Payment is confirmed when the buyer returns to the success page **and** via webhook. For the webhook, add an endpoint `https://<api-host>/api/orders/webhook` for `checkout.session.completed` and `checkout.session.expired`, then set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:5000/api/orders/webhook`.
  * Cancellations issue automatic Stripe refunds.
  * Set the same currency in `CURRENCY` (server) and `VITE_CURRENCY` (client). Zero-decimal currencies such as JPY need a small tweak to `unit_amount`.
* Unpaid orders hold tickets for 30 minutes and are then released automatically.

## Email

Set `SMTP_*` variables (any provider: Gmail app password, Brevo, Mailtrap, SendGrid SMTP...). With no SMTP configured, emails are logged to the server console so the app still works. Emails sent: booking confirmation, cancellation/refund, ticket transfer, schedule changes/announcements, listing approved/rejected, support replies.

## Deploy

1. **Database:** create a free MongoDB Atlas cluster, allow access from anywhere (or Render's IPs), copy the connection string.
2. **API on Render:** New -> Web Service -> connect your GitHub repo. Root directory `server`, build `npm install`, start `npm start` (or use `render.yaml`). Add env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Netlify URL, no trailing slash), `NODE_ENV=production`, plus Stripe / SMTP values. Optionally run `npm run seed` once from the Render shell.
3. **Front end on Netlify:** New site from Git. Base directory `client`, build command `npm run build`, publish directory `client/dist` (already in `client/netlify.toml`, which also adds the SPA redirect). Add env vars `VITE_API_URL=https://<your-render-service>.onrender.com/api` and `VITE_CURRENCY=USD`. Redeploy after changing env vars.
4. Free Render instances sleep when idle, so the first request can take ~30 s.
5. **Image uploads:** uploads are stored on the server disk, which Render wipes on redeploy. For a durable setup paste image URLs (supported) or swap the multer storage for Cloudinary/S3.

## Push to GitHub

```bash
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /login`, `GET/PUT /me`, `PUT /me/password` |
| Events | `GET /api/events` (q, category, location, dateFrom, dateTo, minPrice, maxPrice, sort, page), `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `PUT /:id/cancel`, `PUT /:id/schedule`, `POST /:id/announce`, `GET /mine`, `GET /mine/analytics`, `GET /:id/analytics`, `GET /:id/attendees`, `GET /:id/attendees/export`, `POST /:id/checkin`, `GET/POST /:id/feedback` |
| Orders | `POST /api/orders/checkout`, `POST /confirm`, `POST /webhook`, `GET /mine`, `GET /:id`, `POST /:id/cancel`, `POST /:id/transfer`, `POST /:id/mock-pay` |
| Support | `POST /api/support`, `GET /mine`, `GET /all` (admin), `POST /:id/reply`, `PUT /:id/status` (admin) |
| Admin | `GET /api/admin/stats`, `/users`, `PUT /users/:id`, `/events`, `PUT /events/:id/review`, `/transactions`, `POST /orders/:id/refund`, `/reports` |
| Other | `POST /api/upload`, `GET /api/config`, `GET /api/health` |

## Security notes

Passwords hashed with bcrypt; JWT auth with role-based route guards; Helmet headers; CORS limited to `CLIENT_URL`; rate limiting (stricter on login); ownership checks on every organizer/order action; atomic inventory updates; Stripe webhook signature verification; card data is never handled by this server.

## License

MIT
