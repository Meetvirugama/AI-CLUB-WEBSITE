import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit, Trash2, Plus, Archive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminPastEvents, useAdminAchievements, PastEventRecord, AchievementRecord } from './queries';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Past Events
// ──────────────────────────────────────────────────────────────────────────────

type PastEventForm = {
  title: string; description: string; category: string; date_label: string;
  image_url: string; speaker: string; participants: string;
  sort_order: number; winners: string; winner_link: string;
};

const EMPTY_PAST: PastEventForm = {
  title: '', description: '', category: 'workshop', date_label: '',
  image_url: '', speaker: '', participants: '', sort_order: 0, winners: '', winner_link: '',
};

function PastEventsSection({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: pastEvents = [], isLoading } = useAdminPastEvents();
  const [editing, setEditing] = useState<PastEventRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PastEventForm>(EMPTY_PAST);
  const [submitting, setSubmitting] = useState(false);

  const startAdd = () => { setForm(EMPTY_PAST); setEditing(null); setOpen(true); };
  const startEdit = (pe: PastEventRecord) => {
    setForm({ title: pe.title||'', description: pe.description||'', category: pe.category||'workshop',
      date_label: pe.date_label||'', image_url: pe.image_url||'', speaker: pe.speaker||'',
      participants: pe.participants !== null && pe.participants !== undefined ? String(pe.participants) : '',
      sort_order: pe.sort_order ?? 0, winners: pe.winners||'', winner_link: pe.winner_link||'' });
    setEditing(pe); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, participants: form.participants ? Number(form.participants) : null, sort_order: Number(form.sort_order) };
      const url = editing ? getApiUrl(`/api/past-events/${editing.id}`) : getApiUrl('/api/past-events');
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editing ? 'Past event updated!' : 'Past event added!', 'success');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'pastEvents'] });
      qc.invalidateQueries({ queryKey: ['admin', 'supabaseCounts'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete Past Event', 'This will permanently delete this past event.', async () => {
    const res = await fetch(getApiUrl(`/api/past-events/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Past event deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'pastEvents'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Archive size={20} className="text-primary" /> Past Events Archive
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Events shown on the public website archive page (no registration data).</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors">
          <Plus size={14} /> Add Past Event
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : pastEvents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Archive size={36} className="text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No past events yet.</p>
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto border border-border/30 rounded-xl p-4 bg-background/40 shadow-inner custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastEvents.map((pe) => (
              <div key={pe.id} className="bg-secondary/20 border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors group">
                {pe.image_url && (
                  <div className="h-36 overflow-hidden">
                    <img src={pe.image_url} alt={pe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm leading-snug">{pe.title}</h3>
                        <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">Order: {pe.sort_order}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pe.date_label} · <span className="capitalize">{pe.category}</span>
                        {pe.participants ? ` · ${pe.participants}+ participants` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(pe)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Edit"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(pe.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {pe.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{pe.description}</p>}
                  {pe.speaker && <p className="text-[11px] text-primary/80 font-mono mt-1">Speaker: {pe.speaker}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editing ? 'Edit Past Event' : 'Add Past Event'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input className={inp} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Event title" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select className={inp} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {['workshop','hackathon','seminar','competition','bootcamp','webinar','other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date Label</label>
                  <input className={inp} value={form.date_label} onChange={e => setForm({...form, date_label: e.target.value})} placeholder="e.g. March 2025" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Participants</label>
                  <input type="number" className={inp} value={form.participants} onChange={e => setForm({...form, participants: e.target.value})} placeholder="e.g. 120" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                  <input type="number" className={inp} value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Speaker</label>
                <input className={inp} value={form.speaker} onChange={e => setForm({...form, speaker: e.target.value})} placeholder="Speaker name" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={3} className={inp} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief event summary" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input className={inp} value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Winners</label>
                  <input className={inp} value={form.winners} onChange={e => setForm({...form, winners: e.target.value})} placeholder="Winner names" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Winner Link</label>
                  <input className={inp} value={form.winner_link} onChange={e => setForm({...form, winner_link: e.target.value})} placeholder="https://..." /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center disabled:opacity-50">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : editing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Achievements section
// ──────────────────────────────────────────────────────────────────────────────

type AchievementForm = { title: string; student: string; description: string; category: string; icon: string; image_url: string; };
const EMPTY_ACH: AchievementForm = { title: '', student: '', description: '', category: '', icon: 'Award', image_url: '' };

function AchievementsSection({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: achievements = [], isLoading } = useAdminAchievements();
  const [editing, setEditing] = useState<AchievementRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AchievementForm>(EMPTY_ACH);
  const [submitting, setSubmitting] = useState(false);

  const startAdd = () => { setForm(EMPTY_ACH); setEditing(null); setOpen(true); };
  const startEdit = (a: AchievementRecord) => {
    setForm({ title: a.title||'', student: a.student||'', description: a.description||'', category: a.category||'', icon: a.icon||'Award', image_url: a.image_url||'' });
    setEditing(a); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? getApiUrl(`/api/achievements/${editing.id}`) : getApiUrl('/api/achievements');
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(form), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editing ? 'Achievement updated!' : 'Achievement added!', 'success');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'achievements'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete Achievement', 'This will permanently delete this achievement.', async () => {
    const res = await fetch(getApiUrl(`/api/achievements/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Achievement deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'achievements'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold font-display text-foreground">Manage Achievements</h2>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors">
          <Plus size={14} /> Add Achievement
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : achievements.length === 0 ? (
        <div className="bg-secondary/20 border border-border/50 rounded-xl p-8 text-center text-muted-foreground text-sm">
          No achievements added yet. Click 'Add Achievement' to create one.
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/40 text-xs uppercase font-mono text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th><th className="px-4 py-3 font-medium">Student/Team</th>
                <th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {achievements.map((ach) => (
                <tr key={ach.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{ach.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ach.student}</td>
                  <td className="px-4 py-3"><span className="bg-secondary px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider border border-border/50">{ach.category}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(ach)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(ach.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-display font-bold text-lg">{editing ? 'Edit Achievement' : 'Add New Achievement'}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Title</label>
                    <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} required /></div>
                  <div><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Student/Team Name</label>
                    <input value={form.student} onChange={e => setForm({...form, student: e.target.value})} className={inp} /></div>
                  <div><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Category</label>
                    <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inp} placeholder="e.g. Hackathon, Research" /></div>
                  <div className="col-span-2"><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Image URL</label>
                    <input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className={inp} /></div>
                  <div className="col-span-2"><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Icon</label>
                    <select value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} className={inp}>
                      {['Award','Trophy','Medal','Star'].map(i => <option key={i} value={i}>{i}</option>)}
                    </select></div>
                  <div className="col-span-2"><label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={inp + ' resize-none'} /></div>
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 mt-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex justify-center items-center gap-2">
                  {submitting ? 'Saving…' : 'Save Achievement'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Exported wrapper — Past Events + Achievements
// ──────────────────────────────────────────────────────────────────────────────

type Subtab = 'pastEvents' | 'achievements';

export default function PastEventsAchievementsTab(props: Props) {
  const [subtab, setSubtab] = useState<Subtab>('pastEvents');
  return (
    <motion.div key="pastEventsAchievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-2 mb-6 border-b border-border pb-4">
        {(['pastEvents', 'achievements'] as Subtab[]).map(t => (
          <button key={t} onClick={() => setSubtab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${subtab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
            {t === 'pastEvents' ? 'Past Events' : 'Achievements'}
          </button>
        ))}
      </div>
      {subtab === 'pastEvents' ? <PastEventsSection {...props} /> : <AchievementsSection {...props} />}
    </motion.div>
  );
}
