import { Home, Swords, Trophy, User, Wallet } from 'lucide-react';
import { NavTab } from '../types/esports';

interface BottomNavProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const NAV_ITEMS: { id: NavTab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'matches', label: 'Matches', Icon: Swords },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
  { id: 'results', label: 'Results', Icon: Trophy },
  { id: 'profile', label: 'Profile', Icon: User },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 md:hidden"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive =
            activeTab === id || (id === 'profile' && activeTab === 'my-tournaments');
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                isActive ? 'text-[#FF6B1A]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#9D4EDD] shadow-[0_0_12px_rgba(255,107,26,0.75)]" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
