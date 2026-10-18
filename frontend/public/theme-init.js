// Runs before the app bundle so the stored theme applies on first paint (no flash).
// Kept as a file because the site CSP blocks inline scripts.
// Only the redesigned pages support dark mode; keep in sync with THEMED_PATHS in components/redesign/theme.tsx.
(function () {
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var themed = path === '/' || path === '/news' || path === '/weekly-veneza';
  var theme = 'dark';
  try {
    var stored = localStorage.getItem('ai-club-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (e) {}
  var root = document.documentElement;
  if (themed) root.classList.add('rd-route');
  if (themed && theme === 'dark') root.classList.add('dark');
  root.style.colorScheme = themed ? theme : 'light';
})();
