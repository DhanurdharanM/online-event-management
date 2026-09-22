import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin, Megaphone, Minus, Plus, ShieldCheck, User2 } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime, money, placeText, videoEmbed, fallbackImg, fmtDate } from '../lib/format';
import { Loader, Modal, Field, Stars, Empty, Badge } from '../components/ui';
import ScheduleView from '../components/ScheduleView';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [typeId, setTypeId] = useState('');
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);

  const load = () =>
    api.get(`/events/${id}`).then((r) => {
      setData(r.data);
      setTypeId((cur) => cur || r.data.event.ticketTypes.find((t) => t.available > 0)?._id || '');
    }).catch((e) => setError(errMsg(e)));
  const loadFeedback = () => api.get(`/events/${id}/feedback`).then((r) => setFeedback(r.data.feedback)).catch(() => {});
  useEffect(() => { setData(null); setError(''); setTypeId(''); setQty(1); setImgIdx(0); load(); loadFeedback(); window.scrollTo({ top: 0 }); }, [id]);

  const event = data?.event;
  const tt = event?.ticketTypes.find((t) => t._id === typeId);
  const video = useMemo(() => videoEmbed(event?.videoUrl), [event]);
  if (error) return <div className="mx-auto max-w-2xl px-4 py-16"><Empty title="We couldn't open that event">{error}</Empty></div>;
  if (!event) return <Loader />;

  const ended = new Date(event.endDate) < new Date();
  const started = new Date(event.startDate) <= new Date();
  const live = event.status === 'approved';
  const canBuy = live && !ended;
  const images = event.images?.length ? event.images : [fallbackImg(event._id)];
  const maxQty = tt ? Math.min(10, tt.available) : 1;

  const startRegistration = () => {
    if (!user) return navigate('/login', { state: { from: `/events/${id}` } });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!live && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-marigold bg-marigold-light p-4 text-sm">
          <Badge status={event.status} /> {event.status === 'pending' && 'This listing is waiting for admin approval and is only visible to you.'}
          {event.status === 'rejected' && `Rejected: ${event.rejectionReason || 'no reason given'}`}
          {event.status === 'cancelled' && 'This event was cancelled and attendees were refunded.'}
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl bg-mist">
            <img src={images[imgIdx]} alt={`${event.title} photo ${imgIdx + 1}`} className="aspect-[16/9] w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setImgIdx(i)} aria-label={`Show photo ${i + 1}`}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === imgIdx ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="badge bg-brand-light text-brand-dark">{event.category}</span>
            {data.rating.count > 0 && <span className="flex items-center gap-1 text-sm"><Stars value={data.rating.avg} size="h-4 w-4" /> {data.rating.avg} ({data.rating.count})</span>}
          </div>
          <h1 className="mt-2 text-3xl sm:text-5xl">{event.title}</h1>
          <div className="mt-4 grid gap-2 text-harbor-700 sm:grid-cols-2">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-brand" /> <span>{fmtDateTime(event.startDate)}<br /><span className="text-sm text-harbor-500">until {fmtDateTime(event.endDate)}</span></span></p>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" /> <span>{placeText(event)}{event.address && <><br /><span className="text-sm text-harbor-500">{event.address}</span></>}</span></p>
          </div>

          {event.announcements?.length > 0 && (
            <div className="mt-6 rounded-xl border border-marigold bg-marigold-light p-4">
              <p className="mb-2 flex items-center gap-2 font-display font-extrabold"><Megaphone className="h-4 w-4" /> Updates from the organizer</p>
              <ul className="space-y-1 text-sm">{[...event.announcements].reverse().slice(0, 3).map((a) => <li key={a._id}><span className="text-harbor-500">{fmtDate(a.createdAt)}:</span> {a.message}</li>)}</ul>
            </div>
          )}

          <section className="mt-8"><h2 className="mb-3 text-2xl">About this event</h2><p className="max-w-3xl whitespace-pre-line leading-relaxed text-harbor-700">{event.description}</p></section>

          {video && (
            <section className="mt-8">
              <h2 className="mb-3 text-2xl">Watch</h2>
              <div className="aspect-video overflow-hidden rounded-2xl bg-harbor">
                {video.type === 'iframe'
                  ? <iframe src={video.src} title={`${event.title} video`} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
                  : <video src={video.src} controls className="h-full w-full" />}
              </div>
            </section>
          )}

          <section className="mt-8"><h2 className="mb-3 text-2xl">Schedule</h2><ScheduleView sessions={event.schedule} /></section>

          <section className="mt-8">
            <h2 className="mb-3 text-2xl">Hosted by</h2>
            <div className="panel flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-harbor text-white"><User2 /></span>
              <div><p className="font-bold">{event.organizer?.name}</p>{event.organizer?.bio && <p className="text-sm text-harbor-500">{event.organizer.bio}</p>}</div></div>
          </section>

          <Reviews eventId={id} started={started} feedback={feedback} user={user} onSaved={() => { load(); loadFeedback(); }} />
        </div>

        {/* ticket panel */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="stub bg-white p-5 shadow-sm" style={{ '--notch': '52%' }}>
            <h2 className="text-xl">Tickets</h2>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Ticket type">
              {event.ticketTypes.map((t) => {
                const out = t.available <= 0;
                return (
                  <button key={t._id} role="radio" aria-checked={typeId === t._id} disabled={out || !canBuy} onClick={() => { setTypeId(t._id); setQty(1); }}
                    className={`w-full rounded-lg border p-3 text-left transition disabled:opacity-50 ${typeId === t._id ? 'border-brand bg-brand-light' : 'border-mist hover:border-harbor/40'}`}>
                    <span className="flex items-baseline justify-between gap-3"><span className="font-bold">{t.name}</span><span className="font-display font-extrabold">{money(t.price)}</span></span>
                    {t.description && <span className="block text-sm text-harbor-500">{t.description}</span>}
                    <span className={`mt-1 block text-xs font-semibold ${out ? 'text-danger' : t.available <= 10 ? 'text-[#8a6100]' : 'text-harbor-500'}`}>{out ? 'Sold out' : t.available <= 10 ? `Only ${t.available} left` : `${t.available} available`}</span>
                  </button>
                );
              })}
            </div>
            <div className="perforation my-4" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Quantity</span>
              <div className="flex items-center gap-3">
                <button className="btn-outline btn-sm" aria-label="Fewer tickets" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center font-bold" aria-live="polite">{qty}</span>
                <button className="btn-outline btn-sm" aria-label="More tickets" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg"><span>Total</span><span className="font-display text-2xl font-extrabold">{money((tt?.price || 0) * qty)}</span></div>
            <button className="btn-accent mt-4 w-full py-3" disabled={!canBuy || !tt} onClick={startRegistration}>
              {ended ? 'Event has ended' : !live ? 'Not open for sales' : !tt ? 'Sold out' : user ? (tt.price === 0 ? 'Register for free' : 'Register & pay') : 'Log in to register'}
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-harbor-500"><ShieldCheck className="h-4 w-4" /> Secure checkout. Cancel or transfer tickets until the event starts.</p>
          </div>
        </aside>
      </div>

      {open && tt && <RegistrationModal event={event} tt={tt} qty={qty} user={user} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RegistrationModal({ event, tt, qty, user, onClose }) {
  const navigate = useNavigate();
  const [reg, setReg] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [others, setOthers] = useState(Array.from({ length: qty }, () => ({ name: '', email: '' })));
  const [busy, setBusy] = useState(false);
  const total = tt.price * qty;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const attendees = others.map((a, i) => (i === 0 ? { name: reg.name, email: reg.email } : a));
      const { data } = await api.post('/orders/checkout', { eventId: event._id, ticketTypeId: tt._id, quantity: qty, registrant: reg, attendees });
      if (data.free) navigate(`/payment/success?order=${data.orderId}`);
      else window.location.href = data.url;
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Registration" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-chalk p-3 text-sm"><p className="font-bold">{event.title}</p><p className="text-harbor-500">{qty} x {tt.name} - {money(total)}</p></div>
        <h3 className="text-base">Your details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name"><input required className="input" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} /></Field>
          <Field label="Email" hint="Confirmation and tickets are sent here"><input required type="email" className="input" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} /></Field>
          <Field label="Phone"><input type="tel" className="input" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} /></Field>
        </div>
        {qty > 1 && (
          <>
            <h3 className="text-base">Who is coming? <span className="text-sm font-normal text-harbor-500">Optional. Leave blank to put every ticket under your name; you can transfer later.</span></h3>
            {others.slice(1).map((a, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder={`Guest ${i + 2} name`} value={a.name} onChange={(e) => setOthers(others.map((x, j) => (j === i + 1 ? { ...x, name: e.target.value } : x)))} />
                <input type="email" className="input" placeholder={`Guest ${i + 2} email`} value={a.email} onChange={(e) => setOthers(others.map((x, j) => (j === i + 1 ? { ...x, email: e.target.value } : x)))} />
              </div>
            ))}
          </>
        )}
        <div className="rounded-lg border border-mist p-3 text-sm text-harbor-700">
          {total === 0 ? 'This is a free event, so no payment is needed.' : 'Next you will enter payment details (card or digital wallet) on our secure payment page. Card numbers never touch our servers.'}
        </div>
        <button className="btn-accent w-full py-3" disabled={busy}>{busy ? 'Please wait...' : total === 0 ? 'Confirm registration' : `Continue to payment - ${money(total)}`}</button>
      </form>
    </Modal>
  );
}

function Reviews({ eventId, started, feedback, user, onSaved }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post(`/events/${eventId}/feedback`, { rating, comment }); toast.success('Thanks for your feedback'); setComment(''); onSaved(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-2xl">Attendee feedback</h2>
      {feedback.length === 0 ? <p className="text-sm text-harbor-500">No feedback yet.</p> : (
        <ul className="space-y-3">{feedback.map((f) => (
          <li key={f._id} className="panel"><div className="flex items-center justify-between"><p className="font-bold">{f.user?.name}</p><Stars value={f.rating} size="h-4 w-4" /></div>{f.comment && <p className="mt-1 text-sm text-harbor-700">{f.comment}</p>}</li>
        ))}</ul>
      )}
      {user && started && (
        <form onSubmit={submit} className="panel mt-4 space-y-3">
          <p className="font-bold">Attended? Rate this event</p>
          <Stars value={rating} onChange={setRating} size="h-7 w-7" />
          <textarea className="input" rows={3} placeholder="What went well? What could be better?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary btn-sm" disabled={!rating}>Submit feedback</button>
        </form>
      )}
    </section>
  );
}
