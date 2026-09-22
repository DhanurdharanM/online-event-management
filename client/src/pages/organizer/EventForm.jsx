import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../../lib/api';
import { CATEGORIES, toLocalInput, fromLocalInput } from '../../lib/format';
import { Field, Loader } from '../../components/ui';
import ScheduleEditor from '../../components/ScheduleEditor';

const blank = {
  title: '', category: CATEGORIES[0], description: '', startDate: '', endDate: '', venue: '', address: '', city: '', isOnline: false,
  images: [], videoUrl: '', ticketTypes: [{ name: 'General admission', description: '', price: 0, quantity: 100 }],
};

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF] = useState(blank);
  const [schedule, setSchedule] = useState([]);
  const [imgUrl, setImgUrl] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then(({ data }) => {
      const e = data.event;
      setF({ ...blank, ...e, startDate: toLocalInput(e.startDate), endDate: toLocalInput(e.endDate), videoUrl: e.videoUrl || '', venue: e.venue || '', address: e.address || '', city: e.city || '' });
    }).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setTT = (i, patch) => setF({ ...f, ticketTypes: f.ticketTypes.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  const addImage = (url) => { if (url && !f.images.includes(url)) setF((p) => ({ ...p, images: [...p.images, url] })); setImgUrl(''); };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('image', file);
    setUploading(true);
    try { const { data } = await api.post('/upload', body); addImage(data.url); toast.success('Image uploaded'); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: f.title, category: f.category, description: f.description, venue: f.venue, address: f.address, city: f.city, isOnline: f.isOnline,
        images: f.images, videoUrl: f.videoUrl,
        startDate: fromLocalInput(f.startDate), endDate: fromLocalInput(f.endDate),
        ticketTypes: f.ticketTypes.map((t) => ({ _id: t._id, name: t.name, description: t.description, price: Number(t.price), quantity: Number(t.quantity) })),
      };
      if (!id) payload.schedule = schedule.map((s) => ({ ...s, startTime: fromLocalInput(s.startTime), endTime: fromLocalInput(s.endTime) }));
      const { data } = id ? await api.put(`/events/${id}`, payload) : await api.post('/events', payload);
      toast.success(id ? 'Event updated' : 'Event created. It will go live once an admin approves it.');
      navigate(`/organizer/events/${data.event._id}/manage`);
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  if (loading) return <Loader />;
  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div><Link to="/organizer" className="text-sm font-semibold text-brand">Back to dashboard</Link><h1 className="mt-1 text-3xl sm:text-4xl">{id ? 'Edit event' : 'Create an event'}</h1></div>

      <section className="panel space-y-4">
        <h2 className="text-xl">Basics</h2>
        <Field label="Event title"><input required maxLength={120} className="input" value={f.title} onChange={set('title')} /></Field>
        <Field label="Category"><select className="input" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Description" hint="Explain what happens, who it is for and what is included. Line breaks are kept."><textarea required minLength={20} rows={7} className="input" value={f.description} onChange={set('description')} /></Field>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl">Date, time and place</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts"><input required type="datetime-local" className="input" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="Ends"><input required type="datetime-local" className="input" min={f.startDate} value={f.endDate} onChange={set('endDate')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.isOnline} onChange={set('isOnline')} /> This is an online event</label>
        {!f.isOnline && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue name"><input className="input" value={f.venue} onChange={set('venue')} /></Field>
            <Field label="City"><input required className="input" value={f.city} onChange={set('city')} /></Field>
            <div className="sm:col-span-2"><Field label="Street address"><input className="input" value={f.address} onChange={set('address')} /></Field></div>
          </div>
        )}
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl">Photos and video</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {f.images.map((src) => (
            <div key={src} className="relative overflow-hidden rounded-lg"><img src={src} alt="" className="aspect-video w-full object-cover" />
              <button type="button" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== src) })} className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1 text-danger" aria-label="Remove image"><Trash2 className="h-4 w-4" /></button></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1" type="url" placeholder="Paste an image URL" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
          <button type="button" className="btn-outline" onClick={() => addImage(imgUrl.trim())}>Add URL</button>
          <label className="btn-outline cursor-pointer"><ImagePlus className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload image'}<input type="file" accept="image/*" className="sr-only" onChange={upload} disabled={uploading} /></label>
        </div>
        <p className="text-xs text-harbor-500">The first image is the cover. Use landscape photos at least 1200px wide.</p>
        <Field label="Video link" hint="YouTube, Vimeo or a direct .mp4 link"><input type="url" className="input" value={f.videoUrl} onChange={set('videoUrl')} placeholder="https://www.youtube.com/watch?v=..." /></Field>
      </section>

      <section className="panel space-y-4">
        <h2 className="text-xl">Ticket types and pricing</h2>
        {f.ticketTypes.map((t, i) => (
          <div key={t._id || i} className="rounded-xl border border-mist bg-chalk/60 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
              <Field label="Name"><input required className="input" placeholder="General admission, VIP..." value={t.name} onChange={(e) => setTT(i, { name: e.target.value })} /></Field>
              <Field label="Price"><input required type="number" min="0" step="0.01" className="input" value={t.price} onChange={(e) => setTT(i, { price: e.target.value })} /></Field>
              <Field label="Quantity"><input required type="number" min={Math.max(1, t.sold || 1)} className="input" value={t.quantity} onChange={(e) => setTT(i, { quantity: e.target.value })} /></Field>
            </div>
            <input className="input mt-3" placeholder="What is included? (optional)" value={t.description || ''} onChange={(e) => setTT(i, { description: e.target.value })} />
            <div className="mt-2 flex items-center justify-between text-xs text-harbor-500">
              <span>{t.sold ? `${t.sold} already sold` : 'Set the price to 0 for a free ticket'}</span>
              {f.ticketTypes.length > 1 && !t.sold && <button type="button" className="flex items-center gap-1 font-semibold text-danger" onClick={() => setF({ ...f, ticketTypes: f.ticketTypes.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn-outline btn-sm" onClick={() => setF({ ...f, ticketTypes: [...f.ticketTypes, { name: '', description: '', price: 0, quantity: 50 }] })}><Plus className="h-4 w-4" /> Add ticket type</button>
      </section>

      {!id ? (
        <section className="panel space-y-4">
          <div><h2 className="text-xl">Schedule (optional)</h2><p className="text-sm text-harbor-500">Add sessions and speakers now, or later from the Manage page where attendees can be notified of changes.</p></div>
          <ScheduleEditor sessions={schedule} onChange={setSchedule} baseDate={f.startDate} />
        </section>
      ) : <p className="text-sm text-harbor-500">To change sessions and speakers, use <b>Manage - Schedule</b>. Attendees can be notified automatically there.</p>}

      <div className="flex gap-3"><button className="btn-accent px-6 py-3" disabled={busy}>{busy ? 'Saving...' : id ? 'Save changes' : 'Submit for approval'}</button><Link to="/organizer" className="btn-outline">Cancel</Link></div>
    </form>
  );
}
