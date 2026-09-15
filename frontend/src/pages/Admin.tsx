import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from '@/components/club/Navbar';
import Footer from '@/components/club/Footer';
import { Loader2, Download, Trash2, Calendar, Users, Award, Newspaper, Clipboard, Settings, Edit, Eye, FileText, Archive, Plus, Image, Link2, Tag, LayoutDashboard, LogOut, ChevronRight, Edit2, ArrowUp, ArrowDown, X, BookOpen, Bot, Clock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';
import ChatbotAnalytics from './ChatbotAnalytics';


interface EventModel {
  id: number;
  title: string;
  description?: string;
  category: string;
  venue?: string;
  contact_email?: string;
  event_type: string;
  min_team_size?: number | null;
  max_team_size?: number | null;
  event_date: string;
  event_start_date?: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  registration_start?: string;
  registration_end?: string;
  status?: string;
  winners?: string | null;
  winner_link?: string | null;
  registration_link?: string | null;
}

interface AchievementModel {
  id: number;
  title: string;
  student: string;
  description: string;
  category: string;
  icon: string;
  created_at?: string;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registrations' | 'createEvent' | 'formBuilder' | 'manageEvents' | 'manageMembers' | 'manageProjects' | 'pastEvents' | 'manageAchievements' | 'manageNews' | 'manageResources' | 'manageWeeklyVeneza' | 'chatbotAnalytics'>('dashboard');

  // Auth & Admin Guard State
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    isAuthenticated: boolean;
    isAuthorized: boolean;
    user: any;
  }>({
    isLoading: true,
    isAuthenticated: false,
    isAuthorized: false,
    user: null
  });

  // Registration Details inspection state
  const [selectedRegId, setSelectedRegId] = useState<number | null>(null);
  const [selectedRegDetail, setSelectedRegDetail] = useState<any | null>(null);
  const [loadingRegDetail, setLoadingRegDetail] = useState<boolean>(false);

  // Edit Event state
  const [editingEvent, setEditingEvent] = useState<EventModel | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'workshop',
    venue: '',
    contact_email: 'ai_club@dau.ac.in',
    event_type: 'individual' as 'individual' | 'team',
    min_team_size: 2,
    max_team_size: 4,
    event_start_date: '',
    event_end_date: '',
    start_time: '18:00:00',
    end_time: '21:00:00',
    registration_start: '',
    registration_end: '',
    winners: '',
    winner_link: '',
    registration_link: ''
  });
  const [events, setEvents] = useState<EventModel[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | ''>('');
  
  // Form Builder state
  const [builderEventId, setBuilderEventId] = useState<number | ''>('');
  const [builderFields, setBuilderFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [newField, setNewField] = useState({
    label: '',
    field_type: 'text',
    placeholder: '',
    required: false,
    options: '', // comma-separated options
    file_max_size_kb: 5120,
    file_allowed_types: 'image/*,application/pdf',
    order_no: 0
  });
  const [fieldMessage, setFieldMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkAddJson, setBulkAddJson] = useState('');

  // Custom Toast and Confirmation Modal states
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  const [isConfirming, setIsConfirming] = useState(false);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void, isDestructive: boolean = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      isDestructive
    });
  };
  
  // Dashboard & Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regSearch, setRegSearch] = useState('');

  // Members & Projects State
  const [adminMembers, setAdminMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [adminProjects, setAdminProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Past Events Archive State
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [loadingPastEvents, setLoadingPastEvents] = useState(false);
  const [isPastEventModalOpen, setIsPastEventModalOpen] = useState(false);
  const [editingPastEvent, setEditingPastEvent] = useState<any>(null);
  const [pastEventForm, setPastEventForm] = useState({
    title: '',
    description: '',
    category: 'workshop',
    date_label: '',
    image_url: '',
    speaker: '',
    participants: '' as string | number,
    sort_order: 0,
    winners: '',
    winner_link: ''
  });
  const [supabaseCounts, setSupabaseCounts] = useState({ members: 0, projects: 0, pastEvents: 0 });

  // Modals / Editor States for Members
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: 'Member',
    photo: '',
    description: '',
    github: '',
    linkedin: '',
    order_no: 0
  });

  // Modals / Editor States for Projects
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    author: '',
    author_id: '' as string | number,
    description: '',
    tags: '',
    github_link: '',
    contributors: ''
  });

  // Achievements States
  const [achievements, setAchievements] = useState<AchievementModel[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementModel | null>(null);
  const [achievementForm, setAchievementForm] = useState({
    title: '',
    student: '',
    description: '',
    category: '',
    icon: 'Award',
    image_url: ''
  });

  // Create Event Form State (Matching Backend ClubEvent constraints)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    banner: '',
    category: 'workshop',
    venue: '',
    contact_email: 'ai_club@dau.ac.in',
    event_type: 'individual' as 'individual' | 'team',
    min_team_size: 2,
    max_team_size: 4,
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    start_time: '18:00:00',
    end_time: '21:00:00',
    registration_start: '',
    registration_end: '',
    winners: '',
    winner_link: '',
    registration_link: ''
  });
  const [eventMessage, setEventMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth uses HttpOnly cookie set by the backend — credentials:'include' handles it automatically.
  // getAuthHeaders only carries content-type or other non-auth headers.
  const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchAchievementsList = async () => {
    setLoadingAchievements(true);
    try {
      const res = await fetch(getApiUrl('/api/achievements'));
      if (res.ok) {
        const data = await res.json();
        setAchievements(data || []);
      }
    } catch (e) {
      console.error('Failed to load achievements list', e);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const handleAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingAchievement ? getApiUrl(`/api/admin/achievements/${editingAchievement.id}`) : getApiUrl('/api/admin/achievements');
      const method = editingAchievement ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(achievementForm),
        credentials: 'include'
      });
      if (res.ok) {
        showToast(`Achievement ${editingAchievement ? 'updated' : 'created'} successfully!`, 'success');
        setIsAchievementModalOpen(false);
        fetchAchievementsList();
      } else {
        const errorData = await res.json().catch(() => ({}));
        let message = 'Failed to save achievement.';
        if (errorData.detail) {
          message = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (res.status === 403) {
          message = 'Forbidden: Your account does not have admin permissions.';
        } else if (res.status === 401) {
          message = 'Unauthorized: Please log in again.';
        }
        showToast(message, 'error');
      }
    } catch (err) {
      showToast('Error saving achievement. Network error or server offline.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAchievement = async (id: number) => {
    openConfirm(
      'Delete Achievement',
      'Are you sure you want to delete this achievement? This action cannot be undone.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/achievements/${id}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Achievement deleted successfully!', 'success');
            fetchAchievementsList();
          } else {
            showToast('Failed to delete achievement.', 'error');
          }
        } catch (err) {
          showToast('Error deleting achievement.', 'error');
        }
      },
      true // isDestructive
    );
  };

  // 1. Fetch Events list for selectors
  const fetchEventsList = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(getApiUrl('/api/events?limit=100'));
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.events && data.events.length > 0) {
          setSelectedEventId(data.events[0].id);
          setBuilderEventId(data.events[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load events list', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  // 2. Fetch Dashboard stats (Total, upcoming, completed count)
  const fetchDashboardMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/dashboard'), {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to load dashboard metrics', e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // 3. Fetch Registrations for a specific Event
  const fetchRegistrations = async (eventId: number | '') => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      // Use search registrations endpoint
      const searchParam = regSearch ? `&search=${encodeURIComponent(regSearch)}` : '';
      const res = await fetch(
        getApiUrl(`/api/admin/events/${eventId}/registrations?limit=100${searchParam}`),
        {
          headers: getAuthHeaders(),
          credentials: 'include'
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch (e) {
      console.error('Failed to fetch registrations', e);
    } finally {
      setIsLoading(false);
    }
  };




  // News States
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    description: '',
    link: '',
    sources: '',
    image_url: ''
  });

  const fetchNewsList = async () => {
    setLoadingNews(true);
    try {
      const res = await fetch(getApiUrl('/api/news'));
      if (res.ok) {
        const data = await res.json();
        setNewsList(data || []);
      }
    } catch (e) {
      console.error('Failed to load news', e);
    } finally {
      setLoadingNews(false);
    }
  };

  // Resources States
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'VIDEO',
    url: '',
    group_name: '',
    order_no: 0
  });

  const fetchResourcesList = async () => {
    setLoadingResources(true);
    try {
      const res = await fetch(getApiUrl('/api/resources'));
      if (res.ok) {
        const data = await res.json();
        setResourcesList(data || []);
      }
    } catch (e) {
      console.error('Failed to load resources', e);
    } finally {
      setLoadingResources(false);
    }
  };

  // ── Weekly Veneza States & Handlers ──────────────────────────────────────
  const [weeklyVenezaWeeks, setWeeklyVenezaWeeks] = useState<any[]>([]);
  const [loadingWeeklyVeneza, setLoadingWeeklyVeneza] = useState(false);
  
  // Week Modal
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<any | null>(null);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    title: '',
    description: '',
    target_date: '',
    is_current: false,
    status: 'active',
    order_no: 1
  });

  // Weekly Resource Modal
  const [isWeeklyResourceModalOpen, setIsWeeklyResourceModalOpen] = useState(false);
  const [editingWeeklyResource, setEditingWeeklyResource] = useState<any | null>(null);
  const [weeklyResourceForm, setWeeklyResourceForm] = useState({
    week_id: 0,
    title: '',
    description: '',
    resource_type: 'VIDEO',
    url: '',
    est_minutes: 45,
    order_no: 1
  });

  const fetchWeeklyVenezaList = async () => {
    setLoadingWeeklyVeneza(true);
    try {
      const res = await fetch(getApiUrl('/api/weekly-veneza'));
      if (res.ok) {
        const data = await res.json();
        setWeeklyVenezaWeeks(data || []);
      }
    } catch (e) {
      console.error('Failed to load Weekly Veneza', e);
    } finally {
      setLoadingWeeklyVeneza(false);
    }
  };

  const handleSaveWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editingWeek
        ? getApiUrl(`/api/admin/weekly-veneza/weeks/${editingWeek.id}`)
        : getApiUrl('/api/admin/weekly-veneza/weeks');
      const method = editingWeek ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(weekForm)
      });

      if (!res.ok) throw new Error('Failed to save week');
      showToast(editingWeek ? 'Week updated!' : 'Week created!', 'success');
      setIsWeekModalOpen(false);
      fetchWeeklyVenezaList();
    } catch (err: any) {
      showToast(err.message || 'Error saving week', 'error');
    }
  };

  const handleDeleteWeek = (weekId: number) => {
    openConfirm(
      'Delete Week',
      'Are you sure you want to delete this week and all its resources?',
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(getApiUrl(`/api/admin/weekly-veneza/weeks/${weekId}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          });
          if (!res.ok) throw new Error('Failed to delete week');
          showToast('Week deleted successfully', 'success');
          fetchWeeklyVenezaList();
        } catch (err: any) {
          showToast(err.message || 'Error deleting week', 'error');
        }
      },
      true
    );
  };

  const handleSetCurrentWeek = async (week: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(getApiUrl(`/api/admin/weekly-veneza/weeks/${week.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ is_current: true })
      });
      if (!res.ok) throw new Error('Failed to set current week');
      showToast(`Week ${week.week_number} set as Current Active Week!`, 'success');
      fetchWeeklyVenezaList();
    } catch (err: any) {
      showToast(err.message || 'Error setting current week', 'error');
    }
  };

  const handleSaveWeeklyResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editingWeeklyResource
        ? getApiUrl(`/api/admin/weekly-veneza/resources/${editingWeeklyResource.id}`)
        : getApiUrl('/api/admin/weekly-veneza/resources');
      const method = editingWeeklyResource ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(weeklyResourceForm)
      });

      if (!res.ok) throw new Error('Failed to save resource');
      showToast(editingWeeklyResource ? 'Weekly Resource updated!' : 'Weekly Resource added!', 'success');
      setIsWeeklyResourceModalOpen(false);
      fetchWeeklyVenezaList();
    } catch (err: any) {
      showToast(err.message || 'Error saving weekly resource', 'error');
    }
  };

  const handleDeleteWeeklyResource = (resourceId: number) => {
    openConfirm(
      'Delete Weekly Resource',
      'Are you sure you want to delete this resource?',
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(getApiUrl(`/api/admin/weekly-veneza/resources/${resourceId}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          });
          if (!res.ok) throw new Error('Failed to delete resource');
          showToast('Weekly Resource deleted successfully', 'success');
          fetchWeeklyVenezaList();
        } catch (err: any) {
          showToast(err.message || 'Error deleting resource', 'error');
        }
      },
      true
    );
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingNews ? getApiUrl(`/api/admin/news/${editingNews.id}`) : getApiUrl('/api/admin/news');
      const method = editingNews ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(newsForm),
        credentials: 'include'
      });
      if (res.ok) {
        showToast(`News ${editingNews ? 'updated' : 'created'} successfully!`, 'success');
        setIsNewsModalOpen(false);
        fetchNewsList();
      } else {
        showToast('Failed to save news.', 'error');
      }
    } catch (err) {
      showToast('Error saving news.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNews = async (id: number) => {
    openConfirm(
      'Delete News',
      'Are you sure you want to delete this news item?',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/news/${id}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('News deleted successfully!', 'success');
            fetchNewsList();
          } else {
            showToast('Failed to delete news.', 'error');
          }
        } catch (err) {
          showToast('Error deleting news.', 'error');
        }
      },
      true
    );
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingResource ? getApiUrl(`/api/admin/resources/${editingResource.id}`) : getApiUrl('/api/admin/resources');
      const method = editingResource ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resourceForm),
        credentials: 'include'
      });
      if (res.ok) {
        showToast(`Resource ${editingResource ? 'updated' : 'created'} successfully!`, 'success');
        setIsResourceModalOpen(false);
        fetchResourcesList();
      } else {
        showToast('Failed to save resource.', 'error');
      }
    } catch (err) {
      showToast('Error saving resource.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: number) => {
    openConfirm(
      'Delete Resource',
      'Are you sure you want to delete this resource?',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/resources/${id}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Resource deleted successfully!', 'success');
            fetchResourcesList();
          } else {
            showToast('Failed to delete resource.', 'error');
          }
        } catch (err) {
          showToast('Error deleting resource.', 'error');
        }
      },
      true
    );
  };

  const checkAdminAuth = async () => {
    try {
      const meUrl = getApiUrl('/api/auth/me');
      const res = await fetch(meUrl, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const isAdmin = !!data.user.is_admin;
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            isAuthorized: isAdmin,
            user: data.user
          });
          
          if (isAdmin) {
            fetchEventsList();
            fetchDashboardMetrics();
          }
          return;
        }
      }
    } catch (e) {
      console.error('Admin auth check failed:', e);
    }
    
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      isAuthorized: false,
      user: null
    });
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const apiBaseUrl = getApiUrl('/api/auth/google');
      const syncRes = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: credentialResponse.credential
        }),
        credentials: 'include'
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.status === 'success' && syncData.user) {
          if (syncData.access_token) {
            localStorage.setItem('access_token', syncData.access_token);
          }
          const isAdmin = !!syncData.user.is_admin;
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            isAuthorized: isAdmin,
            user: syncData.user
          });
          if (isAdmin) {
            fetchEventsList();
            fetchDashboardMetrics();
          } else {
            showToast('Access denied: You are not an administrator.', 'error');
          }
          return;
        }
      }
    } catch (syncErr) {
      console.error('Failed to sync login with PostgreSQL database:', syncErr);
    }
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      isAuthorized: false,
      user: null
    });
    showToast('Login verification failed. Please try again.', 'error');
  };

  const fetchRegistrationDetail = async (regId: number) => {
    setSelectedRegId(regId);
    setLoadingRegDetail(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/registrations/${regId}`), { headers: getAuthHeaders(), credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSelectedRegDetail(data);
      } else {
        showToast('Failed to load registration details.', 'error');
        setSelectedRegId(null);
      }
    } catch (e) {
      console.error('Failed to load registration details', e);
      showToast('Error loading registration details.', 'error');
      setSelectedRegId(null);
    } finally {
      setLoadingRegDetail(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      !!selectedRegId ||
      !!editingEvent ||
      confirmModal.isOpen ||
      isMemberModalOpen ||
      isProjectModalOpen ||
      isAchievementModalOpen ||
      isNewsModalOpen ||
      isPastEventModalOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedRegId, editingEvent, confirmModal.isOpen, isMemberModalOpen, isProjectModalOpen, isAchievementModalOpen, isNewsModalOpen, isPastEventModalOpen]);

  const fetchFormFields = async (eventId: number | '') => {
    if (!eventId) return;
    setLoadingFields(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${eventId}/form-fields`), {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setBuilderFields(data.fields || []);
      } else {
        setBuilderFields([]);
      }
    } catch (e) {
      console.error('Failed to fetch form fields', e);
      setBuilderFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderEventId) return;
    setAddingField(true);
    setFieldMessage(null);

    try {
      const choiceTypes = ['dropdown', 'radio', 'checkbox'];
      const isChoice = choiceTypes.includes(newField.field_type);
      const isFile = newField.field_type === 'file';

      let parsedOptions: string[] | null = null;
      if (isChoice) {
        parsedOptions = newField.options
          .split(',')
          .map(opt => opt.trim())
          .filter(opt => opt.length > 0);
        
        if (parsedOptions.length < 2) {
          throw new Error('Choice fields (dropdown, radio, checkbox) require at least 2 options.');
        }
      }

      const payload = {
        label: newField.label.trim(),
        field_type: newField.field_type,
        placeholder: newField.placeholder.trim() || null,
        required: newField.required,
        options: parsedOptions,
        order_no: Number(newField.order_no),
        file_max_size_kb: isFile ? Number(newField.file_max_size_kb) : null,
        file_allowed_types: isFile ? newField.file_allowed_types.trim() || null : null
      };

      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields`), {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(data.detail)
          ? data.detail.map((err: any) => `${err.loc.slice(1).join('.') || 'field'}: ${err.msg}`).join(', ')
          : (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
        throw new Error(errMsg || 'Failed to add form field');
      }

      setFieldMessage({ type: 'success', text: 'Form field added successfully!' });
      
      const nextOrder = builderFields.length > 0 ? Math.max(...builderFields.map(f => f.order_no)) + 10 : 0;
      setNewField({
        label: '',
        field_type: 'text',
        placeholder: '',
        required: false,
        options: '',
        file_max_size_kb: 5120,
        file_allowed_types: 'image/*,application/pdf',
        order_no: nextOrder
      });
      fetchFormFields(builderEventId);
    } catch (err: any) {
      setFieldMessage({ type: 'error', text: err.message || 'Error adding field' });
    } finally {
      setAddingField(false);
    }
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm || !builderEventId) return;
    setAddingField(true);
    setFieldMessage(null);
    try {
      const payload = {
        label: editingForm.label.trim(),
        placeholder: editingForm.placeholder?.trim() || null,
        required: editingForm.required,
        order_no: Number(editingForm.order_no)
      };
      const res = await fetch(getApiUrl(`/api/admin/form-fields/${editingForm.id}`), {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update field');
      setFieldMessage({ type: 'success', text: 'Field updated successfully!' });
      setEditingForm(null);
      fetchFormFields(builderEventId);
    } catch (err: any) {
      setFieldMessage({ type: 'error', text: err.message });
    } finally {
      setAddingField(false);
    }
  };

  const handleReorderFields = async (fieldId: number, direction: 'up' | 'down') => {
    if (!builderFields || builderFields.length < 2 || !builderEventId) return;
    const currentIndex = builderFields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === builderFields.length - 1) return;

    const newOrder = [...builderFields];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[currentIndex]];
    
    // Optimistic update
    setBuilderFields(newOrder);

    try {
      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields/reorder`), {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newOrder.map(f => f.id)),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to reorder');
      fetchFormFields(builderEventId);
    } catch (err) {
      fetchFormFields(builderEventId);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkAddJson.trim() || !builderEventId) return;
    setAddingField(true);
    setFieldMessage(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(bulkAddJson);
      } catch (err) {
        throw new Error('Invalid JSON format');
      }
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of fields');
      
      const res = await fetch(getApiUrl(`/api/admin/events/${builderEventId}/form-fields/bulk`), {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fields: parsed }),
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to bulk add fields');
      }
      setFieldMessage({ type: 'success', text: 'Bulk fields added successfully!' });
      setIsBulkAdding(false);
      setBulkAddJson('');
      fetchFormFields(builderEventId);
    } catch (err: any) {
      setFieldMessage({ type: 'error', text: err.message });
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteField = (fieldId: number) => {
    openConfirm(
      'Delete Form Field',
      'Are you sure you want to delete this field? Any user responses already submitted for this field might be affected.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/form-fields/${fieldId}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Field deleted successfully.', 'success');
            fetchFormFields(builderEventId);
          } else {
            const data = await res.json();
            showToast('Deletion failed: ' + (data.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  const handleDeleteEvent = (eventId: number) => {
    openConfirm(
      'Delete Event',
      'Are you sure you want to delete this event? All registrations and form schemas associated with this event will be permanently deleted.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/events/${eventId}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Event deleted successfully.', 'success');
            fetchEventsList();
            fetchDashboardMetrics();
          } else {
            const data = await res.json();
            showToast('Deletion failed: ' + (data.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  const handleStartEdit = (ev: any) => {
    setEditingEvent(ev);
    setEditForm({
      title: ev.title || '',
      description: ev.description || '',
      banner: ev.banner || '',
      category: ev.category || 'workshop',
      venue: ev.venue || '',
      contact_email: ev.contact_email || 'ai_club@dau.ac.in',
      event_type: (ev.event_type || 'individual') as 'individual' | 'team',
      min_team_size: ev.min_team_size || 2,
      max_team_size: ev.max_team_size || 4,
      event_start_date: ev.event_start_date || ev.event_date || '',
      event_end_date: ev.event_end_date || ev.event_date || '',
      start_time: ev.start_time || '18:00:00',
      end_time: ev.end_time || '21:00:00',
      registration_start: ev.registration_start ? new Date(ev.registration_start).toISOString().slice(0, 16) : '',
      registration_end: ev.registration_end ? new Date(ev.registration_end).toISOString().slice(0, 16) : '',
      winners: ev.winners || '',
      winner_link: ev.winner_link || '',
      registration_link: ev.registration_link || ''
    });
  };

  const parseLocalDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return trimmed;
  };

  const parseLocalDateTime = (dateTimeStr: string | null | undefined): string | null => {
    if (!dateTimeStr) return null;
    const trimmed = dateTimeStr.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?.*$/.test(trimmed)) {
      return new Date(trimmed).toISOString();
    }

    const formatMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
    if (formatMatch) {
      const day = parseInt(formatMatch[1], 10);
      const month = parseInt(formatMatch[2], 10) - 1;
      const year = parseInt(formatMatch[3], 10);
      let hour = parseInt(formatMatch[4], 10);
      const minute = parseInt(formatMatch[5], 10);
      const ampm = formatMatch[6]?.toUpperCase();

      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const date = new Date(year, month, day, hour, minute);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return trimmed;
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
        start_time: editForm.start_time.includes(':') && editForm.start_time.split(':').length === 2 ? `${editForm.start_time}:00` : editForm.start_time,
        end_time: editForm.end_time.includes(':') && editForm.end_time.split(':').length === 2 ? `${editForm.end_time}:00` : editForm.end_time,
        registration_start: parseLocalDateTime(editForm.registration_start),
        registration_end: parseLocalDateTime(editForm.registration_end),
        winners: editForm.winners.trim() || null,
        winner_link: editForm.winner_link.trim() || null,
        registration_link: editForm.registration_link.trim() || null
      };

      const res = await fetch(getApiUrl(`/api/admin/events/${editingEvent.id}`), {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(data.detail)
          ? data.detail.map((err: any) => `${err.loc.slice(1).join('.') || 'field'}: ${err.msg}`).join(', ')
          : (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
        throw new Error(errMsg || 'Failed to update event');
      }

      showToast('Event updated successfully!', 'success');
      setEditingEvent(null);
      fetchEventsList();
      fetchDashboardMetrics();
    } catch (err: any) {
      showToast(err.message || 'Error updating event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Member Management Handlers ─────────────────────────────────────────────
  const MEMBER_ROLE_ORDER: Record<string, number> = {
    'Convenor': 1, 'Deputy Convenor': 2,
    'Core Member': 3, 'Extended Core Member': 4, 'Member': 5,
    'Ex Convenor': 6, 'Ex Deputy Convenor': 7, 'Ex Core Member': 8
  };

  const fetchAdminMembers = async () => {
    setLoadingMembers(true);
    try {
      let membersData: any[] = [];
      try {
        const res = await fetch(getApiUrl('/api/members'));
        if (res.ok) {
          membersData = await res.json();
        }
      } catch (_) {}

      if (!membersData || membersData.length === 0) {
        const { data, error } = await supabase
          .from('club_members')
          .select('*');
        if (data) membersData = data;
      }

      const sorted = [...(membersData || [])].sort((a, b) => {
        const orderA = a.order_no || 0;
        const orderB = b.order_no || 0;
        if (orderA !== orderB) {
          if (orderA === 0) return 1;
          if (orderB === 0) return -1;
          return orderA - orderB;
        }

        const rA = MEMBER_ROLE_ORDER[a.role] ?? 99;
        const rB = MEMBER_ROLE_ORDER[b.role] ?? 99;
        if (rA !== rB) return rA - rB;
        return (a.name || '').localeCompare(b.name || '');
      });
      setAdminMembers(sorted);
    } catch (e: any) {
      console.error(e);
      showToast('Error loading members: ' + e.message, 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEdit = !!editingMember;
      const url = isEdit
        ? getApiUrl(`/api/members/admin/${editingMember.id}`)
        : getApiUrl('/api/members/admin');
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(memberForm),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save member');
      }

      showToast(isEdit ? 'Member updated successfully!' : 'Member added successfully!', 'success');
      setIsMemberModalOpen(false);
      setEditingMember(null);
      setMemberForm({
        name: '',
        role: 'Member',
        photo: '',
        description: '',
        github: '',
        linkedin: '',
        order_no: 0
      });
      fetchAdminMembers();
    } catch (err: any) {
      showToast(err.message || 'Error saving member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditMember = (member: any) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name || '',
      role: member.role || 'Member',
      photo: member.photo || '',
      description: member.description || '',
      github: member.github || '',
      linkedin: member.linkedin || '',
      order_no: member.order_no || 0
    });
    setIsMemberModalOpen(true);
  };

  const handleDeleteMember = (memberId: number) => {
    openConfirm(
      'Delete Member',
      'Are you sure you want to delete this member? Their project mappings will not be deleted but they will no longer display in the team list.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/members/admin/${memberId}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include',
          });
          if (res.ok) {
            showToast('Member deleted successfully.', 'success');
            fetchAdminMembers();
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast('Deletion failed: ' + (errData.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  // ── Project Management Handlers ─────────────────────────────────────────────
  const fetchAdminProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(getApiUrl('/api/projects'));
      if (res.ok) {
        const data = await res.json();
        const parsedData = (data || []).map((p: any) => {
          let tagsList = [];
          if (p.tags) {
            try {
              tagsList = JSON.parse(p.tags);
              if (!Array.isArray(tagsList)) {
                tagsList = [String(tagsList)];
              }
            } catch (e) {
              tagsList = p.tags.split(',').map((t: any) => t.trim()).filter(Boolean);
            }
          }
          return {
            ...p,
            tags: tagsList
          };
        });
        setAdminProjects(parsedData);
      } else {
        showToast('Failed to fetch projects list', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error loading projects: ' + e.message, 'error');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEdit = !!editingProject;
      const tagsList = projectForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const payload = {
        title: projectForm.title.trim() || null,
        author: projectForm.author.trim() || null,
        author_id: projectForm.author_id === '' ? null : Number(projectForm.author_id),
        description: projectForm.description.trim() || null,
        github_link: projectForm.github_link.trim() || null,
        contributors: projectForm.contributors.trim() || null,
        tags: JSON.stringify(tagsList)
      };

      const url = isEdit ? getApiUrl(`/api/admin/projects/${editingProject.id}`) : getApiUrl('/api/admin/projects');
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save project');
      }

      showToast(isEdit ? 'Project updated successfully!' : 'Project added successfully!', 'success');
      setIsProjectModalOpen(false);
      setEditingProject(null);
      setProjectForm({
        title: '',
        author: '',
        author_id: '',
        description: '',
        tags: '',
        github_link: '',
        contributors: ''
      });
      fetchAdminProjects();
    } catch (err: any) {
      showToast(err.message || 'Error saving project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditProject = (proj: any) => {
    setEditingProject(proj);
    setProjectForm({
      title: proj.title || '',
      author: proj.author || '',
      author_id: proj.author_id !== null ? proj.author_id : '',
      description: proj.description || '',
      tags: Array.isArray(proj.tags) ? proj.tags.join(', ') : '',
      github_link: proj.github_link || proj.githubLink || '',
      contributors: proj.contributors || ''
    });
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (projectId: number) => {
    openConfirm(
      'Delete Project',
      'Are you sure you want to delete this project? This will permanently remove it from the projects page.',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/projects/${projectId}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Project deleted successfully.', 'success');
            fetchAdminProjects();
          } else {
            const data = await res.json().catch(() => ({}));
            showToast('Deletion failed: ' + (data.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  // ── Past Events Handlers ────────────────────────────────────────────────────
  const fetchPastEvents = async () => {
    setLoadingPastEvents(true);
    try {
      const res = await fetch(getApiUrl('/api/past-events'));
      if (res.ok) {
        const data = await res.json();
        setPastEvents(data || []);
      } else {
        showToast('Failed to load past events', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setLoadingPastEvents(false);
    }
  };

  const fetchSupabaseCounts = async () => {
    try {
      const [mem, proj, past] = await Promise.all([
        supabase.from('club_members').select('id', { count: 'exact', head: true }),
        supabase.from('club_projects').select('id', { count: 'exact', head: true }),
        supabase.from('past_events').select('id', { count: 'exact', head: true }),
      ]);
      let memberCount = mem.count ?? 0;
      if (memberCount === 0) {
        try {
          const res = await fetch(getApiUrl('/api/members'));
          if (res.ok) {
            const data = await res.json();
            memberCount = data.length || 0;
          }
        } catch (_) {}
      }
      setSupabaseCounts({
        members: memberCount,
        projects: proj.count ?? 0,
        pastEvents: past.count ?? 0,
      });
    } catch (e) {
      // non-critical
    }
  };

  const handlePastEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEdit = !!editingPastEvent;
      const payload = {
        title: (pastEventForm.title || '').trim() || null,
        description: (pastEventForm.description || '').trim() || null,
        category: pastEventForm.category || 'workshop',
        date_label: (pastEventForm.date_label || '').trim() || null,
        image_url: (pastEventForm.image_url || '').trim() || null,
        speaker: (pastEventForm.speaker || '').trim() || null,
        participants: pastEventForm.participants !== '' && pastEventForm.participants !== null ? Number(pastEventForm.participants) : null,
        sort_order: Number(pastEventForm.sort_order || 0),
        winners: (pastEventForm.winners || '').trim() || null,
        winner_link: (pastEventForm.winner_link || '').trim() || null
      };

      const url = isEdit ? getApiUrl(`/api/admin/past-events/${editingPastEvent.id}`) : getApiUrl('/api/admin/past-events');
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save past event');
      }

      showToast(isEdit ? 'Past event updated!' : 'Past event added!', 'success');
      setIsPastEventModalOpen(false);
      setEditingPastEvent(null);
      setPastEventForm({ title: '', description: '', category: 'workshop', date_label: '', image_url: '', speaker: '', participants: '', sort_order: 0, winners: '', winner_link: '' });
      fetchPastEvents();
    } catch (err: any) {
      showToast(err.message || 'Error saving past event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditPastEvent = (pe: any) => {
    setEditingPastEvent(pe);
    setPastEventForm({
      title: pe.title || '',
      description: pe.description || '',
      category: pe.category || 'workshop',
      date_label: pe.date_label || '',
      image_url: pe.image_url || '',
      speaker: pe.speaker || '',
      participants: pe.participants ?? '',
      sort_order: pe.sort_order ?? 0,
      winners: pe.winners || '',
      winner_link: pe.winner_link || ''
    });
    setIsPastEventModalOpen(true);
  };

  const handleDeletePastEvent = (id: number) => {
    openConfirm(
      'Delete Past Event',
      'Remove this archived event permanently?',
      async () => {
        try {
          const res = await fetch(getApiUrl(`/api/admin/past-events/${id}`), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (res.ok) {
            showToast('Past event deleted.', 'success');
            fetchPastEvents();
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast('Error: ' + (errData.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  useEffect(() => {
    if (activeTab === 'registrations' && selectedEventId) {
      fetchRegistrations(selectedEventId);
    } else if (activeTab === 'dashboard') {
      fetchDashboardMetrics();
      fetchSupabaseCounts();
    } else if (activeTab === 'formBuilder' && builderEventId) {
      fetchFormFields(builderEventId);
    } else if (activeTab === 'manageEvents') {
      fetchEventsList();
    } else if (activeTab === 'manageMembers') {
      fetchAdminMembers();
    } else if (activeTab === 'manageProjects') {
      fetchAdminProjects();
    } else if (activeTab === 'manageAchievements') {
      fetchAchievementsList();
    } else if (activeTab === 'manageNews') {
      fetchNewsList();
    } else if (activeTab === 'pastEvents') {
      fetchPastEvents();
    } else if (activeTab === 'manageResources') {
      fetchResourcesList();
    } else if (activeTab === 'manageWeeklyVeneza') {
      fetchWeeklyVenezaList();
    }
  }, [activeTab, selectedEventId, builderEventId]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistrations(selectedEventId);
  };

  // Deletion logic
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
            fetchRegistrations(selectedEventId);
            fetchDashboardMetrics();
          } else {
            const data = await res.json();
            showToast('Deletion failed: ' + (data.detail || 'Server error'), 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      },
      true
    );
  };

  // Export CSV download
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
      a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_registrations.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('CSV exported successfully.', 'success');
    } catch (e: any) {
      showToast('Failed to export CSV: ' + e.message, 'error');
    }
  };

  // Create Event Submit
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEventMessage(null);

    try {
      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        banner: eventForm.banner ? eventForm.banner.trim() : null,
        category: eventForm.category,
        venue: eventForm.venue.trim() || null,
        contact_email: eventForm.contact_email.trim() || null,
        event_type: eventForm.event_type,
        min_team_size: eventForm.event_type === 'team' ? Number(eventForm.min_team_size) : null,
        max_team_size: eventForm.event_type === 'team' ? Number(eventForm.max_team_size) : null,
        event_date: parseLocalDate(eventForm.event_start_date),
        event_start_date: parseLocalDate(eventForm.event_start_date),
        event_end_date: parseLocalDate(eventForm.event_end_date),
        start_time: eventForm.start_time ? (eventForm.start_time.includes(':') && eventForm.start_time.split(':').length === 2 ? `${eventForm.start_time}:00` : eventForm.start_time) : null,
        end_time: eventForm.end_time ? (eventForm.end_time.includes(':') && eventForm.end_time.split(':').length === 2 ? `${eventForm.end_time}:00` : eventForm.end_time) : null,
        registration_start: parseLocalDateTime(eventForm.registration_start),
        registration_end: parseLocalDateTime(eventForm.registration_end),
        winners: eventForm.winners.trim() || null,
        winner_link: eventForm.winner_link.trim() || null,
        registration_link: eventForm.registration_link.trim() || null
      };

      const res = await fetch(getApiUrl('/api/admin/events'), {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(data.detail)
          ? data.detail.map((err: any) => `${err.loc.slice(1).join('.') || 'field'}: ${err.msg}`).join(', ')
          : (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
        throw new Error(errMsg || 'Failed to create event');
      }

      setEventMessage({ type: 'success', text: 'Event created successfully!' });
      setEventForm({
        title: '',
        description: '',
        banner: '',
        category: 'workshop',
        venue: '',
        contact_email: 'ai_club@dau.ac.in',
        event_type: 'individual',
        min_team_size: 2,
        max_team_size: 4,
        event_date: '',
        event_start_date: '',
        event_end_date: '',
        start_time: '18:00:00',
        end_time: '21:00:00',
        registration_start: '',
        registration_end: '',
        winners: '',
        winner_link: '',
        registration_link: ''
      });
      fetchEventsList();
      fetchDashboardMetrics();
    } catch (err: any) {
      setEventMessage({ type: 'error', text: err.message || 'Error creating event' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.isLoading) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm relative z-[1]">
          <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
          <p className="text-xs font-mono tracking-widest text-primary uppercase">Verifying Authorization...</p>
        </div>
      </>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center px-6 relative z-[1] bg-background">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass-card p-8 md:p-12 max-w-md w-full text-center border border-border bg-card/30 backdrop-blur-md"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-mono mb-6 bg-primary/10 border border-primary/30 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              RESTRICTED AREA
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground mb-3">Admin Portal</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Please authenticate with your administrator account to access event templates, dynamic form configuration, and registrations.
            </p>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showToast('Login Failed', 'error')}
                theme="filled_blue"
                size="large"
                shape="rectangular"
              />
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  if (!authState.isAuthorized) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center px-6 relative z-[1] bg-background">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass-card p-8 md:p-12 max-w-md w-full text-center border border-border bg-card/30 backdrop-blur-md"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-mono mb-6 bg-destructive/10 border border-destructive/30 text-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              ACCESS DENIED
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground mb-3">Unauthorized</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Your account (<span className="text-primary font-mono">{authState.user.email}</span>) does not have administrative privileges.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-8 leading-relaxed">
              If you believe this is an error, please contact the lead administrator.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold btn-glow text-primary-foreground transition-all duration-300"
              >
                Go to Homepage
              </a>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="md:h-screen md:overflow-hidden min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 bg-slate-900 text-slate-100 border-b md:border-b-0 md:border-r border-slate-800 md:h-screen md:overflow-y-auto flex flex-col justify-between p-6">
          <div className="space-y-6">
            {/* Header / Logo */}
            <div className="flex items-center gap-3 py-2 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-display font-extrabold text-white shadow-md select-none">
                AI
              </div>
              <div>
                <h1 className="font-display font-extrabold text-white text-sm tracking-wide leading-none uppercase">Club Console</h1>
                <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Admin Panel</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700/80">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center font-display text-sm font-bold text-indigo-300 border border-indigo-500/30 overflow-hidden shrink-0">
                {authState.user?.picture ? (
                  <img src={authState.user.picture} alt={authState.user.name} className="w-full h-full object-cover" />
                ) : (
                  authState.user?.name ? authState.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'A'
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-xs leading-none truncate">{authState.user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate mt-1">{authState.user?.email}</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {([
                { key: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
                { key: 'registrations', label: 'Registrations', icon: <FileText size={16} /> },
                { key: 'createEvent', label: 'Create Event', icon: <Plus size={16} /> },
                { key: 'formBuilder', label: 'Form Builder', icon: <Settings size={16} /> },
                { key: 'manageEvents', label: 'Manage Events', icon: <Calendar size={16} /> },
                { key: 'manageMembers', label: 'Members', icon: <Users size={16} /> },
                { key: 'manageProjects', label: 'Projects', icon: <Settings size={16} /> },
                { key: 'pastEvents', label: 'Past Events Archive', icon: <Archive size={16} /> },
                { key: 'manageAchievements', label: 'Achievements', icon: <Award size={16} /> },
                { key: 'manageNews', label: 'News', icon: <Newspaper size={16} /> },
                { key: 'manageResources', label: 'Resources', icon: <BookOpen size={16} /> },
                { key: 'manageWeeklyVeneza', label: 'Weekly Veneza', icon: <Clock size={16} /> },
                { key: 'chatbotAnalytics', label: 'Chatbot Analytics', icon: <Bot size={16} /> },
              ] as { key: string; label: string; icon: any }[]).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 relative ${
                      isActive 
                        ? 'text-white bg-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <a 
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
            >
              <ChevronRight size={14} className="rotate-180 text-indigo-400" />
              <span>Back to Website</span>
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-6 md:p-10 flex flex-col md:h-screen md:overflow-hidden">
          <div className="max-w-[1200px] w-full mx-auto flex flex-col h-full">
            {/* Header bar */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 shrink-0">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-bold">Club Control Panel</p>
                <h2 className="font-display font-extrabold text-slate-900 text-2xl md:text-3xl mt-1 tracking-tight">
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'registrations' && 'Registration Management'}
                  {activeTab === 'createEvent' && 'Launch New Event'}
                  {activeTab === 'formBuilder' && 'Registration Form Builder'}
                  {activeTab === 'manageEvents' && 'Active Events List'}
                  {activeTab === 'manageMembers' && 'Club Members Roster'}
                  {activeTab === 'manageProjects' && 'Collaborative Projects'}
                  {activeTab === 'manageAchievements' && 'Manage Achievements'}
                  {activeTab === 'manageNews' && 'Manage News'}
                  {activeTab === 'manageResources' && 'Resource Sheet Manager'}
                  {activeTab === 'manageWeeklyVeneza' && 'Weekly Veneza Curriculum Manager'}
                  {activeTab === 'pastEvents' && 'Past Events Archive'}
                  {activeTab === 'chatbotAnalytics' && 'Chatbot Analytics'}
                </h2>
              </div>
            </header>

            {/* Metrics summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-8 shrink-0">
              {[
                { label: 'Total Events', val: metrics?.total_events ?? '—', icon: <Calendar size={16} />, iconColor: 'text-blue-600', loading: loadingMetrics },
                { label: 'Registrations', val: metrics?.total_registrations ?? '—', icon: <Users size={16} />, iconColor: 'text-emerald-600', loading: loadingMetrics },
                { label: 'Active Events', val: metrics?.active_events ?? '—', icon: <Award size={16} />, iconColor: 'text-amber-600', loading: loadingMetrics },
                { label: 'Upcoming', val: metrics?.upcoming_events ?? '—', icon: <Clipboard size={16} />, iconColor: 'text-pink-600', loading: loadingMetrics },
                { label: 'Past Events', val: supabaseCounts.pastEvents, icon: <Archive size={16} />, iconColor: 'text-orange-600', loading: false },
                { label: 'Members', val: supabaseCounts.members, icon: <Users size={16} />, iconColor: 'text-teal-600', loading: false },
                { label: 'Projects', val: supabaseCounts.projects, icon: <Settings size={16} />, iconColor: 'text-indigo-600', loading: false },
              ].map((card, i) => (
                <div 
                  key={i} 
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block">{card.label}</span>
                    <h3 className="font-display font-bold text-xl text-slate-900 mt-1">{card.loading ? '...' : card.val}</h3>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-slate-100 ${card.iconColor} shrink-0`}>
                    {card.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Content panel */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    {/* Welcome banner */}
                    <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground">Welcome back, {authState.user?.name || 'Administrator'}!</h3>
                        <p className="text-xs text-muted-foreground mt-1">Here is a quick snapshot of what is happening in the AI Club platform today.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('createEvent')}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 self-start md:self-auto"
                      >
                        <Plus size={14} />
                        Create New Event
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Recent Activity List */}
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Recent Activity</h3>
                        {loadingMetrics ? (
                          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                        ) : !metrics || metrics.recent_registrations.length === 0 ? (
                          <div className="bg-secondary/15 border border-border/50 rounded-xl p-8 text-center text-xs text-muted-foreground">
                            No recent registrations found.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {metrics.recent_registrations.map((reg: any) => (
                              <div key={reg.id} className="flex items-center justify-between bg-secondary/20 p-4 rounded-xl border border-border/40 hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-display text-xs font-extrabold text-primary border border-primary/10 group-hover:scale-105 transition-transform duration-300">
                                    {reg.user_name ? reg.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-foreground leading-snug">{reg.user_name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {reg.user_email} • Registered for <span className="text-primary font-medium">{reg.event_title}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 font-mono bg-secondary/50 border border-border/40 px-2 py-0.5 rounded shrink-0">
                                  {new Date(reg.registered_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Quick Stats / Console Meta */}
                      <div className="space-y-5">
                        {/* Quick Actions Panel */}
                        <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Console Quick Actions</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => {
                                if (events.length > 0) {
                                  setSelectedEventId(events[0].id);
                                  setActiveTab('registrations');
                                }
                              }}
                              className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
                            >
                              <span>View Registration Logs</span>
                              <ChevronRight size={14} className="text-primary" />
                            </button>
                            <button
                              onClick={() => {
                                if (events.length > 0) {
                                  setBuilderEventId(events[0].id);
                                  setActiveTab('formBuilder');
                                }
                              }}
                              className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
                            >
                              <span>Manage Form Schemas</span>
                              <ChevronRight size={14} className="text-primary" />
                            </button>
                            <button
                              onClick={() => setActiveTab('manageEvents')}
                              className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
                            >
                              <span>Manage Live Events</span>
                              <ChevronRight size={14} className="text-primary" />
                            </button>
                          </div>
                        </div>

                        {/* System Information Panel */}
                        <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-3 text-[11px]">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono mb-2">System Status</h4>
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Environment:</span>
                            <span className="font-mono text-foreground font-semibold uppercase">Production</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Database:</span>
                            <span className="font-mono text-foreground font-semibold">Supabase (AWS)</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Session Auth:</span>
                            <span className="font-mono text-primary font-semibold">Google OAuth 2.0</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              {/* REGISTRATIONS TAB */}
              {activeTab === 'registrations' && (
                <motion.div key="reg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold font-display">Registrations</h2>
                    
                    {/* Event Selector and Search form */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(Number(e.target.value))}
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
                          value={regSearch}
                          onChange={(e) => setRegSearch(e.target.value)}
                          placeholder="Search registrations..."
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none w-44"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg">Search</button>
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
                    <div className="bg-secondary/20 p-8 rounded-xl text-center border border-border mt-8">
                      <p className="text-muted-foreground text-sm">
                        This event uses an external registration link: <a href={events.find(e => e.id === selectedEventId)?.registration_link!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{events.find(e => e.id === selectedEventId)?.registration_link}</a>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Internal registrations are disabled. To re-enable them, edit the event and remove the external link.
                      </p>
                    </div>
                  ) : isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                  ) : registrations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">No registrations found for this event.</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-border/30 rounded-xl bg-[#090d16]/40 shadow-inner">
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
                          {registrations.map((reg) => (
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
                  )}
                </motion.div>
              )}



              {/* CREATE EVENT TAB */}
              {activeTab === 'createEvent' && (
                <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold font-display mb-6">Create New Event</h2>
                  
                  {eventMessage && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${eventMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                      {eventMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleCreateEvent} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Title</label>
                        <input
                          type="text"
                          required
                          value={eventForm.title}
                          onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                          placeholder="e.g. Kaggle ML Cup 2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Category</label>
                        <select
                          value={eventForm.category}
                          onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        >
                          <option value="competition">Competition</option>
                          <option value="hackathon">Hackathon</option>
                          <option value="workshop">Workshop</option>
                          <option value="talk">Guest Lecture / Talk</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Image / Banner URL (Optional)</label>
                      <input
                        type="url"
                        value={eventForm.banner}
                        onChange={(e) => setEventForm({...eventForm, banner: e.target.value})}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        placeholder="e.g. https://images.unsplash.com/... or https://drive.google.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">External Registration Link (Optional)</label>
                      <input
                        type="url"
                        value={eventForm.registration_link}
                        onChange={(e) => setEventForm({...eventForm, registration_link: e.target.value})}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        placeholder="e.g. https://forms.gle/... or unstop.com/..."
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">If provided, the "Register Now" button will redirect users to this URL, bypassing the built-in form.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Venue / Online Link (Optional)</label>
                        <input
                          type="text"
                          value={eventForm.venue}
                          onChange={(e) => setEventForm({...eventForm, venue: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                          placeholder="e.g. Lab 102 or MS Teams URL"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Contact Email (Optional)</label>
                        <input
                          type="email"
                          value={eventForm.contact_email}
                          onChange={(e) => setEventForm({...eventForm, contact_email: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Type</label>
                        <select
                          value={eventForm.event_type}
                          onChange={(e) => setEventForm({...eventForm, event_type: e.target.value as any})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        >
                          <option value="individual">Individual</option>
                          <option value="team">Team</option>
                        </select>
                      </div>
                      
                      {eventForm.event_type === 'team' && (
                        <>
                          <div>
                            <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Min Team Size</label>
                            <input
                              type="number"
                              min={2}
                              value={eventForm.min_team_size}
                              onChange={(e) => setEventForm({...eventForm, min_team_size: Number(e.target.value)})}
                              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Max Team Size</label>
                            <input
                              type="number"
                              min={eventForm.min_team_size}
                              value={eventForm.max_team_size}
                              onChange={(e) => setEventForm({...eventForm, max_team_size: Number(e.target.value)})}
                              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Start Date (Optional)</label>
                        <input
                          type="date"
                          value={eventForm.event_start_date}
                          onChange={(e) => setEventForm({...eventForm, event_start_date: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event End Date (Optional)</label>
                        <input
                          type="date"
                          value={eventForm.event_end_date}
                          onChange={(e) => setEventForm({...eventForm, event_end_date: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Start Time (Optional)</label>
                        <input
                          type="time"
                          value={eventForm.start_time}
                          onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">End Time (Optional)</label>
                        <input
                          type="time"
                          value={eventForm.end_time}
                          onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Registration Start Date (Optional)</label>
                        <input
                          type="datetime-local"
                          value={eventForm.registration_start}
                          onChange={(e) => setEventForm({...eventForm, registration_start: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Registration End Date (Optional)</label>
                        <input
                          type="datetime-local"
                          value={eventForm.registration_end}
                          onChange={(e) => setEventForm({...eventForm, registration_end: e.target.value})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Description</label>
                      <textarea
                        required
                        value={eventForm.description}
                        onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                        rows={4}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                        placeholder="Comprehensive event description..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Winners (Optional)</label>
                      <textarea
                        value={eventForm.winners}
                        onChange={(e) => setEventForm({...eventForm, winners: e.target.value})}
                        rows={3}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                        placeholder="Declare competition winners, e.g.&#10;1st: Daiya Jeet Ajaykumar&#10;2nd: Tirth Gandhi"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Winner Document / Link (Optional)</label>
                      <input
                        type="url"
                        value={eventForm.winner_link}
                        onChange={(e) => setEventForm({...eventForm, winner_link: e.target.value})}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        placeholder="e.g. https://drive.google.com/... or https://domain.com/winners.pdf"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 mt-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                      {isSubmitting ? 'Creating Event...' : 'Create Event'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* FORM BUILDER TAB */}
              {activeTab === 'formBuilder' && (
                <motion.div key="formBuilder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-foreground">Registration Form Builder</h2>
                      <p className="text-xs text-muted-foreground mt-1">Configure dynamic registration fields for each event.</p>
                    </div>
                    
                    {/* Event Selector */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground uppercase">Select Event:</span>
                      <select
                        value={builderEventId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBuilderEventId(val);
                        }}
                        className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                      >
                        <option value="" disabled>Select Event...</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!builderEventId ? (
                    <p className="text-muted-foreground text-center py-12">Please select an event from the dropdown to start building its form.</p>
                  ) : events.find(e => e.id === builderEventId)?.registration_link ? (
                    <div className="bg-secondary/20 p-8 rounded-xl text-center border border-border mt-8">
                      <p className="text-muted-foreground text-sm">
                        This event uses an external registration link: <a href={events.find(e => e.id === builderEventId)?.registration_link!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{events.find(e => e.id === builderEventId)?.registration_link}</a>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        The manual form builder and custom registrations are disabled. To re-enable them, edit the event and remove the external link.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Existing Fields list (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Current Form Fields</h3>
                        
                        {loadingFields ? (
                          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                        ) : builderFields.length === 0 ? (
                          <div className="text-center p-8 rounded-xl border border-border border-dashed bg-secondary/10">
                            <p className="text-xs text-muted-foreground">No custom fields have been added yet.</p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1">The public registration form will default to requiring no additional fields.</p>
                            {events.find(e => e.id === builderEventId)?.event_type === 'team' && (
                              <p className="text-[10px] text-primary mt-2 font-mono bg-primary/10 inline-block px-2 py-1 rounded">
                                Note: "Team Name" and "Member Details" are automatically included because this is a Team event.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {events.find(e => e.id === builderEventId)?.event_type === 'team' && (
                              <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl mb-4">
                                <p className="text-[10px] text-primary font-mono">
                                  Note: "Team Name" and "Member Details" are automatically included in the public form because this is a Team event.
                                </p>
                              </div>
                            )}
                            {builderFields.map((field) => (
                              <div key={field.id} className="flex justify-between items-start bg-secondary/20 p-4 rounded-xl border border-border/60 hover:border-border transition-colors">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground">{field.label}</span>
                                    {field.required && (
                                      <span className="text-[9px] font-mono bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded">Required</span>
                                    )}
                                    <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase">{field.field_type}</span>
                                  </div>
                                  
                                  {field.placeholder && (
                                    <p className="text-xs text-muted-foreground"><span className="text-muted-foreground/60 font-mono">Placeholder:</span> "{field.placeholder}"</p>
                                  )}
                                  
                                  {field.options_json && (
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                      <span className="text-[10px] text-muted-foreground/60 font-mono">Options:</span>
                                      {JSON.parse(field.options_json).map((opt: string) => (
                                        <span key={opt} className="text-[10px] bg-secondary px-2 py-0.5 rounded text-foreground border border-border/30">{opt}</span>
                                      ))}
                                    </div>
                                  )}

                                  {field.field_type === 'file' && (
                                    <p className="text-[10px] text-muted-foreground">
                                      <span className="font-mono">Max size:</span> {((field.file_max_size_kb || 5120) / 1024).toFixed(1)} MB 
                                      {field.file_allowed_types && ` • Allowed: ${field.file_allowed_types}`}
                                    </p>
                                  )}
                                  
                                  <div className="text-[10px] text-muted-foreground/50 font-mono">Order: {field.order_no}</div>
                                </div>
                                
                                <div className="flex gap-1">
                                  <button onClick={() => handleReorderFields(field.id, 'up')} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Move Up"><ArrowUp size={14} /></button>
                                  <button onClick={() => handleReorderFields(field.id, 'down')} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Move Down"><ArrowDown size={14} /></button>
                                  <button onClick={() => setEditingForm(field)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Edit Field"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDeleteField(field.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors" title="Delete Field"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Add New Field form (5 cols) */}
                      <div className="lg:col-span-5 space-y-4 h-fit">
                        {isBulkAdding ? (
                          <div className="bg-secondary/15 p-6 rounded-xl border border-border/80">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-sm font-semibold text-foreground">Bulk Add Fields</h3>
                              <button onClick={() => setIsBulkAdding(false)} className="text-xs text-primary hover:underline">Switch to Single Add</button>
                            </div>
                            <textarea
                              value={bulkAddJson}
                              onChange={(e) => setBulkAddJson(e.target.value)}
                              placeholder="[{ &quot;label&quot;: &quot;Github&quot;, &quot;field_type&quot;: &quot;text&quot;, &quot;required&quot;: false, &quot;order_no&quot;: 10 }]"
                              rows={8}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono mb-4 focus:outline-none focus:border-primary/50"
                            />
                            <button
                              onClick={handleBulkAdd}
                              disabled={addingField || !bulkAddJson.trim()}
                              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {addingField ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Bulk Add'}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-secondary/15 p-6 rounded-xl border border-border/80">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Plus size={16} className="text-primary" /> Add New Field</h3>
                              <button onClick={() => setIsBulkAdding(true)} className="text-xs text-primary hover:underline">Bulk Add JSON</button>
                            </div>
                        
                        {fieldMessage && (
                          <div className={`p-3 rounded-lg mb-4 text-xs ${fieldMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                            {fieldMessage.text}
                          </div>
                        )}

                        <form onSubmit={handleAddField} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Field Label *</label>
                            <input
                              type="text"
                              required
                              value={newField.label}
                              onChange={(e) => setNewField({...newField, label: e.target.value})}
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                              placeholder="e.g. GitHub URL or Branch"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Field Type</label>
                              <select
                                value={newField.field_type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewField({
                                    ...newField, 
                                    field_type: val,
                                    order_no: newField.order_no || (builderFields.length > 0 ? Math.max(...builderFields.map(f => f.order_no)) + 10 : 0)
                                  });
                                }}
                                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                              >
                                <option value="text">Text Input</option>
                                <option value="number">Number</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone / Mobile</option>
                                <option value="textarea">Text Area</option>
                                <option value="date">Date</option>
                                <option value="dropdown">Dropdown Select</option>
                                <option value="radio">Radio Buttons</option>
                                <option value="checkbox">Checkboxes</option>
                                <option value="file">File Upload</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Order Number</label>
                              <input
                                type="number"
                                required
                                value={newField.order_no}
                                onChange={(e) => setNewField({...newField, order_no: Number(e.target.value)})}
                                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                                placeholder="0, 10, 20..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Placeholder Text</label>
                            <input
                              type="text"
                              value={newField.placeholder}
                              onChange={(e) => setNewField({...newField, placeholder: e.target.value})}
                              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                              placeholder="e.g. Enter your roll number"
                            />
                          </div>

                          {/* CHOICE TYPES: options selection */}
                          {['dropdown', 'radio', 'checkbox'].includes(newField.field_type) && (
                            <div>
                              <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Choices * (comma-separated)</label>
                              <textarea
                                required
                                value={newField.options}
                                onChange={(e) => setNewField({...newField, options: e.target.value})}
                                rows={2}
                                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors resize-none"
                                placeholder="e.g. CSE, ECE, ICT"
                              />
                            </div>
                          )}

                          {/* FILE TYPE: file configuration */}
                          {newField.field_type === 'file' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Max Size (KB)</label>
                                <input
                                  type="number"
                                  value={newField.file_max_size_kb}
                                  onChange={(e) => setNewField({...newField, file_max_size_kb: Number(e.target.value)})}
                                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono tracking-wider text-muted-foreground uppercase mb-1">Allowed Mimes</label>
                                <input
                                  type="text"
                                  value={newField.file_allowed_types}
                                  onChange={(e) => setNewField({...newField, file_allowed_types: e.target.value})}
                                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                                  placeholder="e.g. image/*,application/pdf"
                                />
                              </div>
                            </div>
                          )}

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={newField.required}
                              onChange={(e) => setNewField({...newField, required: e.target.checked})}
                              className="rounded bg-secondary border border-border outline-none focus:ring-primary text-primary w-4 h-4"
                            />
                            <span className="text-xs text-foreground font-medium select-none">Require users to fill this field</span>
                          </label>

                          <button
                            type="submit"
                            disabled={addingField}
                            className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {addingField && <Loader2 size={12} className="animate-spin" />}
                            {addingField ? 'Adding Field...' : 'Add Field'}
                          </button>
                        </form>
                      </div>
                      )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* MANAGE EVENTS TAB */}
              {activeTab === 'manageEvents' && (
                <motion.div key="manageEvents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-display text-slate-900">Manage Events</h2>
                    <button onClick={fetchEventsList} className="text-xs text-indigo-600 font-semibold hover:underline">Refresh List</button>
                  </div>

                  {loadingEvents ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                  ) : events.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">No events found. You can create one in the "Create Event" tab.</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                          <tr className="text-slate-700 text-xs uppercase tracking-wider font-semibold">
                            <th className="p-3.5">Event Title</th>
                            <th className="p-3.5">Dates</th>
                            <th className="p-3.5">Venue</th>
                            <th className="p-3.5">Type</th>
                            <th className="p-3.5">Category</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                          {events.map((ev: any) => (
                            <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3.5 font-semibold text-slate-900">{ev.title}</td>
                              <td className="p-3.5 whitespace-nowrap text-slate-600 text-xs">
                                {ev.event_start_date && ev.event_end_date && ev.event_start_date !== ev.event_end_date
                                  ? `${ev.event_start_date} to ${ev.event_end_date}`
                                  : ev.event_start_date || ev.event_date}
                              </td>
                              <td className="p-3.5 text-slate-600 max-w-[150px] truncate" title={ev.venue}>{ev.venue || 'N/A'}</td>
                              <td className="p-3.5 capitalize text-xs text-slate-600">{ev.event_type}</td>
                              <td className="p-3.5"><span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-xs font-semibold uppercase">{ev.category}</span></td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleStartEdit(ev)}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-flex items-center"
                                  title="Edit Event"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(ev.id)}
                                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center"
                                  title="Delete Event"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* MANAGE MEMBERS TAB */}
              {activeTab === 'manageMembers' && (
                <motion.div key="manageMembers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-display text-slate-900">Manage Members</h2>
                    <button
                      onClick={() => {
                        setEditingMember(null);
                        setMemberForm({
                          name: '',
                          role: 'Member',
                          photo: '',
                          description: '',
                          github: '',
                          linkedin: '',
                          order_no: adminMembers.length + 1
                        });
                        setIsMemberModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Add New Member
                    </button>
                  </div>

                  {loadingMembers ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                  ) : adminMembers.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">No core members found. Click "Add New Member" to add one.</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                          <tr className="text-slate-700 text-xs uppercase tracking-wider font-semibold">
                            <th className="p-3.5">Avatar</th>
                            <th className="p-3.5">Name</th>
                            <th className="p-3.5">Role</th>
                            <th className="p-3.5">Links</th>
                            <th className="p-3.5">Order</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                          {adminMembers.map((m: any) => (
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
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                  {m.role}
                                </span>
                              </td>
                              <td className="p-3.5 whitespace-nowrap text-xs space-x-2">
                                {m.github && (
                                  <a href={m.github} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">GitHub</a>
                                )}
                                {m.linkedin && (
                                  <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">LinkedIn</a>
                                )}
                              </td>
                              <td className="p-3.5 text-slate-600 font-mono text-xs">{m.order_no}</td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  onClick={() => openEditMember(m)}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-flex items-center"
                                  title="Edit Member"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(m.id)}
                                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center"
                                  title="Delete Member"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* MANAGE PROJECTS TAB */}
              {activeTab === 'manageProjects' && (
                <motion.div key="manageProjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-display text-foreground">Manage Projects</h2>
                    <button
                      onClick={() => {
                        setEditingProject(null);
                        setProjectForm({
                          title: '',
                          author: '',
                          author_id: '',
                          description: '',
                          tags: 'Machine Learning, Python',
                          github_link: ''
                        });
                        setIsProjectModalOpen(true);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
                    >
                      Add New Project
                    </button>
                  </div>

                  {loadingProjects ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
                  ) : adminProjects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">No projects found. Click "Add New Project" to add one.</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-border/30 rounded-xl bg-[#090d16]/40 shadow-inner custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0c1222] z-10 border-b border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                          <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                            <th className="p-3.5 font-semibold">Project Title</th>
                            <th className="p-3.5 font-semibold">Author</th>
                            <th className="p-3.5 font-semibold">Tags</th>
                            <th className="p-3.5 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {adminProjects.map((p: any) => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                              <td className="p-3 font-medium text-foreground">{p.title}</td>
                              <td className="p-3 text-muted-foreground">{p.author}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {p.tags && p.tags.map((tag: string) => (
                                    <span key={tag} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => openEditProject(p)}
                                  className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors inline-flex items-center"
                                  title="Edit Project"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(p.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors inline-flex items-center"
                                  title="Delete Project"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* PAST EVENTS ARCHIVE TAB */}
              {activeTab === 'pastEvents' && (
                <motion.div key="pastEvents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                        <Archive size={20} className="text-primary" /> Past Events Archive
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">Events shown on the public website archive page (no registration data).</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPastEvent(null);
                        setPastEventForm({ title: '', description: '', category: 'workshop', date_label: '', image_url: '', speaker: '', participants: '', sort_order: 0, winners: '', winner_link: '' });
                        setIsPastEventModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
                    >
                      <Plus size={14} /> Add Past Event
                    </button>
                  </div>

                  {loadingPastEvents ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
                  ) : pastEvents.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                      <Archive size={36} className="text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">No past events yet.</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">Add archived events to display them on the public website.</p>
                    </div>
                  ) : (
                    <div className="max-h-[520px] overflow-y-auto border border-border/30 rounded-xl p-4 bg-[#090d16]/40 shadow-inner custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastEvents.map((pe: any) => {
                        return (
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
                                  <button onClick={() => openEditPastEvent(pe)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Edit">
                                    <Edit size={13} />
                                  </button>
                                  <button onClick={() => handleDeletePastEvent(pe.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              {pe.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{pe.description}</p>}
                              {pe.speaker && (
                                <p className="text-[11px] text-primary/80 font-mono mt-1">Speaker: {pe.speaker}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'manageNews' && (
                <motion.div key="manageNews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">News & Affairs</h2>
                      <p className="text-slate-500">Manage news links and current affairs</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingNews(null);
                        setNewsForm({ title: '', description: '', link: '', sources: '', image_url: '' });
                        setIsNewsModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Plus size={18} /> Add News
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loadingNews ? (
                      <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                        <p>Loading news...</p>
                      </div>
                    ) : newsList.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                        <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-600 mb-1">No news items found</p>
                        <p className="text-sm">Click 'Add News' to create your first one.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 text-xs uppercase tracking-wider font-bold">
                              <th className="p-4 py-3">Title</th>
                              <th className="p-4 py-3">Link</th>
                              <th className="p-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newsList.map((n) => (
                              <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">
                                  {n.title}
                                </td>
                                <td className="p-4 text-slate-600 text-sm">
                                  <a href={n.link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                    {n.link.substring(0, 40)}{n.link.length > 40 ? '...' : ''}
                                  </a>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingNews(n);
                                        setNewsForm({
                                          title: n.title || '',
                                          description: n.description || '',
                                          link: n.link || '',
                                          sources: n.sources || '',
                                          image_url: n.image_url || ''
                                        });
                                        setIsNewsModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNews(n.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'manageResources' && (
                <motion.div key="manageResources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Manage Resources</h2>
                      <p className="text-slate-500">Add, edit, or remove curriculum topics and learning resources</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingResource(null);
                        setResourceForm({ title: '', description: '', resource_type: 'VIDEO', url: '', group_name: '', order_no: 0 });
                        setIsResourceModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-semibold"
                    >
                      <Plus size={18} /> Add Resource
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loadingResources ? (
                      <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                        <p>Loading resources...</p>
                      </div>
                    ) : resourcesList.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-600 mb-1">No resources found</p>
                        <p className="text-sm">Click 'Add Resource' to get started.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 text-xs uppercase tracking-wider font-bold">
                              <th className="p-4 py-3">Title</th>
                              <th className="p-4 py-3">Topic / Group</th>
                              <th className="p-4 py-3">Type</th>
                              <th className="p-4 py-3">Order No</th>
                              <th className="p-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resourcesList.map((r) => (
                              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">
                                  <div>
                                    <div className="font-semibold text-slate-900">{r.title}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 max-w-sm truncate">{r.description}</div>
                                  </div>
                                </td>
                                <td className="p-4 text-slate-600 text-sm font-semibold">
                                  {r.group_name}
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {r.resource_type}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-600 text-sm">
                                  {r.order_no}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingResource(r);
                                        setResourceForm({
                                          title: r.title || '',
                                          description: r.description || '',
                                          resource_type: r.resource_type || 'VIDEO',
                                          url: r.url || '',
                                          group_name: r.group_name || '',
                                          order_no: r.order_no || 0
                                        });
                                        setIsResourceModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResource(r.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'manageWeeklyVeneza' && (
                <motion.div key="manageWeeklyVeneza" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Weekly Veneza Curriculum</h2>
                      <p className="text-slate-500">Create, edit, and organize weekly learning resources & set active ticking week</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingWeek(null);
                        setWeekForm({
                          week_number: (weeklyVenezaWeeks.length + 1),
                          title: '',
                          description: '',
                          target_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                          is_current: weeklyVenezaWeeks.length === 0,
                          status: 'active',
                          order_no: (weeklyVenezaWeeks.length + 1)
                        });
                        setIsWeekModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm text-sm font-semibold"
                    >
                      <Plus size={18} /> Add New Week
                    </button>
                  </div>

                  {loadingWeeklyVeneza ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center bg-white rounded-2xl border border-slate-200">
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                      <p className="font-medium">Loading Weekly Veneza...</p>
                    </div>
                  ) : weeklyVenezaWeeks.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-lg font-bold text-slate-700 mb-1">No weeks configured yet</p>
                      <p className="text-sm text-slate-400">Click 'Add New Week' to set up your first Weekly Veneza curriculum.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {weeklyVenezaWeeks.map((week) => (
                        <div 
                          key={week.id} 
                          className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                            week.is_current ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                          }`}
                        >
                          {/* Week Header Row */}
                          <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                week.is_current ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
                              }`}>
                                Week {week.week_number}
                              </span>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-base font-bold text-slate-900">{week.title}</h3>
                                  {week.is_current && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                                      Active Clock Ticking
                                    </span>
                                  )}
                                </div>
                                {week.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">{week.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {!week.is_current && (
                                <button
                                  onClick={() => handleSetCurrentWeek(week)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200"
                                >
                                  Set Current Week
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingWeeklyResource(null);
                                  setWeeklyResourceForm({
                                    week_id: week.id,
                                    title: '',
                                    description: '',
                                    resource_type: 'VIDEO',
                                    url: '',
                                    est_minutes: 45,
                                    order_no: (week.resources?.length || 0) + 1
                                  });
                                  setIsWeeklyResourceModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Plus size={14} /> Add Resource
                              </button>
                              <button
                                onClick={() => {
                                  setEditingWeek(week);
                                  setWeekForm({
                                    week_number: week.week_number,
                                    title: week.title,
                                    description: week.description || '',
                                    target_date: week.target_date || '',
                                    is_current: week.is_current,
                                    status: week.status || 'active',
                                    order_no: week.order_no || week.week_number
                                  });
                                  setIsWeekModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteWeek(week.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Weekly Resources List */}
                          <div className="p-4 bg-white">
                            {(!week.resources || week.resources.length === 0) ? (
                              <p className="text-xs text-slate-400 italic text-center py-4">No resources added to Week {week.week_number} yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {week.resources.map((res: any) => (
                                  <div key={res.id} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex items-center space-x-3 min-w-0">
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded border border-indigo-200">
                                        {res.resource_type}
                                      </span>
                                      <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 truncate">{res.title}</h4>
                                        <p className="text-xs text-slate-500 truncate max-w-lg">{res.description}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">{res.est_minutes} mins</span>
                                      <a href={res.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600">
                                        <Link2 size={14} />
                                      </a>
                                      <button
                                        onClick={() => {
                                          setEditingWeeklyResource(res);
                                          setWeeklyResourceForm({
                                            week_id: week.id,
                                            title: res.title,
                                            description: res.description,
                                            resource_type: res.resource_type,
                                            url: res.url,
                                            est_minutes: res.est_minutes,
                                            order_no: res.order_no
                                          });
                                          setIsWeeklyResourceModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWeeklyResource(res.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600"
                                      >
                                        <Trash2 size={14} />
                                      </button>
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
                </motion.div>
              )}

              {activeTab === 'manageAchievements' && (
                <motion.div key="manageAchievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-display text-foreground">Manage Achievements</h2>
                    <button
                      onClick={() => {
                        setEditingAchievement(null);
                        setAchievementForm({ title: '', student: '', description: '', category: '', icon: 'Award', image_url: '' });
                        setIsAchievementModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
                    >
                      <Plus size={14} /> Add Achievement
                    </button>
                  </div>

                  {loadingAchievements ? (
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
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Student/Team</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {achievements.map((ach) => (
                            <tr key={ach.id} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{ach.title}</td>
                              <td className="px-4 py-3 text-muted-foreground">{ach.student}</td>
                              <td className="px-4 py-3">
                                <span className="bg-secondary px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider border border-border/50">{ach.category}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingAchievement(ach);
                                      setAchievementForm({ title: ach.title || '', student: ach.student || '', description: ach.description || '', category: ach.category || '', icon: ach.icon || 'Award', image_url: ach.image_url || '' });
                                      setIsAchievementModalOpen(true);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAchievement(ach.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'chatbotAnalytics' && (
                <motion.div key="chatbotAnalytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ChatbotAnalytics getAuthHeaders={getAuthHeaders} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md max-w-sm ${
              toast.type === 'success'
                ? 'bg-accent/15 border-accent/30 text-accent'
                : toast.type === 'error'
                ? 'bg-destructive/15 border-destructive/30 text-destructive'
                : 'bg-primary/15 border-primary/30 text-primary'
            }`}
          >
            <span className="text-xs font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
              className="text-muted-foreground hover:text-foreground text-xs ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Achievement Form Modal */}
      <AnimatePresence>
        {isAchievementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsAchievementModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h3 className="font-display font-bold text-lg">{editingAchievement ? 'Edit Achievement' : 'Add New Achievement'}</h3>
                <button onClick={() => setIsAchievementModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleAchievementSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Title</label>
                      <input value={achievementForm.title} onChange={e => setAchievementForm({...achievementForm, title: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Student/Team Name</label>
                      <input value={achievementForm.student} onChange={e => setAchievementForm({...achievementForm, student: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Category</label>
                      <input value={achievementForm.category} onChange={e => setAchievementForm({...achievementForm, category: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" placeholder="e.g. Hackathon, Research" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Image URL</label>
                      <input value={achievementForm.image_url} onChange={e => setAchievementForm({...achievementForm, image_url: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Icon</label>
                      <select value={achievementForm.icon} onChange={e => setAchievementForm({...achievementForm, icon: e.target.value})} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                        <option value="Award">Award</option>
                        <option value="Trophy">Trophy</option>
                        <option value="Medal">Medal</option>
                        <option value="Star">Star</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">Description</label>
                      <textarea value={achievementForm.description} onChange={e => setAchievementForm({...achievementForm, description: e.target.value})} rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-2.5 mt-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex justify-center items-center gap-2">
                    {isSubmitting ? 'Saving...' : 'Save Achievement'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      

      
{/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl z-10"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.04), hsl(217 91% 60% / 0.01))' }}
            >
              <h3 className="font-display font-extrabold text-foreground text-lg mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  disabled={isConfirming}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isConfirming}
                  onClick={async () => {
                    setIsConfirming(true);
                    try {
                      await confirmModal.onConfirm();
                    } finally {
                      setIsConfirming(false);
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all flex items-center justify-center gap-1.5 min-w-[80px] disabled:opacity-50 ${
                    confirmModal.isDestructive
                      ? 'bg-destructive hover:bg-destructive/90'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isConfirming && <Loader2 size={12} className="animate-spin" />}
                  {isConfirming ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Modal Overlay */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMemberModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.04), hsl(217 91% 60% / 0.01))' }}
            >
              <h3 className="font-display font-extrabold text-foreground text-lg mb-2">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Configure details for the core AI Club member.
              </p>

              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Parth Agrawal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Role</label>
                    <select
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="Convenor">Convenor</option>
                      <option value="Deputy Convenor">Deputy Convenor</option>
                      <option value="Core Member">Core Member</option>
                      <option value="Extended Core Member">Extended Core Member</option>
                      <option value="Member">Member</option>
                      <option value="Ex Convenor">Ex Convenor</option>
                      <option value="Ex Deputy Convenor">Ex Deputy Convenor</option>
                      <option value="Ex Core Member">Ex Core Member</option>
                      <option value="Alumni">Alumni</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Order No</label>
                    <input
                      type="number"
                      value={memberForm.order_no}
                      onChange={(e) => setMemberForm({ ...memberForm, order_no: Number(e.target.value) })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Photo URL</label>
                  <input
                    type="text"
                    value={memberForm.photo}
                    onChange={(e) => setMemberForm({ ...memberForm, photo: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://drive.google.com/thumbnail?id=..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">GitHub Link</label>
                    <input
                      type="text"
                      value={memberForm.github}
                      onChange={(e) => setMemberForm({ ...memberForm, github: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">LinkedIn Link</label>
                    <input
                      type="text"
                      value={memberForm.linkedin}
                      onChange={(e) => setMemberForm({ ...memberForm, linkedin: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. https://linkedin.com/in/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Description / Bio</label>
                  <textarea
                    rows={3}
                    value={memberForm.description}
                    onChange={(e) => setMemberForm({ ...memberForm, description: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Brief description about projects, interests, or background..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Modal Overlay */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.04), hsl(217 91% 60% / 0.01))' }}
            >
              <h3 className="font-display font-extrabold text-foreground text-lg mb-2">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Configure details for the student-made AI Club project.
              </p>

              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Project Title</label>
                  <input
                    type="text"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. ShelfMind AI"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Author Name</label>
                    <input
                      type="text"
                      value={projectForm.author}
                      onChange={(e) => setProjectForm({ ...projectForm, author: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Kush Ashvinbhai Patel"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Linked Member Profile (Optional)</label>
                    <select
                      value={projectForm.author_id}
                      onChange={(e) => setProjectForm({ ...projectForm, author_id: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Not linked</option>
                      {adminMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">GitHub Repository Link</label>
                  <input
                    type="text"
                    value={projectForm.github_link}
                    onChange={(e) => setProjectForm({ ...projectForm, github_link: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://github.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Contributors / Team Members (Optional)</label>
                  <input
                    type="text"
                    value={projectForm.contributors}
                    onChange={(e) => setProjectForm({ ...projectForm, contributors: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Anmol Ghogare, Saumya Tinna, Parth Agrawal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={projectForm.tags}
                    onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Machine Learning, Computer Vision, Python"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Describe what the project does, technology stack, metrics, etc..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Past Event Modal Overlay */}
      <AnimatePresence>
        {isPastEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPastEventModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.04), hsl(217 91% 60% / 0.01))' }}
            >
              <h3 className="font-display font-extrabold text-foreground text-lg mb-2">
                {editingPastEvent ? 'Edit Past Event' : 'Add New Past Event'}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Configure details for the archived past event to display on the public page.
              </p>

              <form onSubmit={handlePastEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Event Title</label>
                  <input
                    type="text"
                    value={pastEventForm.title}
                    onChange={(e) => setPastEventForm({ ...pastEventForm, title: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Intro to Neural Networks"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                    <select
                      value={pastEventForm.category}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, category: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="workshop">Workshop</option>
                      <option value="hackathon">Hackathon</option>
                      <option value="competition">Competition</option>
                      <option value="talk">Guest Lecture / Talk</option>
                      <option value="seminar">Seminar / Webinar</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Event Date (Label)</label>
                    <input
                      type="text"
                      value={pastEventForm.date_label}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, date_label: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. October 15, 2025"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Image URL</label>
                  <input
                    type="text"
                    value={pastEventForm.image_url}
                    onChange={(e) => setPastEventForm({ ...pastEventForm, image_url: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://images.unsplash.com/..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Participants</label>
                    <input
                      type="number"
                      value={pastEventForm.participants}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, participants: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={pastEventForm.sort_order}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, sort_order: Number(e.target.value) })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Speaker (Optional)</label>
                    <input
                      type="text"
                      value={pastEventForm.speaker}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, speaker: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Dr. Jane Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Winners</label>
                    <textarea
                      value={pastEventForm.winners}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, winners: e.target.value })}
                      placeholder="e.g.&#10;1. Dhruvil Patel&#10;2. Saumya Tinna"
                      rows={2}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Winner Link / PDF</label>
                    <input
                      type="url"
                      value={pastEventForm.winner_link}
                      onChange={(e) => setPastEventForm({ ...pastEventForm, winner_link: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={pastEventForm.description}
                    onChange={(e) => setPastEventForm({ ...pastEventForm, description: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Describe the past event in detail..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPastEventModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Past Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal Overlay */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingEvent(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />

            {/* Form Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.05), hsl(217 91% 60% / 0.02))' }}
            >
              {/* Close Button */}
              <button
                onClick={() => setEditingEvent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                ✕
              </button>

              <h3 className="font-display font-extrabold text-foreground text-xl mb-1">Edit Event</h3>
              <p className="text-xs text-muted-foreground mb-6">Modifying event details for: <span className="text-primary font-semibold">{editingEvent.title}</span></p>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="competition">Competition</option>
                      <option value="hackathon">Hackathon</option>
                      <option value="workshop">Workshop</option>
                      <option value="talk">Guest Lecture / Talk</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Image / Banner URL (Optional)</label>
                  <input
                    type="url"
                    value={editForm.banner}
                    onChange={(e) => setEditForm({...editForm, banner: e.target.value})}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://images.unsplash.com/... or https://drive.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">External Registration Link (Optional)</label>
                  <input
                    type="url"
                    value={editForm.registration_link}
                    onChange={(e) => setEditForm({...editForm, registration_link: e.target.value})}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://forms.gle/... or unstop.com/..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">If provided, the "Register Now" button will redirect users to this URL, bypassing the built-in form.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Venue / Online Link</label>
                    <input
                      type="text"
                      value={editForm.venue}
                      onChange={(e) => setEditForm({...editForm, venue: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({...editForm, contact_email: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Type</label>
                    <select
                      value={editForm.event_type}
                      onChange={(e) => setEditForm({...editForm, event_type: e.target.value as any})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="individual">Individual</option>
                      <option value="team">Team</option>
                    </select>
                  </div>
                  
                  {editForm.event_type === 'team' && (
                    <>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Min Team Size</label>
                        <input
                          type="number"
                          min={2}
                          value={editForm.min_team_size}
                          onChange={(e) => setEditForm({...editForm, min_team_size: Number(e.target.value)})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Max Team Size</label>
                        <input
                          type="number"
                          min={editForm.min_team_size}
                          value={editForm.max_team_size}
                          onChange={(e) => setEditForm({...editForm, max_team_size: Number(e.target.value)})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event Start Date</label>
                    <input
                      type="date"
                      value={editForm.event_start_date}
                      onChange={(e) => setEditForm({...editForm, event_start_date: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Event End Date</label>
                    <input
                      type="date"
                      value={editForm.event_end_date}
                      onChange={(e) => setEditForm({...editForm, event_end_date: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">End Time</label>
                    <input
                      type="time"
                      value={editForm.end_time}
                      onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Registration Start Date</label>
                    <input
                      type="datetime-local"
                      value={editForm.registration_start}
                      onChange={(e) => setEditForm({...editForm, registration_start: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Registration End Date</label>
                    <input
                      type="datetime-local"
                      value={editForm.registration_end}
                      onChange={(e) => setEditForm({...editForm, registration_end: e.target.value})}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={4}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Winners (Optional)</label>
                  <textarea
                    value={editForm.winners}
                    onChange={(e) => setEditForm({...editForm, winners: e.target.value})}
                    rows={3}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Declare competition winners, e.g.&#10;1st: Daiya Jeet Ajaykumar&#10;2nd: Tirth Gandhi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">Winner Document / Link (Optional)</label>
                  <input
                    type="url"
                    value={editForm.winner_link}
                    onChange={(e) => setEditForm({...editForm, winner_link: e.target.value})}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    placeholder="e.g. https://drive.google.com/... or https://domain.com/winners.pdf"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 mt-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Details Modal */}
      <AnimatePresence>
        {selectedRegId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedRegId(null); setSelectedRegDetail(null); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] z-10"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.05), hsl(217 91% 60% / 0.02))' }}
            >
              {/* Close Button */}
              <button
                onClick={() => { setSelectedRegId(null); setSelectedRegDetail(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                ✕
              </button>

              <h3 className="font-display font-extrabold text-foreground text-xl mb-1">Registration Details</h3>
              <p className="text-xs text-muted-foreground mb-6">Inspecting registration ID: <span className="text-primary font-mono">{selectedRegId}</span></p>

              {loadingRegDetail ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                  <span className="text-xs text-muted-foreground font-mono">Fetching data...</span>
                </div>
              ) : selectedRegDetail ? (
                <div className="space-y-6">
                  {/* User profile metadata */}
                  <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-display text-lg font-extrabold text-primary border border-primary/20">
                      {selectedRegDetail.user_name ? selectedRegDetail.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm leading-snug">{selectedRegDetail.user_name}</h4>
                      <p className="text-xs text-muted-foreground leading-normal">{selectedRegDetail.user_email}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Registered at: {new Date(selectedRegDetail.registered_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Event & Team Info */}
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
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Team Information</span>
                        <h5 className="font-display font-bold text-sm text-foreground mt-1.5">Team: {selectedRegDetail.team_name}</h5>
                        <p className="text-xs text-primary font-semibold mt-1">Leader: {selectedRegDetail.user_name}</p>
                      </div>
                    )}
                  </div>

                  {/* Team Members List (If applicable) */}
                  {selectedRegDetail.team && selectedRegDetail.team.members && selectedRegDetail.team.members.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Team Members</h4>
                      <div className="space-y-1.5">
                        {selectedRegDetail.team.members.map((member: any) => (
                          <div key={member.id} className="flex justify-between items-center bg-secondary/15 p-2 px-3 rounded-lg border border-border/30 text-xs">
                            <span className="font-medium text-foreground">{member.member_name}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">{member.member_email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Form Fields Responses */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Form Responses</h4>
                    
                    {Object.keys(selectedRegDetail.responses_flat || {}).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No custom fields were configured for this event.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(selectedRegDetail.responses_flat).map(([label, val]: [string, any]) => {
                          const isUpload = selectedRegDetail.uploaded_files && selectedRegDetail.uploaded_files.some((f: any) => f.field_label === label);
                          return (
                            <div key={label} className="bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                              <span className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">{label}</span>
                              <div className="mt-1 text-sm font-medium text-foreground">
                                {isUpload ? (
                                  (() => {
                                    const fileObj = selectedRegDetail.uploaded_files.find((f: any) => f.field_label === label);
                                    return fileObj ? (
                                      <a
                                        href={getApiUrl(fileObj.file_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                      >
                                        <FileText size={14} />
                                        {fileObj.original_name || 'Download file'}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">File not found</span>
                                    );
                                  })()
                                ) : Array.isArray(val) ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {val.map((item: string) => (
                                      <span key={item} className="text-xs bg-secondary px-2.5 py-0.5 rounded border border-border/30 text-foreground">{item}</span>
                                    ))}
                                  </div>
                                ) : typeof val === 'boolean' ? (
                                  <span>{val ? 'Yes' : 'No'}</span>
                                ) : (
                                  <span className="whitespace-pre-wrap">{String(val)}</span>
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
                <p className="text-xs text-muted-foreground text-center py-8">Failed to render registration details.</p>
              )}
            </motion.div>
          </div>
        )}

        {/* Edit Field Modal */}
        {editingForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingForm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6 overflow-hidden">
              <h3 className="text-lg font-bold text-foreground mb-4 font-serif">Edit Form Field</h3>
              <form onSubmit={handleUpdateField} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Label</label>
                  <input type="text" value={editingForm.label} onChange={e => setEditingForm({...editingForm, label: e.target.value})} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Placeholder</label>
                  <input type="text" value={editingForm.placeholder || ''} onChange={e => setEditingForm({...editingForm, placeholder: e.target.value})} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Required</label>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={editingForm.required} onChange={e => setEditingForm({...editingForm, required: e.target.checked})} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm text-foreground">Yes</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Order No</label>
                    <input type="number" value={editingForm.order_no} onChange={e => setEditingForm({...editingForm, order_no: Number(e.target.value)})} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" required />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border mt-6">
                  <button type="button" onClick={() => setEditingForm(null)} className="flex-1 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors">Cancel</button>
                  <button type="submit" disabled={addingField} className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {addingField ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* News Modal */}
      <AnimatePresence>
        {isNewsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsNewsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingNews ? 'Edit News' : 'Add News'}
                </h3>
                <button
                  onClick={() => setIsNewsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleNewsSubmit} className="p-6 space-y-5 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Enter news title (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newsForm.description}
                    onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                    placeholder="Enter news description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link (LinkedIn, Article, etc.)</label>
                  <input
                    type="url"
                    value={newsForm.link}
                    onChange={(e) => setNewsForm({ ...newsForm, link: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="https://... (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sources</label>
                  <input
                    type="text"
                    value={newsForm.sources}
                    onChange={(e) => setNewsForm({ ...newsForm, sources: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Enter sources if any (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={newsForm.image_url}
                    onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Enter image URL (optional)"
                  />
                </div>


                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingNews}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {loadingNews ? <Loader2 size={18} className="animate-spin" /> : editingNews ? 'Update News' : 'Add News'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {isResourceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsResourceModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingResource ? 'Edit Resource' : 'Add Resource'}
                </h3>
                <button
                  onClick={() => setIsResourceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleResourceSubmit} className="p-6 space-y-5 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Enter resource title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={resourceForm.description}
                    onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                    placeholder="Enter short description"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Resource Type</label>
                    <select
                      value={resourceForm.resource_type}
                      onChange={(e) => setResourceForm({ ...resourceForm, resource_type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    >
                      <option value="VIDEO">Video</option>
                      <option value="COURSE">Course</option>
                      <option value="BOOK">Book</option>
                      <option value="PAPER">Paper / Essay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Order No (Sorting)</label>
                    <input
                      type="number"
                      value={resourceForm.order_no}
                      onChange={(e) => setResourceForm({ ...resourceForm, order_no: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL (Resource Link)</label>
                  <input
                    type="url"
                    value={resourceForm.url}
                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="https://..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic / Group Name</label>
                  <input
                    type="text"
                    value={resourceForm.group_name}
                    onChange={(e) => setResourceForm({ ...resourceForm, group_name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="e.g. Start Here, Neural Networks, Go Deeper"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsResourceModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : editingResource ? 'Update Resource' : 'Add Resource'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Week Creation/Edit Modal */}
      <AnimatePresence>
        {isWeekModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsWeekModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingWeek ? `Edit Week ${editingWeek.week_number}` : 'Add New Week'}
                </h3>
                <button
                  onClick={() => setIsWeekModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveWeek} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Number</label>
                    <input
                      type="number"
                      value={weekForm.week_number}
                      onChange={(e) => setWeekForm({ ...weekForm, week_number: parseInt(e.target.value) || 1 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order No</label>
                    <input
                      type="number"
                      value={weekForm.order_no}
                      onChange={(e) => setWeekForm({ ...weekForm, order_no: parseInt(e.target.value) || 1 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Title</label>
                  <input
                    type="text"
                    value={weekForm.title}
                    onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    placeholder="e.g. Week 1: Foundations of Neural Networks"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                  <textarea
                    value={weekForm.description}
                    onChange={(e) => setWeekForm({ ...weekForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
                    placeholder="Short summary of this week's goals"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Date / Deadline (For Ticking Clock)</label>
                  <input
                    type="datetime-local"
                    value={weekForm.target_date ? weekForm.target_date.slice(0, 16) : ''}
                    onChange={(e) => setWeekForm({ ...weekForm, target_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_current_chk"
                    checked={weekForm.is_current}
                    onChange={(e) => setWeekForm({ ...weekForm, is_current: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="is_current_chk" className="text-sm font-bold text-slate-800">
                    Set as Current Active Week (Ticking Clock Highlight)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsWeekModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
                  >
                    {editingWeek ? 'Update Week' : 'Create Week'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Weekly Resource Creation/Edit Modal */}
      <AnimatePresence>
        {isWeeklyResourceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsWeeklyResourceModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingWeeklyResource ? 'Edit Weekly Resource' : 'Add Resource to Week'}
                </h3>
                <button
                  onClick={() => setIsWeeklyResourceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveWeeklyResource} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Week</label>
                  <select
                    value={weeklyResourceForm.week_id}
                    onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, week_id: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  >
                    <option value={0}>Select a Week...</option>
                    {weeklyVenezaWeeks.map(w => (
                      <option key={w.id} value={w.id}>Week {w.week_number}: {w.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource Title</label>
                  <input
                    type="text"
                    value={weeklyResourceForm.title}
                    onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    placeholder="e.g. 3Blue1Brown — Neural Networks"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                  <textarea
                    value={weeklyResourceForm.description}
                    onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
                    placeholder="Why this resource is valuable and key takeaways"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource Type</label>
                    <select
                      value={weeklyResourceForm.resource_type}
                      onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, resource_type: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    >
                      <option value="VIDEO">Video</option>
                      <option value="COURSE">Course</option>
                      <option value="BOOK">Book</option>
                      <option value="PAPER">Paper</option>
                      <option value="ARTICLE">Article</option>
                      <option value="CODE">Code</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Est. Minutes</label>
                    <input
                      type="number"
                      value={weeklyResourceForm.est_minutes}
                      onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, est_minutes: parseInt(e.target.value) || 45 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resource URL</label>
                  <input
                    type="url"
                    value={weeklyResourceForm.url}
                    onChange={(e) => setWeeklyResourceForm({ ...weeklyResourceForm, url: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsWeeklyResourceModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
                  >
                    {editingWeeklyResource ? 'Update Resource' : 'Add Resource'}
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
