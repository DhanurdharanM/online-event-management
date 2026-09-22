import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, CalendarDays, Ticket, Wallet, UserCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import api, { errMsg } from '../../lib/api';
import { fmtDateTime, money } from '../../lib/format';
import { Loader, Empty, Badge, StatCard } from '../../components/ui';

export default function MyEvents() {
  const [events, setEvents] = useState(null);
  const [stats, setStats] = useState(null);
  const load = useCallback(() => {
    api.get('/events/mine').then((r) => setEvents(r.data.events)).catch((e) => toast.error(errMsg(e)));
    api.get('/events/mine/analytics').then((r) => setStats(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const cancel = async (e) => {
    if (!window.confirm(`Cancel "${e.title}"? Every paid order will be refunded and attendees emailed. This cannot be undone.`)) return;
    try { const { data } = await api.put(`/events/${e._id}/cancel`); toast.success(`Event cancelled, ${data.refunded} order(s) refunded`); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.title}" permanently?`)) return;
    try { await api.delete(`/events/${e._id}`); toast.success('Event deleted'); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl sm:text-4xl">Organizer dashboard</h1><p className="text-harbor-500">Your listings, sales and attendance at a glance.</p></div>
        <Link to="/organizer/events/new" className="btn-accent"><Plus className="h-4 w-4" /> Create event</Link>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CalendarDays} label="Events" value={stats.totals.events} />
            <StatCard icon={Ticket} label="Tickets sold" value={stats.totals.ticketsSold} />
            <StatCard icon={Wallet} label="Revenue" value={money(stats.totals.revenue, { freeLabel: false })} />
            <StatCard icon={UserCheck} label="Checked in" value={stats.totals.checkedIn} />
          </div>
          {stats.perEvent.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="panel"><h2 className="mb-3 text-lg">Tickets sold vs capacity</h2>
                <ResponsiveContainer width="100%" height={240}><BarChart data={stats.perEvent}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="title" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="capacity" name="Capacity" fill="#DCE3E0" radius={[4, 4, 0, 0]} /><Bar dataKey="sold" name="Sold" fill="#0F766E" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="panel"><h2 className="mb-3 text-lg">Revenue over time</h2>
                {stats.overTime.length ? <ResponsiveContainer width="100%" height={240}><AreaChart data={stats.overTime}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(v, { freeLabel: false })} /><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0F766E" fill="#D6EFEC" /></AreaChart></ResponsiveContainer> : <p className="py-16 text-center text-sm text-harbor-500">No paid orders yet.</p>}</div>
            </div>
          )}
        </>
      )}

      <h2 className="mb-3 mt-10 text-2xl">Your events</h2>
      {!events ? <Loader /> : events.length === 0 ? <Empty title="You have not created an event yet">Add your title, dates and ticket tiers. An admin reviews each listing before it goes live.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-mist bg-chalk"><tr><th className="th">Event</th><th className="th">Status</th><th className="th">Sold</th><th className="th">Revenue</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-mist">
              {events.map((e) => (
                <tr key={e._id}>
                  <td className="td"><p className="font-bold">{e.title}</p><p className="text-xs text-harbor-500">{fmtDateTime(e.startDate)}</p></td>
                  <td className="td"><Badge status={e.status} />{e.status === 'rejected' && <p className="mt-1 max-w-[200px] text-xs text-danger">{e.rejectionReason}</p>}</td>
                  <td className="td"><span className="font-semibold">{e.ticketsSold}</span> / {e.capacity}<div className="mt-1 h-1.5 w-24 rounded bg-mist"><div className="h-full rounded bg-brand" style={{ width: `${Math.min(100, (e.ticketsSold / e.capacity) * 100)}%` }} /></div></td>
                  <td className="td font-semibold">{money(e.revenue, { freeLabel: false })}</td>
                  <td className="td"><div className="flex flex-wrap justify-end gap-1.5">
                    <Link className="btn-primary btn-sm" to={`/organizer/events/${e._id}/manage`}>Manage</Link>
                    {e.status !== 'cancelled' && <Link className="btn-outline btn-sm" to={`/organizer/events/${e._id}/edit`}>Edit</Link>}
                    <Link className="btn-outline btn-sm" to={`/events/${e._id}`}>View</Link>
                    {e.status === 'approved' && <button className="btn-outline btn-sm !text-danger" onClick={() => cancel(e)}>Cancel event</button>}
                    {e.ticketsSold === 0 && <button className="btn-outline btn-sm !text-danger" onClick={() => remove(e)}>Delete</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
