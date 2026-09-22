import { useMemo, useState } from 'react';
import { Mic2, DoorOpen } from 'lucide-react';
import { dayKey, fmtTime } from '../lib/format';

/** Calendar-style schedule: a tab per day, sessions on a timeline. */
export default function ScheduleView({ sessions = [] }) {
  const days = useMemo(() => {
    const map = new Map();
    [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach((s) => {
      const k = dayKey(s.startTime);
      map.set(k, [...(map.get(k) || []), s]);
    });
    return [...map.entries()];
  }, [sessions]);
  const [active, setActive] = useState(0);
  if (!days.length) return <p className="text-sm text-harbor-500">The organizer has not published a schedule yet.</p>;
  const [, list] = days[Math.min(active, days.length - 1)];

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist">
        {days.map(([k], i) => {
          const d = new Date(k);
          return (
            <button key={k} role="tab" aria-selected={active === i} onClick={() => setActive(i)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-left text-sm transition ${active === i ? 'border-harbor bg-harbor text-white' : 'border-mist bg-white hover:border-harbor/40'}`}>
              <span className="block text-xs opacity-75">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="font-semibold">{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </button>
          );
        })}
      </div>
      <ol className="space-y-3">
        {list.map((s) => (
          <li key={s._id || s.title + s.startTime} className="flex gap-4 rounded-xl border border-mist bg-white p-4">
            <div className="w-24 shrink-0 text-sm">
              <p className="font-bold">{fmtTime(s.startTime)}</p>
              <p className="text-harbor-500">to {fmtTime(s.endTime)}</p>
            </div>
            <div className="min-w-0 border-l-2 border-marigold pl-4">
              <p className="font-display text-base font-extrabold">{s.title}</p>
              {s.description && <p className="mt-1 text-sm text-harbor-500">{s.description}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-harbor-500">
                {s.speaker && <span className="flex items-center gap-1"><Mic2 className="h-4 w-4" /> {s.speaker}{s.speakerRole ? `, ${s.speakerRole}` : ''}</span>}
                {s.room && <span className="flex items-center gap-1"><DoorOpen className="h-4 w-4" /> {s.room}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
