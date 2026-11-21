import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Headphones,
  Megaphone,
  Sparkles,
  Swords,
  Trophy,
  Clock,
  FileArchive,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  BRAND_ASSETS,
  formatCurrency,
  formatShortDate,
} from '../lib/validation';
import { seedSandboxTournamentsForAdmin } from '../services/esportsService';
import {
  Announcement,
  GameMode,
  LeaderboardEntry,
  MatchResult,
  NavTab,
  Tournament,
  TournamentParticipant,
  TournamentStatus,
} from '../types/esports';
import { TournamentCard } from './TournamentCard';

interface HomeViewProps {
  tournaments: Tournament[];
  registrationsByTournament: Record<string, TournamentParticipant>;
  announcements: Announcement[];
  matchResults: MatchResult[];
  leaderboard: LeaderboardEntry[];
  onOpenStatusMatches: (status: TournamentStatus) => void;
  onOpenModeMatches: (mode: GameMode) => void;
  onNavigate: (tab: NavTab) => void;
  onViewDetails: (tournament: Tournament) => void;
  onViewPass: (tournament: Tournament) => void;
  onOpenSupport: () => void;
  onOpenExport: (autoStartZip?: boolean) => void;
}

export function HomeView({
  tournaments,
  registrationsByTournament,
  announcements,
  matchResults,
  leaderboard,
  onOpenStatusMatches,
  onOpenModeMatches,
  onNavigate,
  onViewDetails,
  onViewPass,
  onOpenSupport,
  onOpenExport,
}: HomeViewProps) {
  const { isAdminUser } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const upcomingCount = tournaments.filter((t) => t.status === 'Upcoming').length;
  const ongoingCount = tournaments.filter((t) => t.status === 'Ongoing').length;
  const completedCount = tournaments.filter((t) => t.status === 'Completed').length;

  const featured = tournaments.filter((t) => t.featured && t.status !== 'Cancelled').slice(0, 3);
  const freeEntry = tournaments
    .filter((t) => t.entryFee === 0 && t.status === 'Upcoming')
    .slice(0, 3);
  const specialEvents = tournaments.filter((t) => t.specialEvent).slice(0, 3);

  const modeCounts: { mode: GameMode; count: number }[] = [
    { mode: 'Solo', count: tournaments.filter((t) => t.gameMode === 'Solo').length },
    { mode: 'Duo', count: tournaments.filter((t) => t.gameMode === 'Duo').length },
    { mode: 'Squad', count: tournaments.filter((t) => t.gameMode === 'Squad').length },
    {
      mode: 'Clash Squad 1v1',
      count: tournaments.filter((t) => t.gameMode === 'Clash Squad 1v1').length,
    },
  ];

  const handleSeedSandbox = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      await seedSandboxTournamentsForAdmin();
      setSeedMessage('Sandbox test tournaments and sample Room Pass published to Firestore.');
    } catch (err) {
      setSeedMessage(err instanceof Error ? err.message : 'Unable to initialize sandbox data.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[260px] sm:min-h-[320px] flex items-end">
        <img
          src={BRAND_ASSETS.heroBanner}
          alt="AJAY BATTLES Esports Arena"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-[#070913]/75 to-[#070913]/30" />

        <div className="relative z-10 p-6 sm:p-10 w-full flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-wide text-white leading-[1.05] text-balance">
              PLAY LIKE A PRO.
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-xl">
              JOIN TOURNAMENTS AND WIN REAL REWARDS. Daily verified Free Fire custom rooms with instant Room Pass delivery.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('matches')}
            className="h-12 px-6 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            Explore Tournaments
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Admin-only Sandbox Setup Prompt when DB is fresh */}
      {tournaments.length === 0 && isAdminUser && (
        <section className="glass-card rounded-2xl p-5 sm:p-6 border border-[#9D4EDD]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-white">
              Firestore Database Connected (Empty)
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              As the verified project owner, you can initialize clearly-tagged sandbox test tournaments (including a published Room Pass match) to test the join and View Pass flow immediately.
            </p>
            {seedMessage && (
              <p className="text-xs text-emerald-400 pt-1">{seedMessage}</p>
            )}
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedSandbox}
            className="h-11 px-5 rounded-xl bg-[#9D4EDD] hover:bg-[#a855f7] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {seeding ? 'Initializing...' : 'Initialize Sandbox Data'}
          </button>
        </section>
      )}

      {/* Three Large Clickable Tournament Status Cards */}
      <section aria-label="Tournament Status Overview" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onOpenStatusMatches('Upcoming')}
          className="glass-card rounded-2xl p-5 text-left hover:border-[#38BDF8]/50 transition-colors flex items-center justify-between gap-4 group"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#38BDF8]">
              UPCOMING
            </p>
            <p className="font-mono-num text-3xl font-bold text-white">
              {upcomingCount}
            </p>
            <p className="text-xs text-slate-400">Open for registration</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 text-[#38BDF8] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenStatusMatches('Ongoing')}
          className="glass-card rounded-2xl p-5 text-left hover:border-[#FF6B1A]/50 transition-colors flex items-center justify-between gap-4 group"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#FF6B1A]">
              ONGOING
            </p>
            <p className="font-mono-num text-3xl font-bold text-white">
              {ongoingCount}
            </p>
            <p className="text-xs text-slate-400">Live matches running</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenStatusMatches('Completed')}
          className="glass-card rounded-2xl p-5 text-left hover:border-[#9D4EDD]/50 transition-colors flex items-center justify-between gap-4 group"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#9D4EDD]">
              COMPLETED
            </p>
            <p className="font-mono-num text-3xl font-bold text-white">
              {completedCount}
            </p>
            <p className="text-xs text-slate-400">Results published</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#9D4EDD]/10 text-[#9D4EDD] flex items-center justify-center group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </button>
      </section>

      {/* Announcements Strip (if active) */}
      {announcements.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#FF6B1A]" />
            <h2 className="font-display text-2xl font-bold text-white">
              Announcements
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.slice(0, 2).map((ann) => (
              <div key={ann.id} className="glass-card rounded-2xl p-4 sm:p-5 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#FF6B1A]">{ann.priority}</span>
                  <span className="text-slate-400">{formatShortDate(ann.createdAt)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{ann.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tournament Modes Directory: Solo, Duo, Squad, Clash Squad 1v1 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            Battle Formats
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('matches')}
            className="text-xs font-semibold text-[#FF6B1A] hover:underline"
          >
            View All Matches
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {modeCounts.map(({ mode, count }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onOpenModeMatches(mode)}
              className="glass-card rounded-2xl p-4 sm:p-5 text-left hover:border-[#FF6B1A]/40 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <Swords className="w-5 h-5 text-[#FF6B1A]" />
                <span className="font-mono-num text-xs text-slate-400">
                  {count} matches
                </span>
              </div>
              <p className="font-display text-xl font-bold text-white">{mode}</p>
              <p className="text-xs text-slate-400">Explore {mode} rooms</p>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            Featured Tournaments
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('matches')}
            className="text-xs font-semibold text-[#38BDF8] hover:underline"
          >
            All Tournaments
          </button>
        </div>

        {featured.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-400">
            No featured tournaments live yet. New tournaments published by Admin appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {featured.map((t) => (
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
      </section>

      {/* Free Entry Tournaments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            Free Entry Tournaments
          </h2>
          <button
            type="button"
            onClick={() => onOpenStatusMatches('Upcoming')}
            className="text-xs font-semibold text-[#FF6B1A] hover:underline"
          >
            Browse Free Rooms
          </button>
        </div>

        {freeEntry.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-400">
            No free entry tournaments open right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {freeEntry.map((t) => (
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
      </section>

      {/* Special Events */}
      {specialEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9D4EDD]" />
            <h2 className="font-display text-2xl font-bold text-white">
              Special Events
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {specialEvents.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                registration={registrationsByTournament[t.id]}
                onViewDetails={onViewDetails}
                onViewPass={onViewPass}
              />
            ))}
          </div>
        </section>
      )}

      {/* Top 10 Players & Recent Winners Split */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-white">
              Top 10 Players
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="text-xs font-semibold text-[#38BDF8] hover:underline"
            >
              Full Leaderboard
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Rankings update automatically after match results are published.
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {leaderboard.slice(0, 5).map((player) => (
                <div
                  key={player.uid}
                  className="py-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-num w-6 text-xs font-bold text-[#FF6B1A]">
                      #{player.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {player.playerName}
                      </p>
                      <p className="font-mono-num text-xs text-slate-400">
                        UID {player.freeFireUid} · {player.kills} kills
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-emerald-400 shrink-0">
                    {formatCurrency(player.totalWinnings)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Winners */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-white">
              Recent Winners
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="text-xs font-semibold text-[#FF6B1A] hover:underline"
            >
              All Results
            </button>
          </div>

          {matchResults.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No completed match results published yet.
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {matchResults.slice(0, 5).map((res) => (
                <div
                  key={res.id}
                  className="py-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {res.winnerName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {res.tournamentName} · {res.kills} kills
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-[#FF6B1A] shrink-0">
                    {formatCurrency(res.prizeAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Export App & Source Code Banner */}
      <section className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Export App &amp; Android Build Package
            </h2>
            <p className="text-xs text-slate-400">
              Download the complete source ZIP, verify Firebase &amp; Gradle build status, or fetch Play Store APK/AAB releases.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenExport(false)}
            className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0"
          >
            EXPORT APP
          </button>
          <button
            type="button"
            onClick={() => onOpenExport(true)}
            className="h-11 px-5 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-xs sm:text-sm font-semibold text-white flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <FileArchive className="w-4 h-4" />
            DOWNLOAD SOURCE CODE
          </button>
        </div>
      </section>

      {/* Customer Support Banner */}
      <section className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 text-[#38BDF8] flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Player Support & Dispute Desk
            </h2>
            <p className="text-xs text-slate-400">
              Need help with a Room Pass, deposit verification, or match kill dispute?
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSupport}
          className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold text-white whitespace-nowrap shrink-0"
        >
          Contact Support
        </button>
      </section>
    </div>
  );
}
