import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, Smartphone, Wallet, XCircle, FlaskConical } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import { money, fmtDateTime } from '../lib/format';
import { Loader, Field } from '../components/ui';

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api.post('/orders/confirm', { orderId: params.get('order'), sessionId: params.get('session_id') })
      .then((r) => setState({ order: r.data.order }))
      .catch((e) => setState({ error: errMsg(e) }));
  }, [params]);

  if (state.loading) return <Loader label="Confirming your payment" />;
  if (state.error) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center"><XCircle className="mx-auto h-12 w-12 text-danger" /><h1 className="mt-3 text-3xl">We couldn't confirm the payment</h1><p className="mt-2 text-harbor-500">{state.error}</p><p className="mt-1 text-sm text-harbor-500">If money left your account it will be confirmed automatically within a few minutes. Otherwise contact support.</p><div className="mt-6 flex justify-center gap-3"><Link to="/dashboard" className="btn-primary">My tickets</Link><Link to="/support" className="btn-outline">Contact support</Link></div></div>
  );
  const o = state.order;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-brand" />
      <h1 className="mt-3 text-4xl">You're in!</h1>
      <p className="mt-2 text-harbor-500">A confirmation with your ticket codes was sent to <b>{o.registrant?.email}</b>.</p>
      <div className="panel mt-6 text-left"><p className="font-semibold">{o.quantity} x {o.ticketTypeName}</p><p className="text-sm text-harbor-500">Total {money(o.totalAmount)}</p>
        <ul className="mt-3 space-y-1">{o.tickets.map((t) => <li key={t.code} className="flex justify-between text-sm"><span>{t.attendeeName}</span><code className="font-bold">{t.code}</code></li>)}</ul></div>
      <Link to="/dashboard" className="btn-primary mt-6">Go to my tickets</Link>
    </div>
  );
}

export function PaymentCancelled() {
  const [params] = useSearchParams();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <XCircle className="mx-auto h-12 w-12 text-harbor-300" />
      <h1 className="mt-3 text-3xl">Payment cancelled</h1>
      <p className="mt-2 text-harbor-500">You have not been charged. Your seats are held for 30 minutes; after that they go back on sale.</p>
      <Link to="/events" className="btn-primary mt-6">Back to events</Link>
      {params.get('order') && <p className="mt-3 text-xs text-harbor-500">Order reference {params.get('order')}</p>}
    </div>
  );
}

/** Demo gateway used when the server has no Stripe key configured. Nothing here is stored or charged. */
export function MockPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState('card');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/orders/${orderId}`).then((r) => setOrder(r.data.order)).catch((e) => toast.error(errMsg(e))); }, [orderId]);
  if (!order) return <Loader />;

  const pay = async (e) => {
    e.preventDefault(); setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    try { await api.post(`/orders/${orderId}/mock-pay`, { method }); navigate(`/payment/success?order=${orderId}`); }
    catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  const methods = [['card', 'Credit / debit card', CreditCard], ['digital_wallet', 'Digital wallet', Wallet], ['upi', 'UPI', Smartphone]];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 md:grid-cols-[1fr_320px]">
      <form onSubmit={pay} className="panel space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-marigold-light p-3 text-sm"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0" /> Demo payment page. Nothing is charged or stored. Set <code>STRIPE_SECRET_KEY</code> on the server to switch to real Stripe Checkout.</div>
        <h1 className="text-2xl">Payment</h1>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
          {methods.map(([v, l, Icon]) => (
            <button type="button" key={v} role="radio" aria-checked={method === v} onClick={() => setMethod(v)} className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm font-semibold ${method === v ? 'border-brand bg-brand-light' : 'border-mist hover:border-harbor/40'}`}><Icon className="h-5 w-5" />{l}</button>
          ))}
        </div>
        {method === 'card' && (
          <div className="space-y-3">
            <Field label="Name on card"><input required className="input" autoComplete="cc-name" /></Field>
            <Field label="Card number"><input required inputMode="numeric" className="input" placeholder="4242 4242 4242 4242" autoComplete="cc-number" /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Expiry"><input required className="input" placeholder="MM / YY" autoComplete="cc-exp" /></Field><Field label="CVC"><input required className="input" placeholder="123" autoComplete="cc-csc" /></Field></div>
          </div>
        )}
        {method === 'digital_wallet' && <p className="rounded-lg border border-mist p-4 text-sm text-harbor-700">Apple Pay, Google Pay and Link are offered automatically on the real Stripe page. In demo mode, continue to simulate a wallet payment.</p>}
        {method === 'upi' && <Field label="UPI ID"><input required className="input" placeholder="name@bank" /></Field>}
        <button className="btn-accent w-full py-3" disabled={busy}>{busy ? 'Processing...' : `Pay ${money(order.totalAmount)}`}</button>
      </form>
      <aside className="panel h-fit"><h2 className="text-lg">Order summary</h2><p className="mt-2 font-semibold">{order.event?.title}</p><p className="text-sm text-harbor-500">{order.event && fmtDateTime(order.event.startDate)}</p><div className="perforation my-3" /><div className="flex justify-between text-sm"><span>{order.quantity} x {order.ticketTypeName}</span><span>{money(order.totalAmount)}</span></div><div className="mt-2 flex justify-between font-display text-xl font-extrabold"><span>Total</span><span>{money(order.totalAmount)}</span></div></aside>
    </div>
  );
}
