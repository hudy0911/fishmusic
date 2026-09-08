import { Moon, Sun } from 'lucide-react';
import Tooltip from './Tooltip';
import { useAppTheme } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useAppTheme();
  const light = theme === 'light';

  return (
    <Tooltip content={light ? '切换深色主题' : '切换浅色主题'}>
      <button
        type="button"
        onClick={() => setTheme(light ? 'dark' : 'light')}
        aria-label={light ? '切换深色主题' : '切换浅色主题'}
        aria-pressed={light}
        className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-netease-border/70 bg-surface-raised/80 text-netease-muted shadow-sm backdrop-blur-xl transition-colors hover:bg-surface-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netease-red/50 ${className}`}
      >
        {light ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      </button>
    </Tooltip>
  );
}
