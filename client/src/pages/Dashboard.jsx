import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarClock, Ticket, History, Send, XCircle, QrCode } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime, money, placeText, fmtDate } from '../lib/format';
import { Loader, Empty, Badge, StatCard, Tabs, Modal, Field } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [orders, setOrders] = useState(null);

  const load = useCallback(() => api.get('/orders/mine').then((r) => setOrders(r.data.orders)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl">Hello, {user.name.split(' ')[0]}</h1>
      <p className="mb-6 text-harbor-500">Your upcoming events, tickets and account settings.</p>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'tickets', label: 'Tickets & registrations' }, { id: 'profile', label: 'Profile & settings' }]} />
      <div className="pt-6">
        {tab === 'profile' ? <Profile /> : !orders ? <Loader /> : tab === 'overview' ? <Overview orders={orders} go={setTab} /> : <Tickets orders={orders} reload={load} />}
      </div>
    </div>
  );
}

const upcoming = (o) => o.status === 'paid' && new Date(o.event?.startDate) > new Date();

function Overview({ orders, go }) {
  const up = orders.filter(upcoming).sort((a, b) => new Date(a.event.startDate) - new Date(b.event.startDate));
  const past = orders.filter((o) => o.status === 'paid' && !upcoming(o));
  const ticketCount = up.reduce((s, o) => s + o.tickets.length, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Upcoming events" value={up.length} />
        <StatCard icon={Ticket} label="Tickets in hand" value={ticketCount} />
        <StatCard icon={History} label="Events attended" value={past.length} />
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl">Next up</h2><button onClick={() => go('tickets')} className="text-sm font-semibold text-brand">Manage tickets</button></div>
        {up.length === 0 ? <Empty title="Nothing booked yet">Find something on the <Link to="/events" className="font-semibold text-brand">events page</Link> and it will show up here.</Empty> : (
          <ul className="space-y-3">{up.map((o) => (
            <li key={o._id} className="panel flex flex-wrap items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-marigold text-center leading-tight"><span><b className="font-display text-xl">{new Date(o.event.startDate).getDate()}</b><br /><span className="text-xs font-semibold">{new Date(o.event.startDate).toLocaleString(undefined, { month: 'short' })}</span></span></div>
              <div className="min-w-0 flex-1"><Link to={`/events/${o.event._id}`} className="font-display text-lg font-extrabold hover:underline">{o.event.title}</Link><p className="text-sm text-harbor-500">{fmtDateTime(o.event.startDate)} - {placeText(o.event)}</p></div>
              <span className="badge bg-brand-light text-brand-dark">{o.tickets.length} ticket{o.tickets.length > 1 ? 's' : ''}</span>
            </li>
          ))}</ul>
        )}
      </div>
      {past.length > 0 && (
        <div><h2 className="mb-3 text-xl">Past events</h2>
          <ul className="space-y-2">{past.map((o) => <li key={o._id} className="panel flex items-center justify-between gap-3 py-3"><span><b>{o.event.title}</b> <span className="text-sm text-harbor-500">{fmtDate(o.event.startDate)}</span></span><Link to={`/events/${o.event._id}`} className="text-sm font-semibold text-brand">Leave feedback</Link></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Tickets({ orders, reload }) {
  const [transfer, setTransfer] = useState(null);
  const [qr, setQr] = useState(null);
  if (!orders.length) return <Empty title="No registrations yet">When you book an event, your tickets and QR codes appear here.</Empty>;

  const cancel = async (o) => {
    if (!window.confirm(`Cancel ${o.tickets.length} ticket(s) for "${o.event.title}"? ${o.totalAmount > 0 ? 'You will be refunded to your original payment method.' : ''}`)) return;
    try { await api.post(`/orders/${o._id}/cancel`); toast.success('Booking cancelled'); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-5">
      {orders.map((o) => {
        const canManage = o.isOwner && o.status === 'paid' && new Date(o.event.startDate) > new Date();
        return (
          <article key={o._id} className="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={`/events/${o.event._id}`} className="font-display text-xl font-extrabold hover:underline">{o.event.title}</Link>
                <p className="text-sm text-harbor-500">{fmtDateTime(o.event.startDate)} - {placeText(o.event)}</p>
                {o.isOwner ? <p className="mt-1 text-sm">{o.tickets.length} x {o.ticketTypeName} - <b>{money(o.totalAmount)}</b>{o.paymentMethod && o.paymentMethod !== 'free' ? ` paid by ${o.paymentMethod.replace('_', ' ')}` : ''}</p> : <p className="mt-1 text-sm text-harbor-500">Transferred to you</p>}
              </div>
              <div className="flex items-center gap-2"><Badge status={o.status} />{canManage && <button className="btn-outline btn-sm !text-danger" onClick={() => cancel(o)}><XCircle className="h-4 w-4" /> Cancel booking</button>}</div>
            </div>
            {o.status === 'paid' && (
              <ul className="mt-4 divide-y divide-mist rounded-lg border border-mist">
                {o.tickets.map((t) => (
                  <li key={t.code} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1"><p className="font-semibold">{t.attendeeName}</p><p className="truncate text-xs text-harbor-500">{t.attendeeEmail}</p></div>
                    <code className="rounded bg-chalk px-2 py-1 text-xs font-bold">{t.code}</code>
                    {t.checkedIn && <span className="badge bg-brand-light text-brand-dark">Checked in</span>}
                    <button className="btn-outline btn-sm" onClick={() => setQr(t)}><QrCode className="h-4 w-4" /> QR</button>
                    {canManage && !t.checkedIn && <button className="btn-outline btn-sm" onClick={() => setTransfer({ order: o, ticket: t })}><Send className="h-4 w-4" /> Transfer</button>}
                  </li>
                ))}
              </ul>
            )}
            {o.status === 'cancelled' && <p className="mt-3 text-sm text-harbor-500">Cancelled {fmtDate(o.cancelledAt)}.{o.refundAmount > 0 && ` ${money(o.refundAmount)} refunded.`}</p>}
          </article>
        );
      })}
      <Modal open={!!qr} onClose={() => setQr(null)} title="Entry ticket">
        {qr && <div className="text-center"><div className="mx-auto inline-block rounded-xl border border-mist p-4"><QRCodeSVG value={qr.code} size={200} /></div><p className="mt-3 font-bold">{qr.attendeeName}</p><code className="text-sm">{qr.code}</code><p className="mt-2 text-xs text-harbor-500">Show this at the entrance. It stops working if the ticket is transferred.</p></div>}
      </Modal>
      {transfer && <TransferModal {...transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); reload(); }} />}
    </div>
  );
}

function TransferModal({ order, ticket, onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post(`/orders/${order._id}/transfer`, { code: ticket.code, ...f }); toast.success('Ticket transferred. A new code was emailed to them.'); onDone(); }
    catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Transfer ticket">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-harbor-500">Currently held by <b>{ticket.attendeeName}</b>. Once transferred, the old code and QR stop working and the new holder gets a fresh ticket by email.</p>
        <Field label="New attendee name"><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="New attendee email" hint="If they have an account, the ticket also appears in their dashboard."><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Transferring...' : 'Transfer ticket'}</button>
      </form>
    </Modal>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '', bio: user.bio || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const saveProfile = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put('/auth/me', p); setUser(data.user); toast.success('Profile saved'); } catch (err) { toast.error(errMsg(err)); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api.put('/auth/me/password', pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password updated'); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={saveProfile} className="panel space-y-4">
        <h2 className="text-xl">Profile</h2>
        <Field label="Email"><input className="input bg-chalk" value={user.email} disabled /></Field>
        <Field label="Full name"><input required className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <Field label="About you"><textarea rows={3} maxLength={300} className="input" value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></Field>
        <button className="btn-primary">Save changes</button>
      </form>
      <form onSubmit={savePw} className="panel h-fit space-y-4">
        <h2 className="text-xl">Change password</h2>
        <Field label="Current password"><input required type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters"><input required minLength={8} type="password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></Field>
        <button className="btn-primary">Update password</button>
      </form>
    </div>
  );
}
