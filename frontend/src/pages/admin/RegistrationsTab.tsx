import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Download, Eye, Trash2, ChevronLeft,
  ChevronRight as ChevronRightIcon, Search, X,
  Pencil, Check, Users, User, Mail, Calendar,
  FileText, AlertTriangle
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminRegistrations } from './queries';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

interface RegistrationsTabProps {
  events: any[];
  selectedEventId: number | '';
  setSelectedEventId: (id: number | '') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  fetchRegistrationDetail: (regId: number) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// ── Inline Edit Modal ─────────────────────────────────────────────────────────
function EditModal({
  reg,
  onClose,
  onSave,
  showToast,
}: {
  reg: any;
  onClose: () => void;
  onSave: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [name, setName] = useState(reg.user_name || '');
  const [email, setEmail] = useState(reg.user_email || '');
  const [teamName, setTeamName] = useState(reg.team_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/registrations/${reg.id}`), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_name: name, user_email: email, team_name: teamName || null }),
      });
      if (res.ok) {
        showToast('Registration updated successfully.', 'success');
        onSave();
        onClose();
      } else {
        const err = await res.json();
        showToast('Update failed: ' + (err.detail || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Pencil size={14} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Edit Registration</h3>
              <p className="text-xs text-muted-foreground">ID #{reg.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500/60 transition-all"
                placeholder="Full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500/60 transition-all"
                placeholder="Email address"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Team Name <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500/60 transition-all"
                placeholder="Leave blank for individual"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RegistrationsTab({
  events,
  selectedEventId,
  setSelectedEventId,
  openConfirm,
  fetchRegistrationDetail,
  showToast
}: RegistrationsTabProps) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const limit = 50;

  const { data, isLoading } = useAdminRegistrations(selectedEventId, searchQuery, page, limit);
  const registrations = data?.registrations || [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total || 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    const ev = events.find(e => e.id === selectedEventId);
    const title = ev ? ev.title : `event_${selectedEventId}`;
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${selectedEventId}/export`), {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_registrations.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('CSV exported successfully.', 'success');
    } catch (e: any) {
      showToast('Failed to export CSV: ' + e.message, 'error');
    }
  };

  const handleDeleteRegistration = (reg: any) => {
    openConfirm(
      'Delete Registration',
      `Are you sure you want to permanently delete the registration for "${reg.user_name}"? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/registrations/${reg.id}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Registration deleted.', 'success');
            queryClient.invalidateQueries({ queryKey: ['admin', 'registrations'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboardMetrics'] });
          } else {
            const errData = await res.json();
            showToast('Deletion failed: ' + (errData.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      }
    );
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <>
      {/* Edit Modal */}
      <AnimatePresence>
        {editingReg && (
          <EditModal
            reg={editingReg}
            onClose={() => setEditingReg(null)}
            onSave={() => queryClient.invalidateQueries({ queryKey: ['admin', 'registrations'] })}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      <motion.div
        key="reg"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-full space-y-5"
      >
        {/* ── Top Controls ── */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Registration Management</h2>
              <p className="text-xs text-muted-foreground mt-0.5">View, edit, and manage event registrations</p>
            </div>

            {selectedEventId && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Event Selector */}
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(Number(e.target.value));
                  setPage(1);
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer pr-10 truncate"
              >
                <option value="" disabled>— Select an event —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
              <ChevronRightIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground rotate-90 pointer-events-none" />
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email…"
                  className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-foreground outline-none focus:border-indigo-500/50 w-52 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Search
              </button>
            </form>
          </div>

          {/* Stats bar */}
          {selectedEventId && !isLoading && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                <strong className="text-foreground">{total}</strong> total registrations
              </span>
              {searchQuery && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Filtered by &ldquo;<strong className="text-foreground">{searchQuery}</strong>&rdquo;
                  <button onClick={handleClearSearch} className="text-indigo-400 hover:underline ml-1">Clear</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {selectedEvent?.registration_link ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">External Registration Link</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              This event uses an external form. Internal registrations are disabled.
            </p>
            <a
              href={selectedEvent.registration_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-xs text-indigo-400 hover:underline"
            >
              {selectedEvent.registration_link}
            </a>
          </div>
        ) : !selectedEventId ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <FileText size={22} className="text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Select an Event</p>
            <p className="text-xs text-muted-foreground mt-1">Choose an event above to view its registrations.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16 flex-1">
            <Loader2 className="animate-spin text-indigo-400" size={28} />
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Users size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No registrations found</p>
            {searchQuery && (
              <button onClick={handleClearSearch} className="mt-3 text-xs text-indigo-400 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 border border-white/10 rounded-2xl overflow-hidden bg-[#090d16]/60 shadow-xl">
            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#0c1222]/95 backdrop-blur-sm border-b border-white/10">
                  <tr className="text-muted-foreground text-[11px] uppercase tracking-widest">
                    <th className="px-5 py-3.5 font-semibold w-10">#</th>
                    <th className="px-5 py-3.5 font-semibold">
                      <span className="flex items-center gap-1.5"><Calendar size={11} />Date</span>
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      <span className="flex items-center gap-1.5"><User size={11} />Name</span>
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      <span className="flex items-center gap-1.5"><Mail size={11} />Email</span>
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      <span className="flex items-center gap-1.5"><Users size={11} />Team</span>
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrations.map((reg: any, idx: number) => (
                    <motion.tr
                      key={reg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Index */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground/50 font-mono">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(reg.registered_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-sm text-foreground">{reg.user_name}</span>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {reg.user_email}
                      </td>

                      {/* Team badge */}
                      <td className="px-5 py-3.5">
                        {reg.team_name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                            <Users size={10} />
                            {reg.team_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-xs">
                            <User size={10} />
                            Individual
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View */}
                          <button
                            onClick={() => fetchRegistrationDetail(reg.id)}
                            title="View Details"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-sky-500/15 border border-transparent hover:border-sky-500/30 text-muted-foreground hover:text-sky-400 text-xs font-medium transition-all"
                          >
                            <Eye size={13} />
                            View
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditingReg(reg)}
                            title="Edit Registration"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-400 text-xs font-medium transition-all"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteRegistration(reg)}
                            title="Delete Registration"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 text-muted-foreground hover:text-red-400 text-xs font-medium transition-all"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-[#0c1222]/80 border-t border-white/10 px-5 py-3 flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground">
                Page <strong className="text-foreground">{page}</strong> of{' '}
                <strong className="text-foreground">{totalPages}</strong>
                <span className="text-muted-foreground/60"> · {total} total</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Next <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
