import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit, Trash2, Plus, Newspaper, BookOpen, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminNews, useAdminResources, NewsRecord, ResourceRecord } from './queries';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// News section
// ──────────────────────────────────────────────────────────────────────────────

type NewsForm = { title: string; description: string; link: string; sources: string; image_url: string; };
const EMPTY_NEWS: NewsForm = { title: '', description: '', link: '', sources: '', image_url: '' };

function ManageNewsSection({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: newsList = [], isLoading } = useAdminNews();
  const [editing, setEditing] = useState<NewsRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewsForm>(EMPTY_NEWS);
  const [submitting, setSubmitting] = useState(false);

  const startAdd = () => { setForm(EMPTY_NEWS); setEditing(null); setOpen(true); };
  const startEdit = (n: NewsRecord) => {
    setForm({ title: n.title || '', description: n.description || '', link: n.link || '', sources: n.sources || '', image_url: n.image_url || '' });
    setEditing(n); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? getApiUrl(`/api/news/${editing.id}`) : getApiUrl('/api/news');
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form), credentials: 'include',
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editing ? 'News updated!' : 'News added!', 'success');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'news'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete News', 'This will permanently delete this news item.', async () => {
    const res = await fetch(getApiUrl(`/api/news/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'news'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">News &amp; Affairs</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage news links and current affairs</p>
        </div>
        <button onClick={startAdd} className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} /> Add News
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading news…</p>
          </div>
        ) : newsList.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">No news items found</p>
            <p className="text-sm">Click 'Add News' to create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 py-3">Title</th>
                  <th className="p-4 py-3">Link</th>
                  <th className="p-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {newsList.map((n) => (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">{n.title || '—'}</td>
                    <td className="p-4 text-sm">
                      {n.link ? (
                        <a href={n.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {n.link.substring(0, 40)}{n.link.length > 40 ? '…' : ''}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(n)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(n.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{editing ? 'Edit News' : 'Add News'}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
              <div><label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} placeholder="Enter news title (optional)" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} className={inp} placeholder="Enter news description (optional)" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Link (LinkedIn, Article, etc.)</label>
                <input type="url" value={form.link} onChange={e => setForm({...form, link: e.target.value})} className={inp} placeholder="https://… (optional)" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Sources</label>
                <input type="text" value={form.sources} onChange={e => setForm({...form, sources: e.target.value})} className={inp} placeholder="Enter sources if any (optional)" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Image URL</label>
                <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className={inp} placeholder="Enter image URL (optional)" /></div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-secondary/60 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/95 transition-colors flex items-center justify-center disabled:opacity-50">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : editing ? 'Update News' : 'Add News'}
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
// Resources section
// ──────────────────────────────────────────────────────────────────────────────

type ResourceForm = { title: string; description: string; resource_type: string; url: string; group_name: string; order_no: number; };
const EMPTY_RESOURCE: ResourceForm = { title: '', description: '', resource_type: 'VIDEO', url: '', group_name: '', order_no: 0 };

function ManageResourcesSection({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: resourcesList = [], isLoading } = useAdminResources();
  const [editing, setEditing] = useState<ResourceRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ResourceForm>(EMPTY_RESOURCE);
  const [submitting, setSubmitting] = useState(false);

  const startAdd = () => { setForm(EMPTY_RESOURCE); setEditing(null); setOpen(true); };
  const startEdit = (r: ResourceRecord) => {
    setForm({ title: r.title||'', description: r.description||'', resource_type: r.resource_type||'VIDEO', url: r.url||'', group_name: r.group_name||'', order_no: r.order_no || 0 });
    setEditing(r); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editing ? getApiUrl(`/api/resources/${editing.id}`) : getApiUrl('/api/resources');
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...form, order_no: Number(form.order_no) }), credentials: 'include',
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(editing ? 'Resource updated!' : 'Resource added!', 'success');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'resources'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete Resource', 'This will permanently delete this resource.', async () => {
    const res = await fetch(getApiUrl(`/api/resources/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'resources'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manage Resources</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Add, edit, or remove curriculum topics and learning resources</p>
        </div>
        <button onClick={startAdd} className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-semibold">
          <Plus size={18} /> Add Resource
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading resources…</p>
          </div>
        ) : resourcesList.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">No resources found</p>
            <p className="text-sm">Click 'Add Resource' to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 py-3">Title</th>
                  <th className="p-4 py-3">Topic / Group</th>
                  <th className="p-4 py-3">Type</th>
                  <th className="p-4 py-3">Order</th>
                  <th className="p-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resourcesList.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">{r.description}</div>
                    </td>
                    <td className="p-4 text-foreground text-sm font-semibold">{r.group_name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">{r.resource_type}</span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{r.order_no}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(r)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{editing ? 'Edit Resource' : 'Add Resource'}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
              <div><label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} placeholder="Enter resource title" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={inp} placeholder="Enter short description" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-foreground mb-1">Resource Type</label>
                  <select value={form.resource_type} onChange={e => setForm({...form, resource_type: e.target.value})} className={inp}>
                    {['VIDEO','COURSE','BOOK','PAPER'].map(t => <option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-foreground mb-1">Order No</label>
                  <input type="number" value={form.order_no} onChange={e => setForm({...form, order_no: parseInt(e.target.value) || 0})} className={inp} placeholder="0" /></div>
              </div>
              <div><label className="block text-sm font-medium text-foreground mb-1">URL (Resource Link)</label>
                <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className={inp} placeholder="https://…" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Topic / Group Name</label>
                <input type="text" value={form.group_name} onChange={e => setForm({...form, group_name: e.target.value})} className={inp} placeholder="e.g. Start Here, Neural Networks" required /></div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-secondary/60 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/95 transition-colors flex items-center justify-center disabled:opacity-50">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : editing ? 'Update Resource' : 'Add Resource'}
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
// Export
// ──────────────────────────────────────────────────────────────────────────────

type Subtab = 'news' | 'resources';

export default function ManageNewsResourcesTab(props: Props) {
  const [subtab, setSubtab] = useState<Subtab>('news');
  return (
    <motion.div key="manageNewsResources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-2 mb-6 border-b border-border pb-4">
        {(['news', 'resources'] as Subtab[]).map(t => (
          <button key={t} onClick={() => setSubtab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${subtab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
            {t === 'news' ? 'News & Affairs' : 'Resources'}
          </button>
        ))}
      </div>
      {subtab === 'news' ? <ManageNewsSection {...props} /> : <ManageResourcesSection {...props} />}
    </motion.div>
  );
}
