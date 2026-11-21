import { Bell, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BRAND_ASSETS, formatCurrency } from '../lib/validation';
import { NavTab } from '../types/esports';

interface TopBarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
}

const DESKTOP_LINKS: { id: NavTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'matches', label: 'Matches' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'results', label: 'Results' },
  { id: 'profile', label: 'Profile' },
];

export function TopBar({
  activeTab,
  onNavigate,
  unreadCount,
  onOpenNotifications,
}: TopBarProps) {
  const { profile, wallet } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo & Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left"
        >
          <img
            src={BRAND_ASSETS.logo}
            alt="AJAY BATTLES"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-white/15"
          />
          <span className="font-display text-xl font-extrabold tracking-wider text-white">
            AJAY BATTLES
          </span>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {DESKTOP_LINKS.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'profile' && activeTab === 'my-tournaments');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-white border-[#FF6B1A]'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Wallet Shortcut, Notifications, Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            aria-label="Open Wallet"
            className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-xs font-mono-num font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            <WalletIcon className="w-4 h-4 text-[#FF6B1A]" />
            <span>{formatCurrency(wallet?.totalBalance ?? 0)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 transition-colors shrink-0"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B1A] text-[10px] font-bold text-white flex items-center justify-center font-mono-num">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label="Profile"
            className="w-10 h-10 rounded-xl bg-[#9D4EDD]/20 hover:bg-[#9D4EDD]/30 border border-[#9D4EDD]/40 flex items-center justify-center text-xs font-bold text-white transition-colors shrink-0 overflow-hidden"
          >
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.gameName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(profile?.gameName || 'AB').slice(0, 2).toUpperCase()}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
