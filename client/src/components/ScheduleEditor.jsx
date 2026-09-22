import { Plus, Trash2 } from 'lucide-react';
import { toLocalInput } from '../lib/format';

export const blankSession = (base) => ({ title: '', speaker: '', speakerRole: '', room: '', description: '', startTime: base || '', endTime: base || '' });

/** Controlled editor. `sessions` use datetime-local strings; convert with fromLocalInput before sending. */
export default function ScheduleEditor({ sessions, onChange, baseDate }) {
  const set = (i, patch) => onChange(sessions.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-4">
      {sessions.map((s, i) => (
        <div key={i} className="rounded-xl border border-mist bg-chalk/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input sm:col-span-2" placeholder="Session title *" value={s.title} onChange={(e) => set(i, { title: e.target.value })} />
            <label className="text-xs font-semibold">Starts<input type="datetime-local" className="input mt-1" value={s.startTime} onChange={(e) => set(i, { startTime: e.target.value })} /></label>
            <label className="text-xs font-semibold">Ends<input type="datetime-local" className="input mt-1" value={s.endTime} onChange={(e) => set(i, { endTime: e.target.value })} /></label>
            <input className="input" placeholder="Speaker" value={s.speaker} onChange={(e) => set(i, { speaker: e.target.value })} />
            <input className="input" placeholder="Speaker role / company" value={s.speakerRole} onChange={(e) => set(i, { speakerRole: e.target.value })} />
            <input className="input" placeholder="Room / stage" value={s.room} onChange={(e) => set(i, { room: e.target.value })} />
            <input className="input" placeholder="Short description" value={s.description} onChange={(e) => set(i, { description: e.target.value })} />
          </div>
          <button type="button" className="mt-3 flex items-center gap-1 text-xs font-semibold text-danger" onClick={() => onChange(sessions.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-3.5 w-3.5" /> Remove session
          </button>
        </div>
      ))}
      <button type="button" className="btn-outline btn-sm" onClick={() => onChange([...sessions, blankSession(baseDate)])}><Plus className="h-4 w-4" /> Add session</button>
    </div>
  );
}

export const sessionsToForm = (list = []) => list.map((s) => ({ ...s, startTime: toLocalInput(s.startTime), endTime: toLocalInput(s.endTime), speaker: s.speaker || '', speakerRole: s.speakerRole || '', room: s.room || '', description: s.description || '' }));
