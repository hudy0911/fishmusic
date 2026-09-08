import { Moon, Sun } from 'lucide-react';
import Tooltip from './Tooltip';
import { useAppTheme } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useAppTheme();
  const light = theme === 'light';

  return (
    <Tooltip content={light ? '切换深色主题' : '切换浅色主题'}>
      <button
        type="button"
        onClick={() => setTheme(light ? 'dark' : 'light')}
        aria-label={light ? '切换深色主题' : '切换浅色主题'}
        className="fixed right-4 top-4 z-[120] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 shadow-lg backdrop-blur-xl transition-colors hover:bg-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netease-red/50"
      >
        {light ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      </button>
    </Tooltip>
  );
}
