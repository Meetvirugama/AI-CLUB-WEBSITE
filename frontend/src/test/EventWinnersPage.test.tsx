import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        <EventWinnersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventWinnersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders championship hero heading and subtitle', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Every win has a/i })).toBeInTheDocument();
    expect(
      screen.getByText(/The people and teams who pushed boundaries and made their mark/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/FEATURED EVENT/i)).toBeInTheDocument();
  });

  it('renders official results podium with first place champion', () => {
    renderPage();

    expect(screen.getByText('The Podium')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Official Results/i })).toBeInTheDocument();
    // Default featured event is AI Buildathon 2026 with Cheetah Sprinter as champion
    expect(screen.getAllByText(/Cheetah Sprinter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CHAMPION · 1ST PLACE/i).length).toBeGreaterThan(0);
  });

  it('renders complete results section and filters by search', async () => {
    renderPage();

    const resultsHeading = screen.getByRole('heading', { level: 2, name: /All Results/i });
    expect(resultsHeading).toBeInTheDocument();
    const resultsSection = resultsHeading.closest('section')!;
    expect(within(resultsSection).getByText(/All Placements/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search team, member, project…/i);
    fireEvent.change(searchInput, { target: { value: 'Chaos' } });

    await waitFor(() => {
      expect(within(resultsSection).getByText('Chaos')).toBeInTheDocument();
      expect(within(resultsSection).queryByText('Cheetah Sprinter')).not.toBeInTheDocument();
    });
  });

  it('opens winner detail modal when details button is clicked', async () => {
    renderPage();

    // Click on the details button for Cheetah Sprinter
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

  it('renders past events archive and displays previous competitions', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: /From Our Archives/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Kaggle Contest/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Integration Bee/i })).toBeInTheDocument();
  });

  it('navigates to archive competition when archive card is clicked', async () => {
    renderPage();

    const integrationBeeCard = screen.getByTestId('archive-card-past-2');
    fireEvent.click(integrationBeeCard);

    await waitFor(() => {
      // Podium should now show Dirgh Patel
      expect(screen.getAllByText(/Dirgh Patel/i).length).toBeGreaterThan(0);
    });
  });
});

