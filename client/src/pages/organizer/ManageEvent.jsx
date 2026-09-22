import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Search, Send, ScanLine, Ticket, Wallet, UserCheck, Percent, Star } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api, { errMsg, download } from '../../lib/api';
import { fmtDateTime, money, fromLocalInput } from '../../lib/format';
import { Loader, Empty, Badge, StatCard, Tabs, Stars } from '../../components/ui';
import ScheduleEditor, { sessionsToForm } from '../../components/ScheduleEditor';

export default function ManageEvent() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [tab, setTab] = useState('analytics');
  const loadEvent = useCallback(() => api.get(`/events/${id}`).then((r) => setEvent(r.data.event)).catch((e) => toast.error(errMsg(e))), [id]);
  useEffect(() => { loadEvent(); }, [loadEvent]);
  if (!event) return <Loader />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/organizer" className="text-sm font-semibold text-brand">Back to dashboard</Link>
      <div className="mb-6 mt-1 flex flex-wrap items-center gap-3"><h1 className="text-3xl sm:text-4xl">{event.title}</h1><Badge status={event.status} /></div>
      <p className="mb-6 text-harbor-500">{fmtDateTime(event.startDate)}</p>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'analytics', label: 'Analytics' }, { id: 'attendees', label: 'Attendees' }, { id: 'schedule', label: 'Schedule' },
        { id: 'announce', label: 'Announcements' }, { id: 'feedback', label: 'Feedback' },
      ]} />
      <div className="pt-6">
        {tab === 'analytics' && <Analytics id={id} />}
        {tab === 'attendees' && <Attendees id={id} />}
        {tab === 'schedule' && <Schedule event={event} onSaved={loadEvent} />}
        {tab === 'announce' && <Announce event={event} onSaved={loadEvent} />}
        {tab === 'feedback' && <Feedback id={id} />}
      </div>
    </div>
  );
}

function Analytics({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/events/${id}/analytics`).then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e))); }, [id]);
  if (!d) return <Loader />;
  const s = d.summary;
  const attendance = [{ name: 'Checked in', value: s.checkedIn }, { name: 'Not yet', value: Math.max(0, s.ticketsSold - s.checkedIn) }];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Ticket} label="Tickets sold" value={`${s.ticketsSold}/${s.capacity}`} hint={`${s.sellThrough}% sold`} />
        <StatCard icon={Wallet} label="Revenue" value={money(s.revenue, { freeLabel: false })} hint={s.refunded ? `${money(s.refunded)} refunded` : undefined} />
        <StatCard icon={UserCheck} label="Checked in" value={s.checkedIn} />
        <StatCard icon={Percent} label="Attendance rate" value={`${s.attendanceRate}%`} hint={`${s.cancelledTickets} cancelled`} />
        <StatCard icon={Star} label="Average rating" value={s.rating.count ? s.rating.avg : '-'} hint={`${s.rating.count} review(s)`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel"><h2 className="mb-3 text-lg">Cumulative ticket sales</h2>
          {d.overTime.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={d.overTime}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="cumulative" name="Tickets" stroke="#0F766E" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-harbor-500">Sales will chart here after the first order.</p>}</div>
        <div className="panel"><h2 className="mb-3 text-lg">Sales by ticket type</h2>
          <ResponsiveContainer width="100%" height={260}><BarChart data={d.byType}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="capacity" name="Capacity" fill="#DCE3E0" radius={[4, 4, 0, 0]} /><Bar dataKey="sold" name="Sold" fill="#F5B82E" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="panel"><h2 className="mb-3 text-lg">Attendance</h2>
          {s.ticketsSold ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={attendance} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}><Cell fill="#0F766E" /><Cell fill="#DCE3E0" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <p className="py-16 text-center text-sm text-harbor-500">No tickets sold yet.</p>}</div>
        <div className="panel"><h2 className="mb-3 text-lg">Revenue by ticket type</h2>
          <ul className="divide-y divide-mist">{d.byType.map((t) => <li key={t.name} className="flex justify-between py-2.5 text-sm"><span>{t.name} <span className="text-harbor-500">({t.sold} sold)</span></span><b>{money(t.revenue, { freeLabel: false })}</b></li>)}</ul></div>
      </div>
    </div>
  );
}

function Attendees({ id }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const load = useCallback(() => api.get(`/events/${id}/attendees`).then((r) => setRows(r.data.attendees)).catch((e) => toast.error(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => (rows || []).filter((r) => `${r.attendeeName} ${r.attendeeEmail} ${r.code} ${r.ticketType}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const check = async (c, undo = false) => {
    try { const { data } = await api.post(`/events/${id}/checkin`, { code: c, undo }); toast.success(undo ? 'Check-in undone' : `${data.ticket.attendeeName} checked in`); setCode(''); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  if (!rows) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative min-w-[220px] flex-1"><span className="sr-only">Search attendees</span><Search className="absolute left-3 top-3 h-4 w-4 text-harbor-300" /><input className="input pl-9" placeholder="Search name, email or code" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <form onSubmit={(e) => { e.preventDefault(); check(code); }} className="flex gap-2"><input className="input w-48 font-mono" placeholder="Scan / type ticket code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-primary"><ScanLine className="h-4 w-4" /> Check in</button></form>
        <button className="btn-outline" onClick={() => download(`/events/${id}/attendees/export`, `attendees-${id}.csv`).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      <p className="text-sm text-harbor-500">{rows.length} ticket(s) - {rows.filter((r) => r.checkedIn).length} checked in</p>
      {filtered.length === 0 ? <Empty title={rows.length ? 'No one matches that search' : 'No registrations yet'}>{rows.length ? 'Try a different name, email or ticket code.' : 'Attendees appear here as soon as someone completes a booking.'}</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-mist bg-chalk"><tr>{['Attendee', 'Contact', 'Ticket', 'Code', 'Booked', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-mist">{filtered.map((r) => (
              <tr key={r.code}>
                <td className="td font-semibold">{r.attendeeName}<p className="text-xs font-normal text-harbor-500">Buyer: {r.buyerName}</p></td>
                <td className="td text-xs">{r.attendeeEmail}<br />{r.phone}</td>
                <td className="td">{r.ticketType}<p className="text-xs text-harbor-500">{money(r.price)}</p></td>
                <td className="td"><code className="text-xs font-bold">{r.code}</code></td>
                <td className="td text-xs">{fmtDateTime(r.purchasedAt)}</td>
                <td className="td">{r.checkedIn ? <button className="badge bg-brand-light text-brand-dark" title="Undo check-in" onClick={() => check(r.code, true)}>Checked in</button> : <button className="btn-outline btn-sm" onClick={() => check(r.code)}>Check in</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Schedule({ event, onSaved }) {
  const [sessions, setSessions] = useState(() => sessionsToForm(event.schedule));
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const schedule = sessions.map((s) => ({ ...s, startTime: fromLocalInput(s.startTime), endTime: fromLocalInput(s.endTime) }));
      const { data } = await api.put(`/events/${event._id}/schedule`, { schedule, notify, message });
      toast.success(notify ? `Schedule saved. ${data.notified} attendee(s) emailed.` : 'Schedule saved'); setMessage(''); onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <ScheduleEditor sessions={sessions} onChange={setSessions} baseDate={event.startDate ? sessionsToForm([{ startTime: event.startDate }])[0].startTime : ''} />
      <div className="panel space-y-3">
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email registered attendees about this change</label>
        {notify && <input className="input" placeholder="Optional note, e.g. Keynote moved to 11:00 in Hall B" value={message} onChange={(e) => setMessage(e.target.value)} />}
        <button className="btn-accent" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save schedule'}</button>
      </div>
    </div>
  );
}

function Announce({ event, onSaved }) {
  const [message, setMessage] = useState('');
  const send = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post(`/events/${event._id}/announce`, { message }); toast.success(`Sent to ${data.notified} attendee(s)`); setMessage(''); onSaved(); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={send} className="panel h-fit space-y-3"><h2 className="text-lg">Message your attendees</h2><p className="text-sm text-harbor-500">Sent by email to everyone with a paid ticket and shown on the event page.</p>
        <textarea required rows={5} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Doors now open at 5:30 PM. Parking is available on Lake Road." /><button className="btn-primary"><Send className="h-4 w-4" /> Send update</button></form>
      <div><h2 className="mb-3 text-lg">History</h2>{event.announcements?.length ? <ul className="space-y-2">{[...event.announcements].reverse().map((a) => <li key={a._id} className="panel py-3 text-sm"><p>{a.message}</p><p className="mt-1 text-xs text-harbor-500">{fmtDateTime(a.createdAt)}</p></li>)}</ul> : <p className="text-sm text-harbor-500">Nothing sent yet.</p>}</div>
    </div>
  );
}

function Feedback({ id }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.get(`/events/${id}/feedback`).then((r) => setList(r.data.feedback)); }, [id]);
  if (!list) return <Loader />;
  return list.length === 0 ? <Empty title="No feedback yet">Attendees can rate the event once it has started.</Empty> : (
    <ul className="space-y-3">{list.map((f) => <li key={f._id} className="panel"><div className="flex items-center justify-between"><b>{f.user?.name}</b><Stars value={f.rating} size="h-4 w-4" /></div>{f.comment && <p className="mt-1 text-sm">{f.comment}</p>}</li>)}</ul>
  );
}
