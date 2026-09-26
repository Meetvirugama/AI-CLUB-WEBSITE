import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import EventsPage from "./pages/EventsPage.tsx";
import ProjectsPage from "./pages/ProjectsPage.tsx";
import TeamPage from "./pages/TeamPage.tsx";
import AchievementsPage from "./pages/AchievementsPage.tsx";
import NewsPage from "./pages/NewsPage.tsx";
import ResourcesPage from "./pages/ResourcesPage.tsx";
import AuraPage from "./pages/AuraPage.tsx";
import AuthBarrier from "./components/AuthBarrier.tsx";
import Navbar from "./components/club/Navbar.tsx";
import Chatbot from "./chatbot/Chatbot.tsx";
import BackgroundCanvas from "./components/club/BackgroundCanvas.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { startSession, trackPageView } from "./lib/analytics";
import { NeuralAwakening } from "./components/intro/NeuralAwakening";

// Lazy-load heavier pages to keep the initial bundle small
const Admin = lazy(() => import("./pages/Admin.tsx"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage.tsx"));
const MyRegistrationsPage = lazy(() => import("./pages/MyRegistrationsPage.tsx"));
const RoadmapDetailPage = lazy(() => import("./pages/RoadmapDetailPage.tsx"));
const CurriculumPage = lazy(() => import("./pages/CurriculumPage.tsx"));
const WeeklyVenezaPage = lazy(() => import("./pages/WeeklyVenezaPage.tsx"));

const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder_client_id_for_google_oauth_provider.apps.googleusercontent.com";

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,50%)', fontSize: '0.9rem' }}>
    Loading…
  </div>
);

const HeaderNavbar = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/aura')) {
    return null;
  }
  return <Navbar />;
};

// Mirrors HeaderNavbar exclusion pattern — hide chatbot on /admin and /aura.
// /admin has its own dedicated UI; /aura is a standalone experience.
const GlobalChatbot = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/aura')) {
    return null;
  }
  return <Chatbot />;
};

// Tracks page views on every route change and starts the session on mount.
const RouteTracker = () => {
  const location = useLocation();
  const mounted  = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      startSession();
    }
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
};

const App = () => {
  return (
  <AppErrorBoundary>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <NeuralAwakening onComplete={() => {}} />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteTracker />
              <BackgroundCanvas />
              <ScrollToTop />
              <HeaderNavbar />
              <GlobalChatbot />
              <Routes>
                {/* ── Public routes — no login required ── */}
                <Route path="/" element={<Index />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/aura" element={<AuraPage />} />
                <Route path="/weekly-veneza" element={<Suspense fallback={<Loader />}><WeeklyVenezaPage /></Suspense>} />
                <Route path="/curriculum" element={<Suspense fallback={<Loader />}><CurriculumPage /></Suspense>} />

                {/* ── Roadmap detail page ── */}
                <Route path="/roadmaps/:slug" element={
                  <Suspense fallback={<Loader />}>
                    <RoadmapDetailPage />
                  </Suspense>
                } />

                {/* ── Event detail page ── */}
                <Route path="/events/:id" element={
                  <Suspense fallback={<Loader />}>
                    <EventDetailPage />
                  </Suspense>
                } />

                {/* ── My registrations (auth handled inside page) ── */}
                <Route path="/my-registrations" element={
                  <Suspense fallback={<Loader />}>
                    <MyRegistrationsPage />
                  </Suspense>
                } />

                {/* ── Protected admin route ── */}
                <Route path="/admin" element={
                  <AuthBarrier requireAdmin={true}>
                    <Suspense fallback={<Loader />}>
                      <Admin />
                    </Suspense>
                  </AuthBarrier>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </AppErrorBoundary>
  );
};

export default App;
