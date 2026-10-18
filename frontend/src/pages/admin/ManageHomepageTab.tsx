import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { DEFAULT_TOPICS, HOME_TOPICS_KEY, type HomeTopic } from '@/components/redesign/homeTopics';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, msg: string, onConfirm: () => Promise<void> | void, isDestructive?: boolean) => void;
}

const ADMIN_KEY = ['admin', 'home-topics'];
const DOT_COLORS = ['#3d6bff', '#22e0ff', '#3ef07a', '#ffe53d', '#ff9a2e', '#ff4d6a', '#ff4be0', '#9a6bff'];

async function send(path: string, method: string, body?: unknown) {
  const res = await fetch(getApiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(typeof d.detail === 'string' ? d.detail : 'Request failed');
  }
  return res.json();
}

export default function ManageHomepageTab({ showToast, openConfirm }: Props) {
  const qc = useQueryClient();
  const { data: topics = [], isLoading } = useQuery<HomeTopic[]>({
    queryKey: ADMIN_KEY,
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/admin/home-topics'), { credentials: 'include', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load topics');
      return res.json();
    },
  });
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ADMIN_KEY });
    qc.invalidateQueries({ queryKey: HOME_TOPICS_KEY });
  };

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  const nextOrder = () => (topics.length ? Math.max(...topics.map(t => t.order_no)) + 1 : 1);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    run(async () => {
      await send('/api/admin/home-topics', 'POST', { label, order_no: nextOrder(), is_active: true });
      setNewLabel('');
    }, 'Topic added');
  };

  const saveEdit = (t: HomeTopic) => {
    const label = editLabel.trim();
    if (!label || label === t.label) {
      setEditingId(null);
      return;
    }
    run(async () => {
      await send(`/api/admin/home-topics/${t.id}`, 'PUT', { label });
      setEditingId(null);
    }, 'Topic renamed');
  };

  const toggle = (t: HomeTopic) =>
    run(() => send(`/api/admin/home-topics/${t.id}`, 'PUT', { is_active: !t.is_active }), t.is_active ? 'Hidden from homepage' : 'Shown on homepage');

  // Swap order with the neighbour, then renumber everything 1..n so gaps/duplicates never accumulate.
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= topics.length) return;
    const reordered = [...topics];
    [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
    run(
      () => Promise.all(reordered.map((t, i) => (t.order_no === i + 1 ? null : send(`/api/admin/home-topics/${t.id}`, 'PUT', { order_no: i + 1 })))),
      'Order updated',
    );
  };

  const remove = (t: HomeTopic) =>
    openConfirm('Delete topic', `Remove "${t.label}" from the homepage strip?`, () => run(() => send(`/api/admin/home-topics/${t.id}`, 'DELETE'), 'Topic deleted'), true);

  const importDefaults = () =>
    run(() => Promise.all(DEFAULT_TOPICS.map((label, i) => send('/api/admin/home-topics', 'POST', { label, order_no: i + 1, is_active: true }))), 'Default topics imported');

  const visible = topics.filter(t => t.is_active);
  const preview = visible.length ? visible.map(t => t.label) : DEFAULT_TOPICS;
  const inp = 'w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground';

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Homepage strip</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">The scrolling line of topics under the About section on the homepage.</p>
      </div>

      {/* Live preview */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Preview</span>
          {!visible.length && <span className="normal-case tracking-normal">Showing the default list until you add topics</span>}
        </div>
        <div className="flex gap-8 overflow-x-auto whitespace-nowrap px-4 py-4 text-xl font-medium text-foreground [scrollbar-width:thin]">
          {preview.map((label, i) => (
            <span key={`${label}-${i}`} className="flex items-center gap-8">
              {label}
              <span style={{ color: DOT_COLORS[i % DOT_COLORS.length] }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={add} className="mb-6 flex gap-2">
        <input
          className={inp}
          placeholder="Add a topic, e.g. “GenAI Hackathon”"
          value={newLabel}
          maxLength={120}
          onChange={e => setNewLabel(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !newLabel.trim()}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 disabled:opacity-50"
        >
          <Plus size={18} /> Add
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center p-12 text-center text-muted-foreground">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p>Loading topics…</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="mb-1 text-lg font-medium">No topics yet</p>
            <p className="mb-5 text-sm">The homepage is using the built-in list. Import it to start editing, or add your own above.</p>
            <button
              type="button"
              onClick={importDefaults}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40 disabled:opacity-50"
            >
              Import current topics
            </button>
          </div>
        ) : (
          <ul>
            {topics.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT_COLORS[i % DOT_COLORS.length], opacity: t.is_active ? 1 : 0.3 }} />
                {editingId === t.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={e => {
                      e.preventDefault();
                      saveEdit(t);
                    }}
                  >
                    <input autoFocus className={inp} value={editLabel} maxLength={120} onChange={e => setEditLabel(e.target.value)} />
                    <button type="submit" aria-label="Save" className="rounded p-1.5 text-primary hover:bg-primary/10"><Check size={16} /></button>
                    <button type="button" aria-label="Cancel" onClick={() => setEditingId(null)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary/40"><X size={16} /></button>
                  </form>
                ) : (
                  <span className={`flex-1 font-medium ${t.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{t.label}</span>
                )}
                {editingId !== t.id && (
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button type="button" aria-label="Move down" disabled={busy || i === topics.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button type="button" aria-label={t.is_active ? 'Hide' : 'Show'} title={t.is_active ? 'Hide from homepage' : 'Show on homepage'} disabled={busy} onClick={() => toggle(t)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground">{t.is_active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                    <button type="button" aria-label="Rename" onClick={() => { setEditingId(t.id); setEditLabel(t.label); }} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"><Pencil size={16} /></button>
                    <button type="button" aria-label="Delete" disabled={busy} onClick={() => remove(t)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
