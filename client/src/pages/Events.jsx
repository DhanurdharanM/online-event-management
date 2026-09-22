import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import { CATEGORIES } from '../lib/format';
import EventCard from '../components/EventCard';
import { Loader, Empty, Pagination, Field } from '../components/ui';
import toast from 'react-hot-toast';

const KEYS = ['q', 'category', 'location', 'dateFrom', 'dateTo', 'minPrice', 'maxPrice', 'sort', 'online'];

export default function Events() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])));
  const [data, setData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    setForm(Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])));
    setData(null);
    api.get(`/events?${params.toString()}`).then((r) => setData(r.data)).catch((e) => { toast.error(errMsg(e)); setData({ events: [], pages: 1, total: 0 }); });
  }, [params]);

  const apply = (e) => {
    e?.preventDefault();
    const p = new URLSearchParams();
    KEYS.forEach((k) => form[k] && p.set(k, form[k]));
    setParams(p);
    setShowFilters(false);
  };
  const clear = () => { setParams({}); setShowFilters(false); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? String(e.target.checked) : e.target.value });
  const goPage = (n) => { const p = new URLSearchParams(params); p.set('page', n); setParams(p); window.scrollTo({ top: 0 }); };
  const active = KEYS.filter((k) => k !== 'sort' && params.get(k)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Explore events</h1>
          <p className="text-harbor-500">{data ? `${data.total} event${data.total === 1 ? '' : 's'} found` : 'Searching...'}</p>
        </div>
        <button className="btn-outline lg:hidden" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="h-4 w-4" /> Filters{active ? ` (${active})` : ''}</button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <form onSubmit={apply} className={`${showFilters ? 'block' : 'hidden'} panel h-fit space-y-4 lg:sticky lg:top-20 lg:block`}>
          <Field label="Search"><input className="input" placeholder="Title, keyword, venue" value={form.q} onChange={set('q')} /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={set('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Location"><input className="input" placeholder="City or venue" value={form.location} onChange={set('location')} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.online === 'true'} onChange={set('online')} /> Online events only</label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From date"><input type="date" className="input" value={form.dateFrom} onChange={set('dateFrom')} /></Field>
            <Field label="To date"><input type="date" className="input" value={form.dateTo} onChange={set('dateTo')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min price"><input type="number" min="0" className="input" placeholder="0" value={form.minPrice} onChange={set('minPrice')} /></Field>
            <Field label="Max price"><input type="number" min="0" className="input" placeholder="Any" value={form.maxPrice} onChange={set('maxPrice')} /></Field>
          </div>
          <Field label="Sort by">
            <select className="input" value={form.sort} onChange={set('sort')}>
              <option value="">Soonest first</option><option value="newest">Newly listed</option>
              <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
            </select>
          </Field>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">Apply filters</button>
            {active > 0 && <button type="button" onClick={clear} className="btn-outline" aria-label="Clear filters"><X className="h-4 w-4" /></button>}
          </div>
        </form>

        <div>
          {!data ? <Loader /> : data.events.length === 0 ? (
            <Empty title="No events match those filters">Try a wider date range, a different category, or clear the filters to see everything.</Empty>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{data.events.map((e) => <EventCard key={e._id} event={e} />)}</div>
              <Pagination page={page} pages={data.pages} onChange={goPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
