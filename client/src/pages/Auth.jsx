import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';
import { Field } from '../components/ui';

const Shell = ({ title, sub, children, footer }) => (
  <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
    <div className="w-full">
      <h1 className="text-3xl">{title}</h1>
      <p className="mb-6 mt-1 text-harbor-500">{sub}</p>
      <div className="panel">{children}</div>
      <p className="mt-4 text-center text-sm text-harbor-500">{footer}</p>
    </div>
  </div>
);

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await login(form.email, form.password); toast.success('Welcome back'); navigate(state?.from || '/dashboard'); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Log in" sub="Access your tickets and events." footer={<>New here? <Link to="/register" className="font-semibold text-brand">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input type="password" required autoComplete="current-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: params.get('role') === 'organizer' ? 'organizer' : 'user' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await register(form);
      toast.success('Account created');
      navigate(u.role === 'organizer' ? '/organizer' : '/dashboard');
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account" sub="Free for attendees and organizers." footer={<>Already registered? <Link to="/login" className="font-semibold text-brand">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {[['user', 'I want to attend events'], ['organizer', 'I want to host events']].map(([v, l]) => (
            <button type="button" key={v} role="radio" aria-checked={form.role === v} onClick={() => setForm({ ...form, role: v })}
              className={`rounded-lg border p-3 text-left text-sm font-semibold transition ${form.role === v ? 'border-brand bg-brand-light' : 'border-mist hover:border-harbor/40'}`}>{l}</button>
          ))}
        </div>
        <Field label="Full name"><input required className="input" value={form.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Email"><input type="email" required className="input" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Phone (optional)"><input type="tel" className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        <Field label="Password" hint="At least 8 characters"><input type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
    </Shell>
  );
}
