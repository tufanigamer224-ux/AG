import { useMemo, useState } from 'react';
import { Calendar, KeyRound, ShieldCheck, Swords } from 'lucide-react';
import { formatMatchDateTime } from '../lib/validation';
import { Tournament, TournamentParticipant } from '../types/esports';

interface MyTournamentsViewProps {
  tournaments: Tournament[];
  registrations: TournamentParticipant[];
  onViewDetails: (tournament: Tournament) => void;
  onViewPass: (tournament: Tournament) => void;
  onBrowseMatches: () => void;
}

type MyTab = 'Upcoming' | 'Ongoing' | 'Completed';

export function MyTournamentsView({
  tournaments,
  registrations,
  onViewDetails,
  onViewPass,
  onBrowseMatches,
}: MyTournamentsViewProps) {
  const [tab, setTab] = useState<MyTab>('Upcoming');

  const tournamentsMap = useMemo(() => {
    const map: Record<string, Tournament> = {};
    tournaments.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tournaments]);

  const items = useMemo(() => {
    return registrations
      .map((reg) => ({
        reg,
        tournament: tournamentsMap[reg.tournamentId],
      }))
      .filter(({ tournament }) => {
        if (!tournament) return tab === 'Upcoming';
        return tournament.status === tab;
      });
  }, [registrations, tournamentsMap, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          My Tournaments
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Track your registered matches and unlock your Room Pass when released.
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0e1426] border border-white/10">
        {(['Upcoming', 'Ongoing', 'Completed'] as MyTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-10 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === t ? 'bg-[#FF6B1A] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <Swords className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-white">
              No {tab} Tournaments
            </h2>
            <p className="text-xs text-slate-400">
              Join a tournament from Matches to see your slot and Room Pass here.
            </p>
          </div>
          <button
            type="button"
            onClick={onBrowseMatches}
            className="h-11 px-5 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-white text-sm font-semibold"
          >
            Browse Matches
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(({ reg, tournament }) => {
            const canViewPass =
              reg.status === 'Registered' && tournament?.roomPublished === true;
            return (
              <div
                key={reg.id}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono-num text-[#FF6B1A] font-semibold">
                      {reg.matchId}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {reg.status}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-white">
                    {tournament?.name || reg.tournamentName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{reg.gameMode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatMatchDateTime(tournament?.matchTime || reg.matchTime)}
                    </span>
                    {reg.teamName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Team: {reg.teamName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  {tournament && (
                    <button
                      type="button"
                      onClick={() => onViewDetails(tournament)}
                      className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white"
                    >
                      View Details
                    </button>
                  )}
                  {canViewPass && tournament && (
                    <button
                      type="button"
                      onClick={() => onViewPass(tournament)}
                      className="flex-1 h-11 rounded-xl view-pass-btn text-xs font-bold text-white flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      VIEW PASS
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
