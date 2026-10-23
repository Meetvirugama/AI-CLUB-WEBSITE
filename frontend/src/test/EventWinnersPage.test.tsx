import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventWinnersPage from '../pages/EventWinnersPage';
import { INITIAL_SHOWCASE_EVENTS } from '../components/winners/initialData';

vi.mock('@/lib/apiClient', () => ({
  api: {
    get: vi.fn().mockImplementation((path: string) => {
      if (path.includes('/api/events/winners')) {
        return Promise.resolve(INITIAL_SHOWCASE_EVENTS);
      }
      return Promise.resolve([]);
    }),
  },
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

function renderPage(initialEntries = ['/winners']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/winners" element={<EventWinnersPage />} />
          <Route path="/events/:id/winners" element={<EventWinnersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventWinnersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders back to events navigation button', () => {
    renderPage();

    const backBtn = screen.getByTestId('back-to-events-btn');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/events');
    expect(within(backBtn).getByText(/Back to Events/i)).toBeInTheDocument();
  });

  it('renders only selected event title and its official winners', () => {
    renderPage(['/events/past-6/winners']);

    expect(screen.getByRole('heading', { level: 1, name: /AI Buildathon 2026/i })).toBeInTheDocument();
    expect(screen.getByText(/OFFICIAL WINNERS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cheetah Sprinter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CHAMPION · 1ST PLACE/i).length).toBeGreaterThan(0);
  });

  it('does not render other events archive grid or promotional showcase hero', () => {
    renderPage(['/events/past-6/winners']);

    // Should NOT have the promotional hero or archive section
    expect(screen.queryByText(/Every win has a story/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/From Our Archives/i)).not.toBeInTheDocument();

    // Should NOT render titles of other competitions as headings or cards on this page
    expect(screen.queryByRole('heading', { name: /Integration Bee/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Kaggle Contest/i })).not.toBeInTheDocument();
  });

  it('opens winner detail modal when details button is clicked', async () => {
    renderPage(['/events/past-6/winners']);

    // Click on details for Cheetah Sprinter
    const detailsBtn = screen.getAllByTestId('winner-details-btn-past-6-w1')[0];
    fireEvent.click(detailsBtn);

    let dialog: HTMLElement | null = null;
    await waitFor(() => {
      dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    const dialogWithin = within(dialog!);
    expect(dialogWithin.getByRole('heading', { level: 2, name: /Cheetah Sprinter/i })).toBeInTheDocument();
    expect(dialogWithin.getByText(/DAU Pulse/i)).toBeInTheDocument();
    expect(dialogWithin.getByText(/1ST PLACE CHAMPION/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('switches to another event using the event switcher dropdown', async () => {
    renderPage(['/events/past-6/winners']);

    const select = screen.getByTestId('event-switcher-select');
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'past-3' } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Kaggle Contest/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Dhruvil Patel/i).length).toBeGreaterThan(0);
    });
  });

  it('renders event not found state gracefully for unknown event ID', () => {
    renderPage(['/events/unknown-event-999/winners']);

    expect(screen.getByRole('heading', { level: 3, name: /Event Not Found/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to All Events/i)).toBeInTheDocument();
  });
});
