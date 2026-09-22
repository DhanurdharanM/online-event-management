import { Link } from 'react-router-dom';
import { Logo } from './Navbar';

export default function Footer() {
  return (
    <footer className="mt-16 bg-harbor text-white/75">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center">
        <div><Logo light /><p className="mt-2 max-w-xs text-sm">Discover events, book tickets and run your own, all in one place.</p></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <Link to="/events" className="hover:text-white">Explore events</Link><Link to="/register?role=organizer" className="hover:text-white">Host an event</Link><Link to="/support" className="hover:text-white">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
