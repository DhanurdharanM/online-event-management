import { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutDashboard, CalendarCheck, Users, CreditCard, LifeBuoy, FileBarChart, Wallet, Ticket, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api, { errMsg } from '../../lib/api';
import { fmtDateTime, fmtDate, money } from '../../lib/format';
import { Loader, Empty, Badge, StatCard, Pagination, Stars, Modal } from '../../components/ui';
import { Thread } from '../Support';

const PIE = ['#0F766E', '#F5B82E', '#14282E', '#8FA1A6', '#C8402D', '#4A6169', '#D99A0B', '#0B5A54'];
const nav = [
  ['/admin', 'Overview', LayoutDashboard, true], ['/admin/events', 'Event listings', CalendarCheck], ['/admin/users', 'Users', Users],
  ['/admin/transactions', 'Payments', CreditCard], ['/admin/support', 'Support inquiries', LifeBuoy], ['/admin/reports', 'Reports', FileBarChart],
];

export function AdminLayout() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin sections">
        {nav.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-harbor text-white' : 'text-harbor-700 hover:bg-white'}`}><Icon className="h-4 w-4" /> {label}</NavLink>
        ))}
      </nav>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}

export function AdminOverview() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!d) return <Loader />;
  const c = d.counts;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total revenue" value={money(c.revenue, { freeLabel: false })} hint={`${c.orders} paid orders`} />
        <StatCard icon={Ticket} label="Tickets sold" value={c.ticketsSold} />
        <StatCard icon={Users} label="Users / organizers" value={`${c.users} / ${c.organizers}`} />
        <StatCard icon={CalendarCheck} label="Live events" value={c.events} />
      </div>
      {(c.pendingEvents > 0 || c.openSupport > 0) && (
        <div className="flex flex-wrap gap-3">
          {c.pendingEvents > 0 && <Link to="/admin/events?status=pending" className="badge bg-marigold-light px-3 py-1.5 text-sm text-[#8a6100]">{c.pendingEvents} listing(s) waiting for review</Link>}
          {c.openSupport > 0 && <Link to="/admin/support" className="badge bg-marigold-light px-3 py-1.5 text-sm text-[#8a6100]">{c.openSupport} open support inquiries</Link>}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel"><h2 className="mb-3 text-lg">Revenue by month</h2>
          {d.monthly.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={d.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(v, { freeLabel: false })} /><Bar dataKey="revenue" name="Revenue" fill="#0F766E" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-harbor-500">No paid orders yet.</p>}</div>
        <div className="panel"><h2 className="mb-3 text-lg">Live events by category</h2>
          {d.byCategory.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={d.byCategory} dataKey="value" nameKey="name" outerRadius={90}>{d.byCategory.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-harbor-500">No live events.</p>}</div>
      </div>
      <div className="panel"><h2 className="mb-3 text-lg">Top events by revenue</h2>
        {d.topEvents.length ? <ul className="divide-y divide-mist">{d.topEvents.map((e) => <li key={e._id} className="flex justify-between py-2.5 text-sm"><span>{e.title} <span className="text-harbor-500">({e.tickets} tickets)</span></span><b>{money(e.revenue, { freeLabel: false })}</b></li>)}</ul> : <p className="text-sm text-harbor-500">Nothing yet.</p>}</div>
    </div>
  );
}

export function AdminEvents() {
  const [status, setStatus] = useState(new URLSearchParams(window.location.search).get('status') || '');
  const [events, setEvents] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const load = useCallback(() => { setEvents(null); api.get(`/admin/events${status ? `?status=${status}` : ''}`).then((r) => setEvents(r.data.events)).catch((e) => toast.error(errMsg(e))); }, [status]);
  useEffect(() => { load(); }, [load]);

  const review = async (e, s, why) => {
    try { await api.put(`/admin/events/${e._id}/review`, { status: s, reason: why }); toast.success(s === 'approved' ? 'Event approved' : 'Event rejected'); setReject(null); setReason(''); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.title}"?`)) return;
    try { await api.delete(`/events/${e._id}`); toast.success('Deleted'); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const cancel = async (e) => {
    if (!window.confirm(`Cancel "${e.title}" and refund all attendees?`)) return;
    try { await api.put(`/events/${e._id}/cancel`); toast.success('Event cancelled and refunded'); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Event listings</h1>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{['pending', 'approved', 'rejected', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></div>
      {!events ? <Loader /> : events.length === 0 ? <Empty title="No events with that status" /> : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white"><table className="w-full min-w-[760px]">
          <thead className="border-b border-mist bg-chalk"><tr><th className="th">Event</th><th className="th">Organizer</th><th className="th">Status</th><th className="th">Sold</th><th className="th text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-mist">{events.map((e) => (
            <tr key={e._id}>
              <td className="td"><Link to={`/events/${e._id}`} className="font-bold hover:underline">{e.title}</Link><p className="text-xs text-harbor-500">{e.category} - {fmtDate(e.startDate)}</p></td>
              <td className="td text-xs">{e.organizer?.name}<br />{e.organizer?.email}</td>
              <td className="td"><Badge status={e.status} /></td>
              <td className="td">{e.ticketsSold}/{e.capacity}</td>
              <td className="td"><div className="flex flex-wrap justify-end gap-1.5">
                {e.status !== 'approved' && e.status !== 'cancelled' && <button className="btn-primary btn-sm" onClick={() => review(e, 'approved')}>Approve</button>}
                {e.status !== 'rejected' && e.status !== 'cancelled' && <button className="btn-outline btn-sm" onClick={() => setReject(e)}>Reject</button>}
                {e.status === 'approved' && <button className="btn-outline btn-sm !text-danger" onClick={() => cancel(e)}>Cancel</button>}
                {e.ticketsSold === 0 && <button className="btn-outline btn-sm !text-danger" onClick={() => remove(e)}>Delete</button>}
              </div></td>
            </tr>))}</tbody></table></div>
      )}
      <Modal open={!!reject} onClose={() => setReject(null)} title={`Reject "${reject?.title}"`}>
        <p className="mb-3 text-sm text-harbor-500">The organizer receives this reason by email and can edit and re-submit.</p>
        <textarea className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Please add a venue address and a clearer description." />
        <button className="btn-danger mt-3 w-full" disabled={!reason.trim()} onClick={() => review(reject, 'rejected', reason)}>Reject listing</button>
      </Modal>
    </div>
  );
}

export function AdminUsers() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page }); if (q) p.set('q', q); if (role) p.set('role', role);
    api.get(`/admin/users?${p}`).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [q, role, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const update = async (u, patch) => { try { await api.put(`/admin/users/${u._id}`, patch); toast.success('User updated'); load(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Users</h1>
      <div className="flex flex-wrap gap-3"><label className="relative min-w-[220px] flex-1"><span className="sr-only">Search users</span><Search className="absolute left-3 top-3 h-4 w-4 text-harbor-300" /><input className="input pl-9" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
        <select className="input w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role"><option value="">All roles</option><option value="user">Attendees</option><option value="organizer">Organizers</option><option value="admin">Admins</option></select></div>
      {!data ? <Loader /> : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white"><table className="w-full min-w-[640px]">
          <thead className="border-b border-mist bg-chalk"><tr><th className="th">User</th><th className="th">Role</th><th className="th">Joined</th><th className="th">Status</th><th className="th text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-mist">{data.users.map((u) => (
            <tr key={u._id}>
              <td className="td font-semibold">{u.name}<p className="text-xs font-normal text-harbor-500">{u.email}</p></td>
              <td className="td"><select className="input !w-32 !py-1.5" value={u.role} onChange={(e) => update(u, { role: e.target.value })} aria-label={`Role for ${u.name}`}><option value="user">user</option><option value="organizer">organizer</option><option value="admin">admin</option></select></td>
              <td className="td text-xs">{fmtDate(u.createdAt)}</td>
              <td className="td"><Badge status={u.isActive ? 'approved' : 'cancelled'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge></td>
              <td className="td text-right"><button className={`btn-outline btn-sm ${u.isActive ? '!text-danger' : ''}`} onClick={() => update(u, { isActive: !u.isActive })}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button></td>
            </tr>))}</tbody></table></div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

export function AdminTransactions() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback(() => { const p = new URLSearchParams({ page }); if (status) p.set('status', status); api.get(`/admin/transactions?${p}`).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e))); }, [status, page]);
  useEffect(() => { load(); }, [load]);
  const refund = async (o) => {
    if (!window.confirm(`Refund ${money(o.totalAmount, { freeLabel: false })} to ${o.registrant?.email} and cancel these tickets?`)) return;
    try { await api.post(`/admin/orders/${o._id}/refund`); toast.success('Refunded'); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Payments</h1>
        <select className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status"><option value="">All (except expired)</option>{['paid', 'pending', 'cancelled', 'failed', 'expired'].map((s) => <option key={s}>{s}</option>)}</select></div>
      {data && <div className="flex flex-wrap gap-3">{data.byStatus.map((s) => <span key={s._id} className="panel py-2 text-sm"><Badge status={s._id} /> {s.count} order(s) - <b>{money(s.amount, { freeLabel: false })}</b></span>)}</div>}
      {!data ? <Loader /> : data.orders.length === 0 ? <Empty title="No transactions" /> : (
        <div className="overflow-x-auto rounded-xl border border-mist bg-white"><table className="w-full min-w-[860px]">
          <thead className="border-b border-mist bg-chalk"><tr>{['Date', 'Buyer', 'Event', 'Items', 'Amount', 'Method', 'Status', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-mist">{data.orders.map((o) => (
            <tr key={o._id}>
              <td className="td text-xs">{fmtDateTime(o.createdAt)}<p className="font-mono text-[10px] text-harbor-300">{o._id}</p></td>
              <td className="td text-xs">{o.user?.name}<br />{o.user?.email}</td>
              <td className="td text-sm">{o.event?.title}</td>
              <td className="td text-xs">{o.quantity} x {o.ticketTypeName}</td>
              <td className="td font-semibold">{money(o.totalAmount, { freeLabel: false })}{o.refundAmount > 0 && <p className="text-xs font-normal text-danger">-{money(o.refundAmount)}</p>}</td>
              <td className="td text-xs">{o.paymentProvider ? `${o.paymentProvider} / ${o.paymentMethod || '-'}` : '-'}</td>
              <td className="td"><Badge status={o.status} /></td>
              <td className="td">{o.status === 'paid' && o.totalAmount > 0 && <button className="btn-outline btn-sm" onClick={() => refund(o)}>Refund</button>}</td>
            </tr>))}</tbody></table></div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

export function AdminSupport() {
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);
  const [openId, setOpenId] = useState(null);
  const load = useCallback(() => api.get(`/support/all${status ? `?status=${status}` : ''}`).then((r) => setList(r.data.inquiries)).catch((e) => toast.error(errMsg(e))), [status]);
  useEffect(() => { load(); }, [load]);
  const setSt = async (i, s) => { try { await api.put(`/support/${i._id}/status`, { status: s }); load(); } catch (e) { toast.error(errMsg(e)); } };
  const replace = (inq) => setList(list.map((x) => (x._id === inq._id ? { ...inq, user: x.user } : x)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Support inquiries</h1>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div>
      {!list ? <Loader /> : list.length === 0 ? <Empty title="Inbox zero">No inquiries match this filter.</Empty> : (
        <ul className="space-y-3">{list.map((i) => (
          <li key={i._id} className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === i._id ? null : i._id)} aria-expanded={openId === i._id}><b>{i.subject}</b><span className="block text-xs text-harbor-500">{i.user?.name} ({i.user?.email}) - {fmtDateTime(i.updatedAt)}</span></button>
              <select className="input !w-36 !py-1.5" value={i.status} onChange={(e) => setSt(i, e.target.value)} aria-label="Change status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>
            </div>
            {openId === i._id && <div className="mt-4"><Thread inquiry={i} onReply={replace} /></div>}
          </li>))}</ul>
      )}
    </div>
  );
}

export function AdminReports() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/admin/reports').then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!d) return <Loader />;
  const chart = d.rows.slice(0, 8).map((r) => ({ name: r.title.length > 16 ? `${r.title.slice(0, 16)}...` : r.title, revenue: r.revenue, sold: r.sold }));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Reports</h1>
      <div className="panel"><h2 className="mb-3 text-lg">Revenue by event</h2>
        {chart.some((c) => c.revenue) ? <ResponsiveContainer width="100%" height={260}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#DCE3E0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(v, { freeLabel: false })} /><Bar dataKey="revenue" name="Revenue" fill="#F5B82E" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="py-16 text-center text-sm text-harbor-500">No revenue yet.</p>}</div>
      <div><h2 className="mb-3 text-xl">Event performance</h2>
        <div className="overflow-x-auto rounded-xl border border-mist bg-white"><table className="w-full min-w-[820px]">
          <thead className="border-b border-mist bg-chalk"><tr>{['Event', 'Organizer', 'Sold / capacity', 'Revenue', 'Attendance', 'Rating'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-mist">{d.rows.map((r) => (
            <tr key={r.id}><td className="td font-semibold">{r.title}<p className="text-xs font-normal text-harbor-500">{r.category} - {fmtDate(r.startDate)}</p></td><td className="td text-sm">{r.organizer}</td><td className="td">{r.sold} / {r.capacity}</td><td className="td font-semibold">{money(r.revenue, { freeLabel: false })}</td><td className="td">{r.attendanceRate}%</td><td className="td">{r.rating ? <span className="flex items-center gap-1"><Stars value={r.rating} size="h-3.5 w-3.5" /> {r.rating} ({r.feedbackCount})</span> : '-'}</td></tr>
          ))}</tbody></table></div></div>
      <div><h2 className="mb-3 text-xl">Recent attendee feedback</h2>
        {d.feedback.length === 0 ? <Empty title="No feedback yet" /> : <ul className="grid gap-3 md:grid-cols-2">{d.feedback.map((f) => <li key={f._id} className="panel"><div className="flex items-center justify-between"><b className="text-sm">{f.event?.title}</b><Stars value={f.rating} size="h-4 w-4" /></div><p className="mt-1 text-sm">{f.comment || <span className="text-harbor-500">No comment</span>}</p><p className="mt-1 text-xs text-harbor-500">{f.user?.name} - {fmtDate(f.createdAt)}</p></li>)}</ul>}</div>
    </div>
  );
}
