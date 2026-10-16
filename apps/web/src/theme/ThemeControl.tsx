import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
type Theme = 'system' | 'light' | 'dark';
function preference(): Theme {
  try { const value = localStorage.getItem('taskflow-theme'); return value === 'light' || value === 'dark' ? value : 'system'; }
  catch { return 'system'; }
}
export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>(preference);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  function select(value: Theme) {
    setTheme(value);
    try { if (value === 'system') localStorage.removeItem('taskflow-theme'); else localStorage.setItem('taskflow-theme', value); }
    catch { /* The theme still works when browser storage is disabled. */ }
  }
  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  return <div className="theme-control"><Icon size={16} aria-hidden="true" />
    <label className="sr-only" htmlFor="theme">Color theme</label>
    <select id="theme" value={theme} onChange={(event) => select(event.target.value as Theme)}>
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select></div>;
}
