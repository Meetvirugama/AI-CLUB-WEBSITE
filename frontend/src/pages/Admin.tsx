/**
 * Admin.tsx — Shell Component (~500 lines)
 *
 * Responsibilities:
 *  - Auth guard (admin-only)
 *  - Sidebar navigation
 *  - Global toast + confirmation modal
 *  - Shared state that crosses tabs (selectedEventId, builderEventId, registration detail modal)
 *  - Form builder tab (kept here due to close coupling with event/field state)
 *
 * Each content tab is extracted into its own file under ./admin/
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Calendar, Users, Newspaper, Clipboard, Edit, FileText,
  Archive, Plus, ArrowUp, ArrowDown, LayoutDashboard, LogOut,
  Bot, BarChart2, Clock, Trash2,
} from 'lucide-react';

import Navbar from '@/components/club/Navbar';
import Footer from '@/components/club/Footer';

import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../lib/api';

import DashboardTab from './admin/DashboardTab';
import RegistrationsTab from './admin/RegistrationsTab';
import CreateEventTab from './admin/CreateEventTab';
import ManageEventsTab from './admin/ManageEventsTab';
import ManageMembersProjectsTab from './admin/ManageMembersProjectsTab';
import PastEventsAchievementsTab from './admin/PastEventsAchievementsTab';
import ManageNewsResourcesTab from './admin/ManageNewsResourcesTab';
import ManageWeeklyVenezaTab from './admin/ManageWeeklyVenezaTab';
import ChatbotAnalytics from '../chatbot/ChatbotAnalytics';
import AnalyticsTab from './admin/AnalyticsTab';
import { useAdminEvents } from './admin/queries';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab =
  | 'dashboard' | 'registrations' | 'createEvent' | 'formBuilder'
  | 'manageEvents' | 'manageMembers' | 'pastEvents'
  | 'manageNews' | 'manageWeeklyVeneza' | 'chatbotAnalytics' | 'analytics';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

// ─── Navigation Config ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',         label: 'Dashboard',           icon: <LayoutDashboard size={16} />,  section: 'Overview' },
  { id: 'registrations',     label: 'Registrations',       icon: <Clipboard size={16} />,        section: 'Events' },
  { id: 'createEvent',       label: 'Create Event',        icon: <Plus size={16} />,             section: 'Events' },
  { id: 'formBuilder',       label: 'Form Builder',        icon: <Edit size={16} />,             section: 'Events' },
  { id: 'manageEvents',      label: 'Manage Events',       icon: <Calendar size={16} />,         section: 'Events' },
  { id: 'manageMembers',     label: 'Members & Projects',  icon: <Users size={16} />,            section: 'Content' },
  { id: 'pastEvents',        label: 'Past Events & Achievements', icon: <Archive size={16} />,   section: 'Content' },
  { id: 'manageNews',        label: 'News & Resources',    icon: <Newspaper size={16} />,        section: 'Content' },
  { id: 'manageWeeklyVeneza',label: 'Weekly Veneza',       icon: <Clock size={16} />,            section: 'Content' },
  { id: 'chatbotAnalytics',  label: 'Chatbot Analytics',   icon: <Bot size={16} />,             section: 'Analytics' },
  { id: 'analytics',         label: 'Site Analytics',      icon: <BarChart2 size={16} />,        section: 'Analytics' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Admin = () => {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Shared cross-tab state ──────────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<number | ''>('');
  const [builderEventId, setBuilderEventId] = useState<number | ''>('');

  // Registration detail modal (opened from RegistrationsTab)
  const [selectedRegId, setSelectedRegId] = useState<number | null>(null);
  const [selectedRegDetail, setSelectedRegDetail] = useState<any | null>(null);
  const [loadingRegDetail, setLoadingRegDetail] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false, message: '', type: 'info',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 4000);
  };

  // ── Confirm modal ───────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string;
    onConfirm: () => Promise<void> | void; isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false });
  const [isConfirming, setIsConfirming] = useState(false);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void, isDestructive = false) =>
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDestructive });

  // ── Form builder state (kept here; FormBuilder shares events list) ──────────
  const { data: events = [] } = useAdminEvents();
  const [builderFields, setBuilderFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [fieldMessage, setFieldMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkAddJson, setBulkAddJson] = useState('');
  const [newField, setNewField] = useState({
    label: '', field_type: 'text', placeholder: '', required: false,
    options: '', file_max_size_kb: 5120, file_allowed_types: 'image/*,application/pdf', order_no: 0,
  });

  // ── Auto-select first event for selectors once events load ─────────────────
  useEffect(() => {
    if (events.length > 0) {
      if (!selectedEventId) setSelectedEventId(events[0].id);
      if (!builderEventId) setBuilderEventId(events[0].id);
    }
  }, [events]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-mono">Verifying admin session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  // ── Form-builder helpers ───────────────────────────────────────────────────

  const fetchFormFields = async (eventId: number | '') => {
    if (!eventId) return;
    setLoadingFields(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${eventId}/form-fields`), {
        headers: getAuthHeaders(), credentials: 'include',
      });
      const data = await res.json();
      setBuilderFields(res.ok ? (data.fields || []) : []);
    } catch { setBuilderFields([]); }
    finally { setLoadingFields(false); }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderEventId) return;
    setAddingField(true); setFieldMessage(null);
    try {
      const choiceTypes = ['dropdown', 'radio', 'checkbox'];
      const isChoice = choiceTypes.includes(newField.field_type);
      const isFile = newField.field_type === 'file';
      let parsedOptions: string[] | null = null;
      if (isChoice) {
        parsedOptions = newField.options.split(',').map(o => o.trim()).filter(Boolean);
        if (parsedOptions.length < 2) throw new Error('Choice fields require at least 2 options.');
      }
      const payload = {
        label: newField.label.trim(), field_type: newField.field_type,
        placeholder: newField.placeholder.trim() || null, required: newField.required,
        options: parsedOptions, order_no: Number(newField.order_no),
        file_max_size_kb: isFile ? Number(newField.file_max_size_kb) : null,
        file_allowed_types: isFile ? newField.file_allowed_types.trim() || null : null,
      };
      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields`), {
        method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload), credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(data.detail)
          ? data.detail.map((err: any) => `${err.loc.slice(1).join('.')}: ${err.msg}`).join(', ')
          : (data.detail || 'Failed to add form field');
        throw new Error(errMsg);
      }
      setFieldMessage({ type: 'success', text: 'Form field added successfully!' });
      const nextOrder = builderFields.length > 0 ? Math.max(...builderFields.map(f => f.order_no)) + 10 : 0;
      setNewField({ label: '', field_type: 'text', placeholder: '', required: false, options: '', file_max_size_kb: 5120, file_allowed_types: 'image/*,application/pdf', order_no: nextOrder });
      fetchFormFields(builderEventId);
    } catch (err: any) { setFieldMessage({ type: 'error', text: err.message }); }
    finally { setAddingField(false); }
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm || !builderEventId) return;
    setAddingField(true); setFieldMessage(null);
    try {
      const payload = { label: editingForm.label.trim(), placeholder: editingForm.placeholder?.trim() || null, required: editingForm.required, order_no: Number(editingForm.order_no) };
      const res = await fetch(getApiUrl(`/api/admin/form-fields/${editingForm.id}`), {
        method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update field');
      setFieldMessage({ type: 'success', text: 'Field updated successfully!' });
      setEditingForm(null);
      fetchFormFields(builderEventId);
    } catch (err: any) { setFieldMessage({ type: 'error', text: err.message }); }
    finally { setAddingField(false); }
  };

  const handleReorderFields = async (fieldId: number, direction: 'up' | 'down') => {
    if (!builderFields || builderFields.length < 2 || !builderEventId) return;
    const ci = builderFields.findIndex(f => f.id === fieldId);
    if (ci === -1 || (direction === 'up' && ci === 0) || (direction === 'down' && ci === builderFields.length - 1)) return;
    const newOrder = [...builderFields];
    const si = direction === 'up' ? ci - 1 : ci + 1;
    [newOrder[ci], newOrder[si]] = [newOrder[si], newOrder[ci]];
    setBuilderFields(newOrder);
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields/reorder`), {
        method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newOrder.map(f => f.id)), credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reorder');
    } catch { /* revert on error */ }
    fetchFormFields(builderEventId);
  };

  const handleBulkAdd = async () => {
    if (!bulkAddJson.trim() || !builderEventId) return;
    setAddingField(true); setFieldMessage(null);
    try {
      let parsed;
      try { parsed = JSON.parse(bulkAddJson); } catch { throw new Error('Invalid JSON format'); }
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of fields');
      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields/bulk`), {
        method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fields: parsed }), credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed to bulk add'); }
      setFieldMessage({ type: 'success', text: 'Bulk fields added successfully!' });
      setIsBulkAdding(false); setBulkAddJson('');
      fetchFormFields(builderEventId);
    } catch (err: any) { setFieldMessage({ type: 'error', text: err.message }); }
    finally { setAddingField(false); }
  };

  const handleDeleteField = (fieldId: number) => openConfirm(
    'Delete Form Field',
    'Are you sure you want to delete this field? Any user responses already submitted for this field might be affected.',
    async () => {
      const res = await fetch(getApiUrl(`/api/admin/form-fields/${fieldId}`), {
        method: 'DELETE', headers: getAuthHeaders(), credentials: 'include',
      });
      if (res.ok) { showToast('Field deleted.', 'success'); fetchFormFields(builderEventId); }
      else { const d = await res.json(); showToast('Deletion failed: ' + (d.detail || 'Server error'), 'error'); }
    }, true,
  );

  // ── Registration detail handler (called from RegistrationsTab) ─────────────
  const fetchRegistrationDetail = async (regId: number) => {
    setSelectedRegId(regId); setLoadingRegDetail(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/registrations/${regId}`), { headers: getAuthHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch registration details');
      setSelectedRegDetail(await res.json());
    } catch (err: any) { showToast(err.message, 'error'); setSelectedRegId(null); }
    finally { setLoadingRegDetail(false); }
  };

  // ── Sidebar sections ────────────────────────────────────────────────────────
  const sections = [...new Set(NAV_ITEMS.map(i => i.section))];

  const inp = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors';

  return (
    <>
      {/* Root wrapper: full viewport height, no scroll on the shell itself */}
      <div className="h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: '#f1f5f9' }}>

        {/* ── Sidebar — truly fixed, never scrolls ────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
          style={{
            background: 'linear-gradient(180deg, #0d1426 0%, #111827 100%)',
            borderRight: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Logo */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}
            >
              <LayoutDashboard size={17} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white tracking-tight leading-tight">Admin Console</p>
              <p className="text-[10px] text-slate-500 font-mono">AI Club · DA-IICT</p>
            </div>
          </div>

          {/* Scrollable nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
            {sections.map(section => (
              <div key={section} className="mb-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-600 px-3 py-1.5 font-mono">{section}</p>
                {NAV_ITEMS.filter(i => i.section === section).map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-lg mb-0.5 transition-all duration-150 group ${
                      activeTab === item.id
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                    }`}
                    style={activeTab === item.id ? {
                      background: 'linear-gradient(90deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.08) 100%)',
                      borderLeft: '2px solid #6366f1',
                    } : {}}
                  >
                    <span className={activeTab === item.id ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-300 shrink-0'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {activeTab === item.id && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" style={{ boxShadow: '0 0 6px #6366f1' }} />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* User card — pinned at bottom */}
          <div className="p-3 mx-2 mb-3 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {user?.name?.slice(0, 1).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
              </div>
              <button onClick={() => navigate('/')} title="Back to Site"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar mobile backdrop */}
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Main — offset by sidebar width on desktop, fully scrollable ── */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-60 h-screen overflow-hidden">

          {/* Sticky top header — never scrolls */}
          <header className="flex items-center justify-between px-5 py-2.5 shrink-0 bg-white z-20"
            style={{ borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors mr-2"
            >
              <LayoutDashboard size={18} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-mono hidden sm:block">Admin</span>
              <span className="text-slate-300 text-xs hidden sm:block">/</span>
              <span className="text-[13px] font-semibold text-slate-700">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? 'Dashboard'}
              </span>
            </div>

            {/* Right: user badge + back button */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {user?.name?.slice(0, 1).toUpperCase() || 'A'}
                </div>
                <span className="text-[11px] font-medium text-slate-600 max-w-[120px] truncate">{user?.name}</span>
              </div>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Back to website"
              >
                <LogOut size={13} />
                <span className="hidden sm:block">Exit</span>
              </button>
            </div>
          </header>

          {/* Scrollable tab content — only this area scrolls */}
          <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
            <div className="p-5 md:p-7 lg:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  setActiveTab={setActiveTab}
                  setSelectedEventId={setSelectedEventId}
                  setBuilderEventId={setBuilderEventId}
                />
              )}

              {activeTab === 'registrations' && (
                <RegistrationsTab
                  events={events as any[]}
                  selectedEventId={selectedEventId}
                  setSelectedEventId={setSelectedEventId}
                  fetchRegistrationDetail={fetchRegistrationDetail}
                  showToast={showToast}
                  openConfirm={openConfirm}
                />
              )}

              {activeTab === 'createEvent' && (
                <CreateEventTab
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
                    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboardMetrics'] });
                    showToast('Event created successfully!', 'success');
                    setActiveTab('manageEvents');
                  }}
                />
              )}

              {activeTab === 'formBuilder' && (
                <motion.div key="formBuilder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Form Builder — kept in shell due to tight state coupling */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold font-display text-foreground">Registration Form Builder</h2>
                    <select
                      value={builderEventId}
                      onChange={e => { const id = Number(e.target.value); setBuilderEventId(id); fetchFormFields(id); }}
                      className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">Select an event…</option>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </div>

                  {!builderEventId ? (
                    <p className="text-muted-foreground text-center py-12 text-sm">Select an event to manage its registration form fields.</p>
                  ) : loadingFields ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Existing Fields */}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono mb-4">
                          Current Fields ({builderFields.length})
                        </h3>
                        {builderFields.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8 text-sm border border-dashed border-border/50 rounded-xl">No fields yet. Add your first field →</p>
                        ) : (
                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            {builderFields.map((field, idx) => (
                              <div key={field.id} className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border/40 group">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{field.field_type}</span>
                                    <span className="text-xs font-medium text-foreground truncate">{field.label}</span>
                                    {field.required && <span className="text-[9px] text-destructive font-bold uppercase">req</span>}
                                  </div>
                                  {field.placeholder && <p className="text-[10px] text-muted-foreground mt-0.5 ml-0.5 truncate">{field.placeholder}</p>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleReorderFields(field.id, 'up')} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp size={12} /></button>
                                  <button onClick={() => handleReorderFields(field.id, 'down')} disabled={idx === builderFields.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown size={12} /></button>
                                  <button onClick={() => setEditingForm({ ...field })} className="p-1 text-muted-foreground hover:text-primary"><Edit size={12} /></button>
                                  <button onClick={() => handleDeleteField(field.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Field */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Add Field</h3>
                          <button onClick={() => setIsBulkAdding(prev => !prev)} className="text-xs text-primary hover:underline font-semibold">
                            {isBulkAdding ? 'Single Field' : 'Bulk JSON'}
                          </button>
                        </div>

                        {fieldMessage && (
                          <div className={`mb-4 px-4 py-2 rounded-lg text-xs font-medium border ${fieldMessage.type === 'success' ? 'bg-accent/10 text-accent border-accent/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                            {fieldMessage.text}
                          </div>
                        )}

                        {isBulkAdding ? (
                          <div className="space-y-3">
                            <textarea
                              value={bulkAddJson} onChange={e => setBulkAddJson(e.target.value)}
                              rows={10} placeholder={`[\n  {"label": "Team Name", "field_type": "text", "required": true, "order_no": 10},\n  {"label": "Role", "field_type": "dropdown", "options": ["Dev","Design","PM"], "order_no": 20}\n]`}
                              className={inp + ' font-mono text-[11px] resize-none'}
                            />
                            <button onClick={handleBulkAdd} disabled={addingField} className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 disabled:opacity-50 flex items-center justify-center gap-2">
                              {addingField && <Loader2 size={12} className="animate-spin" />}
                              Bulk Add Fields
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleAddField} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Label *</label>
                                <input value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} className={inp} placeholder="e.g. Full Name" required />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Type *</label>
                                <select value={newField.field_type} onChange={e => setNewField({...newField, field_type: e.target.value})} className={inp}>
                                  {['text','textarea','number','email','url','dropdown','radio','checkbox','date','file'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Placeholder</label>
                              <input value={newField.placeholder} onChange={e => setNewField({...newField, placeholder: e.target.value})} className={inp} placeholder="Optional helper text" />
                            </div>
                            {['dropdown','radio','checkbox'].includes(newField.field_type) && (
                              <div>
                                <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Options (comma-separated) *</label>
                                <input value={newField.options} onChange={e => setNewField({...newField, options: e.target.value})} className={inp} placeholder="Option A, Option B, Option C" required />
                              </div>
                            )}
                            {newField.field_type === 'file' && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Max Size (KB)</label>
                                  <input type="number" value={newField.file_max_size_kb} onChange={e => setNewField({...newField, file_max_size_kb: Number(e.target.value)})} className={inp} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Allowed Types</label>
                                  <input value={newField.file_allowed_types} onChange={e => setNewField({...newField, file_allowed_types: e.target.value})} className={inp} />
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono uppercase text-muted-foreground mb-1">Order No</label>
                                <input type="number" value={newField.order_no} onChange={e => setNewField({...newField, order_no: Number(e.target.value)})} className={inp} />
                              </div>
                              <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                  <input type="checkbox" checked={newField.required} onChange={e => setNewField({...newField, required: e.target.checked})} className="w-4 h-4 rounded" />
                                  Required field
                                </label>
                              </div>
                            </div>
                            <button type="submit" disabled={addingField} className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 disabled:opacity-50 flex items-center justify-center gap-2">
                              {addingField && <Loader2 size={12} className="animate-spin" />}
                              Add Field
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'manageEvents' && (
                <ManageEventsTab showToast={showToast} openConfirm={openConfirm} />
              )}

              {activeTab === 'manageMembers' && (
                <ManageMembersProjectsTab showToast={showToast} openConfirm={openConfirm} />
              )}

              {activeTab === 'pastEvents' && (
                <PastEventsAchievementsTab showToast={showToast} openConfirm={openConfirm} />
              )}

              {activeTab === 'manageNews' && (
                <ManageNewsResourcesTab showToast={showToast} openConfirm={openConfirm} />
              )}

              {activeTab === 'manageWeeklyVeneza' && (
                <ManageWeeklyVenezaTab showToast={showToast} openConfirm={openConfirm} />
              )}

              {activeTab === 'chatbotAnalytics' && (
                <motion.div key="chatbotAnalytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ChatbotAnalytics getAuthHeaders={getAuthHeaders} />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnalyticsTab />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl max-w-sm ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-300'
            }`}
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-rose-400' : 'bg-indigo-400'
            }`} />
            <span className="text-[12px] font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
              className="text-current/40 hover:text-current/80 transition-colors text-sm ml-1"
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl z-10">
              <h3 className="font-display font-extrabold text-foreground text-lg mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                <button disabled={isConfirming}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50">
                  Cancel
                </button>
                <button disabled={isConfirming}
                  onClick={async () => {
                    setIsConfirming(true);
                    try { await confirmModal.onConfirm(); }
                    finally { setIsConfirming(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all flex items-center justify-center gap-1.5 min-w-[80px] disabled:opacity-50 ${
                    confirmModal.isDestructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                  }`}>
                  {isConfirming && <Loader2 size={12} className="animate-spin" />}
                  {isConfirming ? 'Processing…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Registration Detail Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedRegId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectedRegId(null); setSelectedRegDetail(null); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] z-10">
              <button onClick={() => { setSelectedRegId(null); setSelectedRegDetail(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">✕</button>
              <h3 className="font-display font-extrabold text-foreground text-xl mb-1">Registration Details</h3>
              <p className="text-xs text-muted-foreground mb-6">ID: <span className="text-primary font-mono">{selectedRegId}</span></p>
              {loadingRegDetail ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                  <span className="text-xs text-muted-foreground font-mono">Fetching data…</span>
                </div>
              ) : selectedRegDetail ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-display text-lg font-extrabold text-primary border border-primary/20">
                      {selectedRegDetail.user_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{selectedRegDetail.user_name}</h4>
                      <p className="text-xs text-muted-foreground">{selectedRegDetail.user_email}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Registered: {new Date(selectedRegDetail.registered_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Event Details</span>
                      <h5 className="font-display font-bold text-sm text-foreground mt-1.5">{selectedRegDetail.event_title}</h5>
                      <span className="inline-block text-[9px] font-mono bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded mt-2">
                        {selectedRegDetail.team_name ? 'Team Event' : 'Individual Event'}
                      </span>
                    </div>
                    {selectedRegDetail.team_name && (
                      <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Team</span>
                        <h5 className="font-display font-bold text-sm text-foreground mt-1.5">Team: {selectedRegDetail.team_name}</h5>
                        <p className="text-xs text-primary font-semibold mt-1">Leader: {selectedRegDetail.user_name}</p>
                      </div>
                    )}
                  </div>
                  {selectedRegDetail.team?.members?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Team Members</h4>
                      <div className="space-y-1.5">
                        {selectedRegDetail.team.members.map((m: any) => (
                          <div key={m.id} className="flex justify-between items-center bg-secondary/15 p-2 px-3 rounded-lg border border-border/30 text-xs">
                            <span className="font-medium text-foreground">{m.member_name}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">{m.member_email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Form Responses</h4>
                    {Object.keys(selectedRegDetail.responses_flat || {}).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No custom fields configured.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(selectedRegDetail.responses_flat).map(([label, val]: [string, any]) => {
                          const fileObj = selectedRegDetail.uploaded_files?.find((f: any) => f.field_label === label);
                          return (
                            <div key={label} className="bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                              <span className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">{label}</span>
                              <div className="mt-1 text-sm font-medium text-foreground">
                                {fileObj ? (
                                  <a href={getApiUrl(fileObj.file_url)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                                    <FileText size={14} />{fileObj.original_name || 'Download file'}
                                  </a>
                                ) : Array.isArray(val) ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {val.map((item: string) => <span key={item} className="text-xs bg-secondary px-2.5 py-0.5 rounded border border-border/30">{item}</span>)}
                                  </div>
                                ) : typeof val === 'boolean' ? (
                                  <span>{val ? 'Yes' : 'No'}</span>
                                ) : (
                                  <span className="whitespace-pre-wrap">{String(val).replace(/^(\d+)\.0$/, '$1')}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Failed to load registration details.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Form Field Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingForm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6 overflow-hidden">
              <h3 className="text-lg font-bold text-foreground mb-4 font-serif">Edit Form Field</h3>
              <form onSubmit={handleUpdateField} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Label</label>
                  <input type="text" value={editingForm.label} onChange={e => setEditingForm({...editingForm, label: e.target.value})}
                    className={inp} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Placeholder</label>
                  <input type="text" value={editingForm.placeholder || ''} onChange={e => setEditingForm({...editingForm, placeholder: e.target.value})} className={inp} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Required</label>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={editingForm.required} onChange={e => setEditingForm({...editingForm, required: e.target.checked})}
                        className="w-4 h-4 rounded border-border text-primary" />
                      <span className="text-sm text-foreground">Yes</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Order No</label>
                    <input type="number" value={editingForm.order_no} onChange={e => setEditingForm({...editingForm, order_no: Number(e.target.value)})}
                      className={inp} required />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border mt-6">
                  <button type="button" onClick={() => setEditingForm(null)} className="flex-1 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary/80">Cancel</button>
                  <button type="submit" disabled={addingField} className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {addingField ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Admin;
