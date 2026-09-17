import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, Eye, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
  const limit = 50;

  const { data, isLoading } = useAdminRegistrations(selectedEventId, searchQuery, page, limit);
  const registrations = data?.registrations || [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total || 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1); // Reset to page 1 on new search
  };

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    const ev = events.find(e => e.id === selectedEventId);
    const title = ev ? ev.title : `event_${selectedEventId}`;
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${selectedEventId}/export`), { headers: getAuthHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\\s+/g, '_')}_registrations.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('CSV exported successfully.', 'success');
    } catch (e: any) {
      showToast('Failed to export CSV: ' + e.message, 'error');
    }
  };

  const handleDeleteRegistration = (regId: number) => {
    openConfirm(
      'Delete Registration',
      'Are you sure you want to delete this registration? All responses, teams, and files will be permanently deleted.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/registrations/${regId}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Registration deleted successfully.', 'success');
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

  return (
    <motion.div key="reg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <h2 className="text-xl font-bold font-display">Registrations</h2>
        
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(Number(e.target.value));
              setPage(1);
            }}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="" disabled>Select Event...</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none w-56"
            />
            <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors">Search</button>
          </form>

          {selectedEventId && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg hover:bg-green-500 hover:text-white transition-all"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      </div>
      
      {events.find(e => e.id === selectedEventId)?.registration_link ? (
        <div className="bg-secondary/20 p-8 rounded-xl text-center border border-border mt-4 shrink-0">
          <p className="text-muted-foreground text-sm">
            This event uses an external registration link: <a href={events.find(e => e.id === selectedEventId)?.registration_link!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{events.find(e => e.id === selectedEventId)?.registration_link}</a>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Internal registrations are disabled. To re-enable them, edit the event and remove the external link.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12 flex-1"><Loader2 className="animate-spin text-primary" /></div>
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
          <p className="text-muted-foreground">No registrations found for this event.</p>
          {searchQuery && (
            <button onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }} className="mt-3 text-xs text-primary hover:underline">
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 border border-border/30 rounded-xl bg-[#090d16]/40 shadow-inner overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0c1222] z-10 border-b border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="p-3.5 font-semibold">Date</th>
                  <th className="p-3.5 font-semibold">Name</th>
                  <th className="p-3.5 font-semibold">Email</th>
                  <th className="p-3.5 font-semibold">Team Name</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/20">
                {registrations.map((reg: any) => (
                  <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-xs text-muted-foreground">{new Date(reg.registered_at).toLocaleDateString()}</td>
                    <td className="p-3.5 font-medium text-foreground">{reg.user_name}</td>
                    <td className="p-3.5 text-muted-foreground text-xs">{reg.user_email}</td>
                    <td className="p-3.5 font-mono text-xs text-foreground/80">{reg.team_name || 'Individual'}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => fetchRegistrationDetail(reg.id)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors mr-1.5"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRegistration(reg.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete Registration"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="bg-[#0c1222] border-t border-border/50 p-3 flex items-center justify-between shrink-0">
             <div className="text-xs text-muted-foreground">
               Showing page {page} of {totalPages} ({total} total)
             </div>
             <div className="flex gap-2">
               <button 
                 disabled={page === 1}
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 className="p-1.5 rounded-lg bg-secondary/50 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
               >
                 <ChevronLeft size={16} />
               </button>
               <button 
                 disabled={page >= totalPages}
                 onClick={() => setPage(p => p + 1)}
                 className="p-1.5 rounded-lg bg-secondary/50 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
               >
                 <ChevronRightIcon size={16} />
               </button>
             </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
