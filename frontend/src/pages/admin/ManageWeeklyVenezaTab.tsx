import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit, Trash2, Plus, Calendar, Link2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminWeeklyVeneza, WeekRecord, WeeklyResource } from './queries';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

type WeekForm = { week_number: number; title: string; description: string; target_date: string; is_current: boolean; status: string; order_no: number; };
type WeekResourceForm = { week_id: number; title: string; description: string; resource_type: string; url: string; est_minutes: number; order_no: number; };

const EMPTY_WEEK: WeekForm = { week_number: 1, title: '', description: '', target_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], is_current: false, status: 'active', order_no: 1 };
const EMPTY_RES: WeekResourceForm = { week_id: 0, title: '', description: '', resource_type: 'VIDEO', url: '', est_minutes: 45, order_no: 1 };

export default function ManageWeeklyVenezaTab({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: weeks = [], isLoading } = useAdminWeeklyVeneza();

  // Week modal
  const [weekModal, setWeekModal] = useState(false);
  const [editingWeek, setEditingWeek] = useState<WeekRecord | null>(null);
  const [weekForm, setWeekForm] = useState<WeekForm>(EMPTY_WEEK);

  // Resource modal
  const [resModal, setResModal] = useState(false);
  const [editingRes, setEditingRes] = useState<WeeklyResource | null>(null);
  const [resForm, setResForm] = useState<WeekResourceForm>(EMPTY_RES);
  const [weekSubmitting, setWeekSubmitting] = useState(false);
  const [resSubmitting, setResSubmitting] = useState(false);

  const openAddWeek = () => {
    setEditingWeek(null);
    setWeekForm({ ...EMPTY_WEEK, week_number: weeks.length + 1, order_no: weeks.length + 1, is_current: weeks.length === 0 });
    setWeekModal(true);
  };

  const openEditWeek = (w: WeekRecord) => {
    setEditingWeek(w);
    setWeekForm({ week_number: w.week_number, title: w.title, description: w.description||'',
      target_date: w.target_date ? w.target_date.slice(0,10) : '', is_current: w.is_current,
      status: w.status||'active', order_no: w.order_no ?? w.week_number });
    setWeekModal(true);
  };

  const openAddRes = (weekId: number, resCount: number) => {
    setEditingRes(null);
    setResForm({ ...EMPTY_RES, week_id: weekId, order_no: resCount + 1 });
    setResModal(true);
  };

  const openEditRes = (res: WeeklyResource, weekId: number) => {
    setEditingRes(res);
    setResForm({ week_id: weekId, title: res.title, description: res.description||'',
      resource_type: res.resource_type, url: res.url, est_minutes: res.est_minutes ?? 45, order_no: res.order_no ?? 1 });
    setResModal(true);
  };

  const handleSaveWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    setWeekSubmitting(true);
    try {
      const url = editingWeek ? getApiUrl(`/api/weekly-veneza/${editingWeek.id}`) : getApiUrl('/api/weekly-veneza');
      const method = editingWeek ? 'PUT' : 'POST';
      const body = { ...weekForm, target_date: weekForm.target_date || null };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editingWeek ? 'Week updated!' : 'Week created!', 'success');
      setWeekModal(false);
      qc.invalidateQueries({ queryKey: ['admin', 'weeklyVeneza'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setWeekSubmitting(false); }
  };

  const handleDeleteWeek = (id: number) => openConfirm('Delete Week', 'This will permanently delete the week and all its resources.', async () => {
    const res = await fetch(getApiUrl(`/api/weekly-veneza/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Week deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'weeklyVeneza'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const handleSetCurrentWeek = async (week: WeekRecord) => {
    const res = await fetch(getApiUrl(`/api/weekly-veneza/${week.id}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ ...week, is_current: true }), credentials: 'include',
    });
    if (res.ok) { showToast(`Week ${week.week_number} set as current.`, 'success'); qc.invalidateQueries({ queryKey: ['admin', 'weeklyVeneza'] }); }
    else showToast('Failed to set current week.', 'error');
  };

  const handleSaveRes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.week_id) { showToast('Please select a week.', 'error'); return; }
    setResSubmitting(true);
    try {
      const url = editingRes ? getApiUrl(`/api/weekly-veneza/resources/${editingRes.id}`) : getApiUrl('/api/weekly-veneza/resources');
      const method = editingRes ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ ...resForm, est_minutes: Number(resForm.est_minutes), order_no: Number(resForm.order_no) }), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editingRes ? 'Resource updated!' : 'Resource added!', 'success');
      setResModal(false);
      qc.invalidateQueries({ queryKey: ['admin', 'weeklyVeneza'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setResSubmitting(false); }
  };

  const handleDeleteRes = (resId: number) => openConfirm('Delete Resource', 'This will permanently delete this resource from the week.', async () => {
    const res = await fetch(getApiUrl(`/api/weekly-veneza/resources/${resId}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Resource deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'weeklyVeneza'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-400';

  return (
    <motion.div key="manageWeeklyVeneza" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Weekly Veneza Curriculum</h2>
          <p className="text-slate-500">Create, edit, and organize weekly learning resources &amp; set active ticking week</p>
        </div>
        <button onClick={openAddWeek} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm text-sm font-semibold">
          <Plus size={18} /> Add New Week
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
          <p className="font-medium">Loading Weekly Veneza…</p>
        </div>
      ) : weeks.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 mb-1">No weeks configured yet</p>
          <p className="text-sm text-slate-400">Click 'Add New Week' to set up your first Weekly Veneza curriculum.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => (
            <div key={week.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${week.is_current ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'}`}>
              {/* Week Header */}
              <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${week.is_current ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'}`}>
                    Week {week.week_number}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-900">{week.title}</h3>
                      {week.is_current && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">Active Clock Ticking</span>}
                    </div>
                    {week.description && <p className="text-xs text-slate-500 mt-0.5">{week.description}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!week.is_current && (
                    <button onClick={() => handleSetCurrentWeek(week)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200">
                      Set Current Week
                    </button>
                  )}
                  <button onClick={() => openAddRes(week.id, week.resources?.length || 0)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                    <Plus size={14} /> Add Resource
                  </button>
                  <button onClick={() => openEditWeek(week)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteWeek(week.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* Resources */}
              <div className="p-4 bg-white">
                {(!week.resources || week.resources.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No resources added to Week {week.week_number} yet.</p>
                ) : (
                  <div className="space-y-2">
                    {week.resources.map((res) => (
                      <div key={res.id} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded border border-indigo-200">{res.resource_type}</span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{res.title}</h4>
                            <p className="text-xs text-slate-500 truncate max-w-lg">{res.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">{res.est_minutes} mins</span>
                          <a href={res.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600"><Link2 size={14} /></a>
                          <button onClick={() => openEditRes(res, week.id)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteRes(res.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Week Modal */}
      {weekModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setWeekModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editingWeek ? `Edit Week ${editingWeek.week_number}` : 'Add New Week'}</h3>
              <button onClick={() => setWeekModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveWeek} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Number</label>
                  <input type="number" value={weekForm.week_number} onChange={e => setWeekForm({...weekForm, week_number: parseInt(e.target.value)||1})} className={inp} required /></div>
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order No</label>
                  <input type="number" value={weekForm.order_no} onChange={e => setWeekForm({...weekForm, order_no: parseInt(e.target.value)||1})} className={inp} /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Title</label>
                <input type="text" value={weekForm.title} onChange={e => setWeekForm({...weekForm, title: e.target.value})} className={inp} placeholder="e.g. Week 1: Foundations of Neural Networks" required /></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea value={weekForm.description} onChange={e => setWeekForm({...weekForm, description: e.target.value})} rows={3} className={inp + ' resize-none'} placeholder="Short summary of this week's goals" /></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Date / Deadline (For Ticking Clock)</label>
                <input type="datetime-local" value={weekForm.target_date ? weekForm.target_date.slice(0,16) : ''} onChange={e => setWeekForm({...weekForm, target_date: e.target.value})} className={inp} /></div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="is_current_chk" checked={weekForm.is_current} onChange={e => setWeekForm({...weekForm, is_current: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="is_current_chk" className="text-sm font-bold text-slate-800">Set as Current Active Week (Ticking Clock Highlight)</label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setWeekModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={weekSubmitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {weekSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {editingWeek ? 'Update Week' : 'Create Week'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {resModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editingRes ? 'Edit Weekly Resource' : 'Add Resource to Week'}</h3>
              <button onClick={() => setResModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveRes} className="p-6 space-y-4 text-left">
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Week</label>
                <select value={resForm.week_id} onChange={e => setResForm({...resForm, week_id: parseInt(e.target.value)})} className={inp} required>
                  <option value={0}>Select a Week…</option>
                  {weeks.map(w => <option key={w.id} value={w.id}>Week {w.week_number}: {w.title}</option>)}
                </select></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource Title</label>
                <input type="text" value={resForm.title} onChange={e => setResForm({...resForm, title: e.target.value})} className={inp} placeholder="e.g. 3Blue1Brown — Neural Networks" required /></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea value={resForm.description} onChange={e => setResForm({...resForm, description: e.target.value})} rows={3} className={inp + ' resize-none'} placeholder="Why this resource is valuable and key takeaways" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource Type</label>
                  <select value={resForm.resource_type} onChange={e => setResForm({...resForm, resource_type: e.target.value})} className={inp}>
                    {['VIDEO','COURSE','BOOK','PAPER','ARTICLE','CODE'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Est. Minutes</label>
                  <input type="number" value={resForm.est_minutes} onChange={e => setResForm({...resForm, est_minutes: parseInt(e.target.value)||45})} className={inp} /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource URL</label>
                <input type="url" value={resForm.url} onChange={e => setResForm({...resForm, url: e.target.value})} className={inp} placeholder="https://…" required /></div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setResModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={resSubmitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {resSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {editingRes ? 'Update Resource' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
