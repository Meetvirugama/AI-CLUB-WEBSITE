import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { parseLocalDate, parseLocalDateTime } from '../../lib/utils';

export default function CreateEventTab() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventMessage, setEventMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        event_date: parseLocalDate(eventForm.event_start_date), // Keep event_date for backwards compatibility if needed
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboardMetrics'] });
    } catch (err: any) {
      setEventMessage({ type: 'error', text: err.message || 'Error creating event' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
}
