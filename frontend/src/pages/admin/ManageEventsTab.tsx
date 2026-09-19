import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminEvents, AdminEvent } from './queries';
import { getApiUrl } from '../../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

const EVENT_STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  registration_open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  registration_closed: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  registration_open: 'Open',
  registration_closed: 'Reg. Closed',
  completed: 'Completed',
};

const parseLocalDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return trimmed;
};

const parseLocalDateTime = (s: string | null | undefined): string | null => {
  if (!s?.trim()) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return new Date(t).toISOString();
  const parsed = new Date(t);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return t;
};

type EditForm = {
  title: string; description: string; banner: string; category: string;
  venue: string; contact_email: string; event_type: 'individual' | 'team';
  min_team_size: number; max_team_size: number; event_start_date: string;
  event_end_date: string; start_time: string; end_time: string;
  registration_start: string; registration_end: string;
  winners: string; winner_link: string; registration_link: string;
};

const EMPTY_FORM: EditForm = {
  title: '', description: '', banner: '', category: 'workshop',
  venue: '', contact_email: 'ai_club@dau.ac.in', event_type: 'individual',
  min_team_size: 2, max_team_size: 4, event_start_date: '', event_end_date: '',
  start_time: '18:00:00', end_time: '21:00:00', registration_start: '',
  registration_end: '', winners: '', winner_link: '', registration_link: '',
};

export default function ManageEventsTab({ showToast, openConfirm }: Props) {
  const { data: events = [], isLoading, refetch } = useAdminEvents();
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = events.filter(ev =>
    !search || ev.title.toLowerCase().includes(search.toLowerCase()) ||
    (ev.venue as string | undefined)?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartEdit = (ev: AdminEvent) => {
    setEditingEvent(ev);
    setEditForm({
      title: (ev.title as string) || '',
      description: (ev.description as string) || '',
      banner: (ev.banner as string) || '',
      category: (ev.category as string) || 'workshop',
      venue: (ev.venue as string) || '',
      contact_email: (ev.contact_email as string) || 'ai_club@dau.ac.in',
      event_type: ((ev.event_type as string) || 'individual') as 'individual' | 'team',
      min_team_size: (ev.min_team_size as number) || 2,
      max_team_size: (ev.max_team_size as number) || 4,
      event_start_date: (ev.event_start_date as string) || (ev.event_date as string) || '',
      event_end_date: (ev.event_end_date as string) || (ev.event_date as string) || '',
      start_time: (ev.start_time as string) || '18:00:00',
      end_time: (ev.end_time as string) || '21:00:00',
      registration_start: ev.registration_start ? new Date(ev.registration_start as string).toISOString().slice(0, 16) : '',
      registration_end: ev.registration_end ? new Date(ev.registration_end as string).toISOString().slice(0, 16) : '',
      winners: (ev.winners as string) || '',
      winner_link: (ev.winner_link as string) || '',
      registration_link: (ev.registration_link as string) || '',
    });
  };

  const handleDelete = (eventId: number) => {
    openConfirm(
      'Delete Event',
      'Are you sure you want to delete this event? All registrations and form schemas will be permanently deleted.',
      async () => {
        const res = await fetch(getApiUrl(`/api/admin/events/${eventId}`), {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        });
        if (res.ok) {
          showToast('Event deleted successfully.', 'success');
          queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboardMetrics'] });
        } else {
          const d = await res.json().catch(() => ({}));
          showToast('Deletion failed: ' + (d.detail || 'Server error'), 'error');
        }
      }, true,
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setIsSubmitting(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        banner: editForm.banner ? editForm.banner.trim() : null,
        category: editForm.category,
        venue: editForm.venue.trim(),
        contact_email: editForm.contact_email.trim(),
        event_type: editForm.event_type,
        min_team_size: editForm.event_type === 'team' ? Number(editForm.min_team_size) : null,
        max_team_size: editForm.event_type === 'team' ? Number(editForm.max_team_size) : null,
        event_date: parseLocalDate(editForm.event_start_date),
        event_start_date: parseLocalDate(editForm.event_start_date),
        event_end_date: parseLocalDate(editForm.event_end_date),
        start_time: editForm.start_time.split(':').length === 2 ? `${editForm.start_time}:00` : editForm.start_time,
        end_time: editForm.end_time.split(':').length === 2 ? `${editForm.end_time}:00` : editForm.end_time,
        registration_start: parseLocalDateTime(editForm.registration_start),
        registration_end: parseLocalDateTime(editForm.registration_end),
        winners: editForm.winners.trim() || null,
        winner_link: editForm.winner_link.trim() || null,
        registration_link: editForm.registration_link.trim() || null,
      };
      const res = await fetch(getApiUrl(`/api/admin/events/${editingEvent.id}`), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(data.detail)
          ? data.detail.map((err: any) => `${err.loc.slice(1).join('.')}: ${err.msg}`).join(', ')
          : (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
        throw new Error(errMsg || 'Failed to update event');
      }
      showToast('Event updated successfully!', 'success');
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboardMetrics'] });
    } catch (err: any) {
      showToast(err.message || 'Error updating event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-colors';

  return (
    <motion.div key="manageEvents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900">Manage Events</h2>
          <p className="text-xs text-slate-500 mt-0.5">{events.length} total event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 outline-none focus:border-indigo-400 w-40"
          />
          <button onClick={() => refetch()} className="text-xs text-indigo-600 font-semibold hover:underline whitespace-nowrap">
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-12">
          {search ? 'No events match your search.' : 'No events found. Create one in "Create Event".'}
        </p>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-3.5">Event Title</th>
                  <th className="p-3.5">Dates</th>
                  <th className="p-3.5">Venue</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900 max-w-[200px]">
                      <span className="truncate block" title={ev.title}>{ev.title}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 text-xs">
                      {ev.event_start_date && ev.event_end_date && ev.event_start_date !== ev.event_end_date
                        ? `${ev.event_start_date} → ${ev.event_end_date}`
                        : ev.event_start_date || ev.event_date || '—'}
                    </td>
                    <td className="p-3.5 text-slate-500 text-xs max-w-[130px] truncate" title={ev.venue}>{ev.venue || '—'}</td>
                    <td className="p-3.5 capitalize text-xs text-slate-600">{ev.event_type || '—'}</td>
                    <td className="p-3.5">
                      {ev.status ? (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${EVENT_STATUS_COLORS[ev.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {STATUS_LABELS[ev.status] || ev.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                          {ev.category}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(ev)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit Event"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingEvent(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">Edit Event</h3>
              <button onClick={() => setEditingEvent(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Title *</label>
                <input className={inp} value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Category</label>
                  <select className={inp} value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                    {['workshop','hackathon','seminar','competition','bootcamp','webinar','other'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Event Type</label>
                  <select className={inp} value={editForm.event_type} onChange={e => setEditForm({...editForm, event_type: e.target.value as 'individual'|'team'})}>
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>
              {editForm.event_type === 'team' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Min Team Size</label>
                    <input type="number" className={inp} value={editForm.min_team_size} onChange={e => setEditForm({...editForm, min_team_size: Number(e.target.value)})} min={1} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Max Team Size</label>
                    <input type="number" className={inp} value={editForm.max_team_size} onChange={e => setEditForm({...editForm, max_team_size: Number(e.target.value)})} min={1} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Start Date</label>
                  <input type="date" className={inp} value={editForm.event_start_date} onChange={e => setEditForm({...editForm, event_start_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">End Date</label>
                  <input type="date" className={inp} value={editForm.event_end_date} onChange={e => setEditForm({...editForm, event_end_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Start Time</label>
                  <input type="time" className={inp} value={editForm.start_time.slice(0,5)} onChange={e => setEditForm({...editForm, start_time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">End Time</label>
                  <input type="time" className={inp} value={editForm.end_time.slice(0,5)} onChange={e => setEditForm({...editForm, end_time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Venue</label>
                <input className={inp} value={editForm.venue} onChange={e => setEditForm({...editForm, venue: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Contact Email</label>
                <input type="email" className={inp} value={editForm.contact_email} onChange={e => setEditForm({...editForm, contact_email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reg. Opens</label>
                  <input type="datetime-local" className={inp} value={editForm.registration_start} onChange={e => setEditForm({...editForm, registration_start: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reg. Closes</label>
                  <input type="datetime-local" className={inp} value={editForm.registration_end} onChange={e => setEditForm({...editForm, registration_end: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Description</label>
                <textarea className={inp} rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Banner URL</label>
                <input className={inp} value={editForm.banner} onChange={e => setEditForm({...editForm, banner: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Winners</label>
                  <input className={inp} value={editForm.winners} onChange={e => setEditForm({...editForm, winners: e.target.value})} placeholder="Winner names" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Winner Link</label>
                  <input className={inp} value={editForm.winner_link} onChange={e => setEditForm({...editForm, winner_link: e.target.value})} placeholder="https://…" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">External Registration Link (disables form builder)</label>
                <input className={inp} value={editForm.registration_link} onChange={e => setEditForm({...editForm, registration_link: e.target.value})} placeholder="https://forms.google.com/…" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingEvent(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
