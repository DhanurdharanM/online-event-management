const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';

export const CATEGORIES = [
  'Music', 'Technology', 'Business', 'Arts & Culture', 'Food & Drink',
  'Sports & Fitness', 'Education', 'Health & Wellness', 'Community', 'Other',
];

export const money = (n, { freeLabel = true } = {}) => {
  if (!n && freeLabel) return 'Free';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(n || 0);
};
export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
export const dayKey = (d) => new Date(d).toDateString();

/** ISO string -> value for <input type="datetime-local"> in the user's timezone */
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

export const priceRange = (e) => (e.minPrice === e.maxPrice ? money(e.minPrice) : `${money(e.minPrice)} - ${money(e.maxPrice)}`);
export const placeText = (e) => (e.isOnline ? 'Online' : [e.venue, e.city].filter(Boolean).join(', ') || 'Location TBA');
export const fallbackImg = (seed = 'event') => `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/700`;

/** Turn a YouTube / Vimeo link into an embeddable URL. Direct video files are returned as-is. */
export function videoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'video', src: url };
  return null;
}

export const statusStyle = {
  approved: 'bg-brand-light text-brand-dark',
  paid: 'bg-brand-light text-brand-dark',
  resolved: 'bg-brand-light text-brand-dark',
  pending: 'bg-marigold-light text-[#8a6100]',
  in_progress: 'bg-marigold-light text-[#8a6100]',
  open: 'bg-marigold-light text-[#8a6100]',
  rejected: 'bg-danger-light text-danger',
  cancelled: 'bg-danger-light text-danger',
  failed: 'bg-danger-light text-danger',
  expired: 'bg-mist text-harbor-500',
};
