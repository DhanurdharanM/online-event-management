import { Link } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { fmtTime, priceRange, placeText, fallbackImg } from '../lib/format';

export default function EventCard({ event }) {
  const d = new Date(event.startDate);
  const soldOut = event.ticketTypes?.every((t) => t.sold >= t.quantity);
  return (
    <Link to={`/events/${event._id}`} className="stub group flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_0_#DCE3E0] transition hover:-translate-y-0.5 hover:shadow-md" style={{ '--notch': '58%' }}>
      <div className="relative aspect-[16/10] overflow-hidden bg-mist">
        <img src={event.images?.[0] || fallbackImg(event._id)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold">{event.category}</span>
        <div className="absolute right-3 top-3 rounded-lg bg-marigold px-2.5 py-1 text-center leading-tight text-harbor">
          <div className="font-display text-lg font-extrabold">{d.getDate()}</div>
          <div className="text-[11px] font-semibold">{d.toLocaleString(undefined, { month: 'short' })}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 pb-3">
        <h3 className="line-clamp-2 text-lg leading-snug">{event.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-harbor-500"><Clock className="h-4 w-4 shrink-0" /> {fmtTime(event.startDate)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-harbor-500"><MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{placeText(event)}</span></p>
      </div>
      <div className="perforation mx-4" />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-extrabold">{priceRange(event)}</span>
        <span className={`text-xs font-semibold ${soldOut ? 'text-danger' : 'text-brand'}`}>{soldOut ? 'Sold out' : 'View tickets'}</span>
      </div>
    </Link>
  );
}
