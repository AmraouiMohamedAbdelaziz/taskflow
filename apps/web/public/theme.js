// Run before CSS/React to reduce a flash of the wrong theme. No network request data.
(() => {
  let preference;
  try { preference = localStorage.getItem('taskflow-theme'); } catch { /* Use system. */ }
  document.documentElement.dataset.theme = preference === 'light' || preference === 'dark'
    ? preference : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
})();
