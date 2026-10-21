import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { ShowcaseEvent, EventWinner } from '@/components/winners/types';
import { INITIAL_SHOWCASE_EVENTS } from '@/components/winners/initialData';
import { EventWinnersHero } from '@/components/winners/EventWinnersHero';
import { EventSelector } from '@/components/winners/EventSelector';
import { WinnersPodium } from '@/components/winners/WinnersPodium';
import { ResultsSection } from '@/components/winners/ResultsSection';
import { PastEventsArchive } from '@/components/winners/PastEventsArchive';
import { WinnerDetailModal } from '@/components/winners/WinnerDetailModal';
import { EventWinnersFooter } from '@/components/winners/EventWinnersFooter';
import { ComponentErrorBoundary } from '@/components/common/ComponentErrorBoundary';
import '@/components/winners/winners-page.css';

const EventWinnersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWinner, setSelectedWinner] = useState<EventWinner | null>(null);

  // Fetch live winners from the backend API
  const { data: remoteEvents, isLoading, isError } = useQuery<ShowcaseEvent[]>({
    queryKey: ['event-winners-showcase'],
    queryFn: async () => {
      return await api.get<ShowcaseEvent[]>('/api/events/winners');
    },
    staleTime: 5 * 60 * 1000,
  });

  // Effective events: remote API data if available, fallback to verified initial data
  const allEvents = useMemo(() => {
    if (remoteEvents && Array.isArray(remoteEvents) && remoteEvents.length > 0) {
      return remoteEvents;
    }
    return INITIAL_SHOWCASE_EVENTS;
  }, [remoteEvents]);

  // Filtered events based on year and category controls
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (selectedYear !== 'all' && ev.edition !== selectedYear) {
        return false;
      }
      if (
        selectedCategory !== 'all' &&
        (ev.category || '').toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [allEvents, selectedYear, selectedCategory]);

  // Determine active event from URL search params or default to featured
  const activeEvent = useMemo(() => {
    const eventParam = searchParams.get('event');
    if (eventParam) {
      const match = allEvents.find(
        (e) =>
          e.id.toLowerCase() === eventParam.toLowerCase() ||
          e.id.endsWith(`-${eventParam}`)
      );
      if (match) return match;
    }

    // Default to the first featured event, or first filtered event, or first event overall
    const featured = allEvents.find((e) => e.featured);
    return featured || filteredEvents[0] || allEvents[0];
  }, [searchParams, allEvents, filteredEvents]);

  // Sync winner detail modal from URL param on load
  useEffect(() => {
    const winnerParam = searchParams.get('winner');
    if (winnerParam && activeEvent) {
      const matchedWinner = (activeEvent.winners || []).find(
        (w) => w.id.toLowerCase() === winnerParam.toLowerCase()
      );
      if (matchedWinner) {
        setSelectedWinner(matchedWinner);
      }
    }
  }, []);

  // Set document title for SEO
  useEffect(() => {
    const prevTitle = document.title;
    if (activeEvent) {
      document.title = `${activeEvent.title} — Official Winners & Results | AI Club DA-IICT`;
    } else {
      document.title = 'Event Winners & Championship Showcase — AI Club DA-IICT';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [activeEvent]);

  // Event selection handler: updates state and syncs URL query parameter
  const handleSelectEvent = (event: ShowcaseEvent) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('event', event.id);
      next.delete('winner');
      return next;
    });
  };

  // Winner selection handler: opens modal and sets URL query parameter
  const handleSelectWinner = (winner: EventWinner) => {
    setSelectedWinner(winner);
    try {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (activeEvent) {
          next.set('event', activeEvent.id);
        }
        next.set('winner', winner.id);
        return next;
      });
    } catch {
      // safe fallback in test environments
    }
  };

  // Modal close handler: clears modal and removes winner URL query param
  const handleCloseModal = () => {
    setSelectedWinner(null);
    try {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('winner');
        return next;
      });
    } catch {
      // safe fallback in test environments
    }
  };

  return (
    <div className="winners-page-root">
      <ComponentErrorBoundary name="EventWinnersHero">
        {activeEvent && (
          <EventWinnersHero
            event={activeEvent}
            allEvents={allEvents}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </ComponentErrorBoundary>

      <ComponentErrorBoundary name="EventSelector">
        {activeEvent && (
          <EventSelector
            events={allEvents}
            activeEvent={activeEvent}
            onSelectEvent={handleSelectEvent}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
      </ComponentErrorBoundary>

      {/* Podium Section */}
      <ComponentErrorBoundary name="WinnersPodium">
        {activeEvent && (
          <WinnersPodium
            event={activeEvent}
            onSelectWinner={handleSelectWinner}
          />
        )}
      </ComponentErrorBoundary>

      {/* Complete Leaderboard & Results */}
      <ComponentErrorBoundary name="ResultsSection">
        {activeEvent && (
          <ResultsSection
            event={activeEvent}
            onSelectWinner={handleSelectWinner}
          />
        )}
      </ComponentErrorBoundary>

      {/* Past Events Archive */}
      <ComponentErrorBoundary name="PastEventsArchive">
        <PastEventsArchive
          events={allEvents}
          activeEventId={activeEvent?.id || ''}
          onSelectEvent={handleSelectEvent}
        />
      </ComponentErrorBoundary>

      {/* Winner Detail Modal */}
      <WinnerDetailModal
        winner={selectedWinner}
        event={activeEvent}
        onClose={handleCloseModal}
      />

      {/* Dedicated Showcase Footer */}
      <EventWinnersFooter />
    </div>
  );
};

export default EventWinnersPage;
