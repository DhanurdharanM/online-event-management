import { useEffect } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { statusStyle } from '../lib/format';

export const Loader = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-harbor-500" role="status">
    <Loader2 className="h-5 w-5 animate-spin" /> {label}...
  </div>
);

export const Empty = ({ title, children }) => (
  <div className="rounded-xl border border-dashed border-harbor/25 bg-white/60 px-6 py-12 text-center">
    <Inbox className="mx-auto mb-3 h-8 w-8 text-harbor-300" />
    <p className="font-display text-lg font-extrabold">{title}</p>
    {children && <div className="mx-auto mt-1 max-w-md text-sm text-harbor-500">{children}</div>}
  </div>
);

export const Badge = ({ status, children }) => (
  <span className={`badge ${statusStyle[status] || 'bg-mist text-harbor-500'}`}>{children || status.replace('_', ' ')}</span>
);

export const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="panel flex items-start gap-3">
    {Icon && <span className="rounded-lg bg-marigold-light p-2 text-harbor"><Icon className="h-5 w-5" /></span>}
    <div className="min-w-0">
      <p className="text-sm text-harbor-500">{label}</p>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="text-xs text-harbor-500">{hint}</p>}
    </div>
  </div>
);

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-harbor/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-chalk" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Pagination = ({ page, pages, onChange }) =>
  pages > 1 && (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
      <span className="text-sm text-harbor-500">Page {page} of {pages}</span>
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
    </div>
  );

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-harbor-500">{hint}</span>}
  </label>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-mist" role="tablist">
    {tabs.map((t) => (
      <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
        className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${value === t.id ? 'border-brand text-brand' : 'border-transparent text-harbor-500 hover:text-harbor'}`}>
        {t.label}
      </button>
    ))}
  </div>
);

export const Stars = ({ value = 0, onChange, size = 'h-5 w-5' }) => (
  <div className="flex" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="disabled:cursor-default">
        <svg viewBox="0 0 20 20" className={`${size} ${n <= Math.round(value) ? 'fill-marigold' : 'fill-mist'}`}><path d="M10 1.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L1.4 7.8l6-.7z" /></svg>
      </button>
    ))}
  </div>
);
