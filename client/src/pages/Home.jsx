import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarCheck, QrCode, BarChart3 } from 'lucide-react';
import api from '../lib/api';
import { CATEGORIES } from '../lib/format';
import EventCard from '../components/EventCard';
import { Loader, Empty } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [events, setEvents] = useState(null);
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { api.get('/events?limit=6').then((r) => setEvents(r.data.events)).catch(() => setEvents([])); }, []);
  const go = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (location) p.set('location', location);
    navigate(`/events?${p}`);
  };

  return (
    <>
      <section className="bg-harbor text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <h1 className="text-4xl leading-[1.05] sm:text-6xl">Find something worth showing up for.</h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">Browse concerts, workshops, conferences and meetups. Book in a minute, get your ticket by email, and change plans without a phone call.</p>
            <form onSubmit={go} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 px-3 text-harbor">
                <Search className="h-5 w-5 text-harbor-300" /><span className="sr-only">Search events</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jazz, startup, yoga..." className="w-full bg-transparent py-2.5 text-sm outline-none" />
              </label>
              <label className="flex items-center gap-2 border-t border-mist px-3 text-harbor sm:border-l sm:border-t-0">
                <MapPin className="h-5 w-5 text-harbor-300" /><span className="sr-only">Location</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" className="w-full bg-transparent py-2.5 text-sm outline-none sm:w-32" />
              </label>
              <button className="btn-accent">Find events</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 6).map((c) => (
                <Link key={c} to={`/events?category=${encodeURIComponent(c)}`} className="rounded-full border border-white/25 px-3 py-1 text-sm text-white/85 hover:border-marigold hover:text-marigold">{c}</Link>
              ))}
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex" aria-hidden="true">
            <div className="stub relative w-full max-w-sm rotate-2 bg-marigold p-6 text-harbor" style={{ '--notch': '64%' }}>
              <p className="font-display text-sm font-extrabold">ADMIT ONE</p>
              <p className="mt-2 font-display text-4xl font-extrabold leading-none">Your next night out</p>
              <div className="perforation !border-harbor/40 my-5" />
              <div className="flex items-end justify-between">
                <div className="text-sm font-semibold"><p>Row A - Seat 12</p><p className="opacity-70">TKT-9F3A1C7B2E</p></div>
                <QrCode className="h-16 w-16" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl">Coming up soon</h2>
          <Link to="/events" className="text-sm font-semibold text-brand hover:underline">See all events</Link>
        </div>
        {!events ? <Loader /> : events.length === 0 ? (
          <Empty title="No upcoming events yet">Organizers are still setting things up. Check back soon or list your own event.</Empty>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard key={e._id} event={e} />)}</div>
        )}
      </section>

      <section className="border-t border-mist bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            [CalendarCheck, 'Book without friction', 'Pick a ticket type, fill in your details, pay securely with a card or wallet. Confirmation lands in your inbox.'],
            [QrCode, 'Manage your tickets', 'Cancel for a refund or hand a ticket to a friend from your dashboard, right up until the doors open.'],
            [BarChart3, 'Run your own events', 'Publish listings, set ticket tiers, update the schedule, check people in and watch sales in real time.'],
          ].map(([Icon, t, d]) => (
            <div key={t}><Icon className="mb-3 h-7 w-7 text-brand" /><h3 className="text-xl">{t}</h3><p className="mt-2 text-harbor-500">{d}</p></div>
          ))}
        </div>
        {(!user || user.role === 'user') && (
          <div className="mx-auto max-w-7xl px-4 pb-14">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-light p-8 sm:flex-row sm:items-center">
              <div><h3 className="text-2xl">Hosting something?</h3><p className="text-harbor-700">Create an organizer account and list your first event in minutes.</p></div>
              <Link to="/register?role=organizer" className="btn-primary">Become an organizer</Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
