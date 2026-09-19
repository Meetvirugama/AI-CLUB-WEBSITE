import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Edit, Trash2, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminMembers, useAdminProjects, MemberRecord, ProjectRecord } from './queries';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared utilities
// ──────────────────────────────────────────────────────────────────────────────

type ModalState<T> = { open: boolean; editing: T | null };

function useModalState<T>() {
  const [state, setState] = useState<ModalState<T>>({ open: false, editing: null });
  const open = (editing: T | null = null) => setState({ open: true, editing });
  const close = () => setState({ open: false, editing: null });
  return { ...state, open, close };
}

// ──────────────────────────────────────────────────────────────────────────────
// Members sub-section
// ──────────────────────────────────────────────────────────────────────────────

const MEMBER_ROLES = [
  'Convenor','Deputy Convenor','Core Member','Extended Core Member',
  'Member','Ex Convenor','Ex Deputy Convenor','Ex Core Member','Alumni',
];

type MemberForm = {
  name: string; role: string; photo: string; github: string;
  linkedin: string; description: string; order_no: number;
};

const EMPTY_MEMBER: MemberForm = {
  name: '', role: 'Core Member', photo: '', github: '', linkedin: '', description: '', order_no: 99,
};

function ManageMembers({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useAdminMembers();
  const modal = useModalState<MemberRecord>();
  const [form, setForm] = useState<MemberForm>(EMPTY_MEMBER);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const startAdd = () => { setForm(EMPTY_MEMBER); modal.open(null); };
  const startEdit = (m: MemberRecord) => {
    setForm({ name: m.name, role: m.role, photo: m.photo||'', github: m.github||'',
      linkedin: m.linkedin||'', description: m.description||'', order_no: m.order_no ?? 99 });
    modal.open(m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, order_no: Number(form.order_no) };
      const url = modal.editing ? getApiUrl(`/api/members/${modal.editing.id}`) : getApiUrl('/api/members');
      const method = modal.editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(modal.editing ? 'Member updated!' : 'Member added!', 'success');
      modal.close();
      qc.invalidateQueries({ queryKey: ['admin', 'members'] });
      qc.invalidateQueries({ queryKey: ['admin', 'supabaseCounts'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete Member', 'This will permanently delete the member.', async () => {
    const res = await fetch(getApiUrl(`/api/members/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Member deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'members'] }); qc.invalidateQueries({ queryKey: ['admin', 'supabaseCounts'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Manage Core Members</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="pl-7 pr-3 py-1.5 border border-border rounded-lg text-xs bg-background text-foreground outline-none focus:border-primary w-36" />
          </div>
          <button onClick={startAdd} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors whitespace-nowrap">
            Add New Member
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-12">{search ? 'No members match your search.' : 'No core members found. Click "Add New Member" to add one.'}</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr className="text-slate-700 text-xs uppercase tracking-wider font-semibold">
                <th className="p-3.5">Avatar</th><th className="p-3.5">Name</th><th className="p-3.5">Role</th>
                <th className="p-3.5">Links</th><th className="p-3.5">Order</th><th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {(m.name || 'M').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900">{m.name}</td>
                  <td className="p-3.5">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">{m.role}</span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-xs space-x-2">
                    {m.github && <a href={m.github} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">GitHub</a>}
                    {m.linkedin && <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">LinkedIn</a>}
                  </td>
                  <td className="p-3.5 text-slate-600 font-mono text-xs">{m.order_no}</td>
                  <td className="p-3.5 text-right space-x-1">
                    <button onClick={() => startEdit(m)} className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-flex items-center" title="Edit"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center" title="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={modal.close} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left">
            <h3 className="font-display font-extrabold text-foreground text-lg mb-2">{modal.editing ? 'Edit Member' : 'Add New Member'}</h3>
            <p className="text-xs text-muted-foreground mb-6">Configure details for the core AI Club member.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} placeholder="e.g. Parth Agrawal" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inp}>
                    {MEMBER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Order No</label>
                  <input type="number" value={form.order_no} onChange={e => setForm({...form, order_no: Number(e.target.value)})} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Photo URL</label>
                <input type="text" value={form.photo} onChange={e => setForm({...form, photo: e.target.value})} className={inp} placeholder="https://drive.google.com/thumbnail?id=..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">GitHub</label>
                  <input type="text" value={form.github} onChange={e => setForm({...form, github: e.target.value})} className={inp} placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">LinkedIn</label>
                  <input type="text" value={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.value})} className={inp} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Bio</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp + ' resize-none'} placeholder="Brief description…" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={modal.close} className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5">
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  {submitting ? 'Saving…' : 'Save Member'}
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
// Projects sub-section
// ──────────────────────────────────────────────────────────────────────────────

type ProjectForm = { title: string; author: string; author_id: string; description: string; tags: string; github_link: string; contributors: string; };
const EMPTY_PROJECT: ProjectForm = { title: '', author: '', author_id: '', description: '', tags: 'Machine Learning, Python', github_link: '', contributors: '' };

function ManageProjects({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useAdminProjects();
  const { data: members = [] } = useAdminMembers();
  const modal = useModalState<ProjectRecord>();
  const [form, setForm] = useState<ProjectForm>(EMPTY_PROJECT);
  const [submitting, setSubmitting] = useState(false);

  const startAdd = () => { setForm(EMPTY_PROJECT); modal.open(null); };
  const startEdit = (p: ProjectRecord) => {
    setForm({ title: p.title||'', author: p.author||'', author_id: String(p.author_id||''),
      description: p.description||'', tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      github_link: p.github_link||'', contributors: p.contributors||'' });
    modal.open(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const body = { ...form, tags: tagsArr, author_id: form.author_id ? Number(form.author_id) : null };
      const url = modal.editing ? getApiUrl(`/api/projects/${modal.editing.id}`) : getApiUrl('/api/projects');
      const method = modal.editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body), credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Request failed'); }
      showToast(modal.editing ? 'Project updated!' : 'Project added!', 'success');
      modal.close();
      qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
      qc.invalidateQueries({ queryKey: ['admin', 'supabaseCounts'] });
    } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id: number) => openConfirm('Delete Project', 'This will permanently delete the project.', async () => {
    const res = await fetch(getApiUrl(`/api/projects/${id}`), { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' });
    if (res.ok) { showToast('Project deleted.', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'projects'] }); qc.invalidateQueries({ queryKey: ['admin', 'supabaseCounts'] }); }
    else showToast('Delete failed.', 'error');
  }, true);

  const inp = 'w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold font-display text-foreground">Manage Projects</h2>
        <button onClick={startAdd} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors">
          Add New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No projects found. Click "Add New Project" to add one.</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <th className="p-3.5">Project Title</th><th className="p-3.5">Author</th>
                <th className="p-3.5">Tags</th><th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900">{p.title}</td>
                  <td className="p-3 text-slate-500">{p.author}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((tag) => (
                        <span key={tag} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono border border-indigo-100">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center" title="Edit"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center" title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={modal.close} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left">
            <h3 className="font-display font-extrabold text-foreground text-lg mb-2">{modal.editing ? 'Edit Project' : 'Add New Project'}</h3>
            <p className="text-xs text-muted-foreground mb-6">Configure details for the student-made AI Club project.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Project Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} placeholder="e.g. ShelfMind AI" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Author Name</label>
                  <input type="text" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className={inp} placeholder="e.g. Kush Patel" required />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Linked Member (Optional)</label>
                  <select value={form.author_id} onChange={e => setForm({...form, author_id: e.target.value})} className={inp}>
                    <option value="">Not linked</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">GitHub Repository Link</label>
                <input type="text" value={form.github_link} onChange={e => setForm({...form, github_link: e.target.value})} className={inp} placeholder="https://github.com/..." />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Contributors (Optional)</label>
                <input type="text" value={form.contributors} onChange={e => setForm({...form, contributors: e.target.value})} className={inp} placeholder="e.g. Anmol, Saumya" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className={inp} placeholder="Machine Learning, Python" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp + ' resize-none'} placeholder="What does the project do, tech stack, metrics…" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={modal.close} className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5">
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  {submitting ? 'Saving…' : 'Save Project'}
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
// Exported container that renders both sections with tab switching
// ──────────────────────────────────────────────────────────────────────────────

type Subtab = 'members' | 'projects';

export default function ManageMembersProjectsTab(props: Props) {
  const [subtab, setSubtab] = useState<Subtab>('members');
  return (
    <motion.div key="manageMembersProjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Subtab Pills */}
      <div className="flex gap-2 mb-6 border-b border-border pb-4">
        {(['members', 'projects'] as Subtab[]).map(t => (
          <button key={t} onClick={() => setSubtab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${subtab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
            {t}
          </button>
        ))}
      </div>
      {subtab === 'members' ? <ManageMembers {...props} /> : <ManageProjects {...props} />}
    </motion.div>
  );
}
