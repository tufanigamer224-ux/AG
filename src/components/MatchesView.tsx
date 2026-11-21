import { useMemo, useState } from 'react';
import { Search, Swords } from 'lucide-react';
import { GameMode, Tournament, TournamentParticipant, TournamentStatus } from '../types/esports';
import { TournamentCard } from './TournamentCard';

interface MatchesViewProps {
  tournaments: Tournament[];
  registrationsByTournament: Record<string, TournamentParticipant>;
  initialStatusFilter?: 'All' | TournamentStatus;
  initialModeFilter?: 'All' | GameMode;
  onViewDetails: (tournament: Tournament) => void;
  onViewPass: (tournament: Tournament) => void;
}

const MODE_CATEGORIES: ('All' | GameMode)[] = [
  'All',
  'Solo',
  'Duo',
  'Squad',
  'Clash Squad 1v1',
  'Custom Room',
];

type QuickFilter = 'All' | 'Upcoming' | 'Ongoing' | 'Completed' | 'Free' | 'Paid';
const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'Ongoing', label: 'Ongoing' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Free', label: 'Free Entry' },
  { id: 'Paid', label: 'Paid Entry' },
];

export function MatchesView({
  tournaments,
  registrationsByTournament,
  initialStatusFilter = 'All',
  initialModeFilter = 'All',
  onViewDetails,
  onViewPass,
}: MatchesViewProps) {
  const [selectedMode, setSelectedMode] = useState<'All' | GameMode>(initialModeFilter);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>(
    initialStatusFilter === 'Cancelled' ? 'All' : initialStatusFilter
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (selectedMode !== 'All' && t.gameMode !== selectedMode) return false;
      if (selectedFilter === 'Upcoming' && t.status !== 'Upcoming') return false;
      if (selectedFilter === 'Ongoing' && t.status !== 'Ongoing') return false;
      if (selectedFilter === 'Completed' && t.status !== 'Completed') return false;
      if (selectedFilter === 'Free' && t.entryFee !== 0) return false;
      if (selectedFilter === 'Paid' && t.entryFee <= 0) return false;
      if (q) {
        const matchName = t.name.toLowerCase().includes(q);
        const matchCode = t.matchId.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [tournaments, selectedMode, selectedFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Tournaments & Matches
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse live Free Fire rooms, filter by format, and join verified brackets.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or Match ID..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#0e1426] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
          />
        </div>
      </div>

      {/* Mode Categories */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {MODE_CATEGORIES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSelectedMode(mode)}
            className={`h-10 px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedMode === mode
                ? 'bg-[#FF6B1A] text-white'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            {mode === 'All' ? 'All Matches' : mode}
          </button>
        ))}
      </div>

      {/* Status & Fee Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#0e1426] border border-white/10 w-fit max-w-full">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              selectedFilter === f.id
                ? 'bg-[#9D4EDD] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <Swords className="w-10 h-10 text-slate-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-white">
            No Matching Tournaments
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No tournaments match your current filters, or tournaments are still being scheduled in the Admin Panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              registration={registrationsByTournament[t.id]}
              onViewDetails={onViewDetails}
              onViewPass={onViewPass}
            />
          ))}
        </div>
      )}
    </div>
  );
}
