import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Logo = ({ light }) => (
  <span className={`flex items-center gap-2 font-display text-xl font-extrabold ${light ? 'text-white' : 'text-harbor'}`}>
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-marigold text-harbor"><Ticket className="h-5 w-5" /></span> Convene
  </span>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white'}`;
  const items = [
    { to: '/events', label: 'Explore events' },
    ...(user ? [{ to: '/dashboard', label: 'My tickets' }, { to: '/support', label: 'Support' }] : []),
    ...(user && ['organizer', 'admin'].includes(user.role) ? [{ to: '/organizer', label: 'Organizer' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ];
  const out = () => { logout(); setOpen(false); navigate('/'); };

  return (
    <header className="sticky top-0 z-40 bg-harbor">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" onClick={() => setOpen(false)}><Logo light /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'} className={link}>{i.label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-white/75">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={out} className="btn-accent btn-sm">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-semibold text-white/85 hover:text-white">Log in</Link>
              <Link to="/register" className="btn-accent btn-sm">Sign up</Link>
            </>
          )}
        </div>
        <button className="p-2 text-white md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
          {items.map((i) => <NavLink key={i.to} to={i.to} onClick={() => setOpen(false)} className={link}>{i.label}</NavLink>)}
          {user ? <button onClick={out} className="btn-accent mt-2">Log out</button> : (
            <div className="mt-2 flex gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1">Log in</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-accent flex-1">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
