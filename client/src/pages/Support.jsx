import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Loader, Empty, Badge, Field } from '../components/ui';

export function Thread({ inquiry, onReply }) {
  const [msg, setMsg] = useState('');
  const send = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post(`/support/${inquiry._id}/reply`, { message: msg }); setMsg(''); onReply(data.inquiry); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-chalk p-3 text-sm"><p className="whitespace-pre-line">{inquiry.message}</p><p className="mt-1 text-xs text-harbor-500">{fmtDateTime(inquiry.createdAt)}</p></div>
      {inquiry.replies.map((r) => (
        <div key={r._id} className={`rounded-lg p-3 text-sm ${r.authorRole === 'admin' ? 'bg-brand-light' : 'bg-chalk'}`}><p className="text-xs font-semibold">{r.authorName} {r.authorRole === 'admin' && '(support team)'}</p><p className="whitespace-pre-line">{r.message}</p><p className="mt-1 text-xs text-harbor-500">{fmtDateTime(r.createdAt)}</p></div>
      ))}
      <form onSubmit={send} className="flex gap-2"><input required className="input" placeholder="Write a reply" value={msg} onChange={(e) => setMsg(e.target.value)} /><button className="btn-primary">Send</button></form>
    </div>
  );
}

export default function Support() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [openId, setOpenId] = useState(null);
  const load = () => api.get('/support/mine').then((r) => setList(r.data.inquiries));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/support', form); setForm({ subject: '', message: '' }); toast.success('Inquiry sent. We usually reply within a day.'); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const update = (inq) => setList(list.map((x) => (x._id === inq._id ? inq : x)));

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="panel h-fit space-y-4">
        <h1 className="text-2xl">Contact support</h1>
        <p className="text-sm text-harbor-500">Problem with a payment, a refund or an event? Tell us what happened.</p>
        <Field label="Subject"><input required maxLength={140} className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Message"><textarea required rows={5} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        <button className="btn-primary w-full">Send inquiry</button>
      </form>
      <div>
        <h2 className="mb-3 text-2xl">Your inquiries</h2>
        {!list ? <Loader /> : list.length === 0 ? <Empty title="No inquiries yet">Messages you send to support and their replies show up here.</Empty> : (
          <ul className="space-y-3">{list.map((i) => (
            <li key={i._id} className="panel">
              <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenId(openId === i._id ? null : i._id)} aria-expanded={openId === i._id}>
                <span><b>{i.subject}</b><span className="block text-xs text-harbor-500">{fmtDateTime(i.updatedAt)}</span></span><Badge status={i.status} />
              </button>
              {openId === i._id && <div className="mt-4"><Thread inquiry={i} onReply={update} /></div>}
            </li>
          ))}</ul>
        )}
      </div>
    </div>
  );
}
