import { useMemo, useState } from 'react';
import { Award, Trophy } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../lib/validation';
import { GameMode, LeaderboardEntry, MatchResult } from '../types/esports';

interface ResultsViewProps {
  matchResults: MatchResult[];
  leaderboard: LeaderboardEntry[];
}

type ResultFilter = 'All' | 'Solo' | 'Duo' | 'Squad' | 'Clash Squad 1v1';

const RESULT_FILTERS: { id: ResultFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Solo', label: 'Solo' },
  { id: 'Duo', label: 'Duo' },
  { id: 'Squad', label: 'Squad' },
  { id: 'Clash Squad 1v1', label: 'Clash Squad' },
];

export function ResultsView({ matchResults, leaderboard }: ResultsViewProps) {
  const [filter, setFilter] = useState<ResultFilter>('All');

  const filteredResults = useMemo(() => {
    if (filter === 'All') return matchResults;
    return matchResults.filter((r) => r.gameMode === (filter as GameMode));
  }, [matchResults, filter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          Results & Leaderboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verified match outcomes, kill standings, and top season earners.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#0e1426] border border-white/10 w-fit max-w-full">
        {RESULT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`h-9 px-4 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              filter === f.id
                ? 'bg-[#FF6B1A] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Match Results */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-white">
          Published Match Results
        </h2>

        {filteredResults.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center space-y-2">
            <Trophy className="w-9 h-9 text-slate-500 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No results published yet</p>
            <p className="text-xs text-slate-500">
              Completed match winners and kill breakdowns appear here after verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResults.map((res) => (
              <div key={res.id} className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">
                      {res.gameMode} · {formatShortDate(res.resultDate)}
                    </p>
                    <h3 className="font-display text-xl font-bold text-white mt-0.5">
                      {res.tournamentName}
                    </h3>
                  </div>
                  <span className="font-mono-num text-base font-bold text-[#FF6B1A]">
                    {formatCurrency(res.prizeAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center font-bold text-xs overflow-hidden">
                      {res.winnerAvatarUrl ? (
                        <img
                          src={res.winnerAvatarUrl}
                          alt={res.winnerName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        res.winnerName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {res.winnerName}
                      </p>
                      <p className="font-mono-num text-xs text-slate-400">
                        UID {res.winnerUid}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right text-xs">
                    <div>
                      <p className="text-slate-400">Kills</p>
                      <p className="font-mono-num font-bold text-white">{res.kills}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Placement</p>
                      <p className="font-mono-num font-bold text-white">
                        {res.placementPoints}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="font-mono-num font-bold text-[#38BDF8]">
                        {res.totalPoints}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top 10 Leaderboard */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#9D4EDD]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Top 10 Leaderboard
          </h2>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Leaderboard standings will populate as tournaments conclude.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs">
                    <th className="py-3.5 px-4 font-medium">Rank</th>
                    <th className="py-3.5 px-4 font-medium">Player</th>
                    <th className="py-3.5 px-4 font-medium">UID</th>
                    <th className="py-3.5 px-4 font-medium text-right">Matches</th>
                    <th className="py-3.5 px-4 font-medium text-right">Wins</th>
                    <th className="py-3.5 px-4 font-medium text-right">Kills</th>
                    <th className="py-3.5 px-4 font-medium text-right">Win Rate</th>
                    <th className="py-3.5 px-4 font-medium text-right">Points</th>
                    <th className="py-3.5 px-4 font-medium text-right">Winnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {leaderboard.map((row) => (
                    <tr key={row.uid} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-mono-num font-bold text-[#FF6B1A]">
                        #{row.rank}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        {row.playerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-slate-400">
                        {row.freeFireUid}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right text-slate-300">
                        {row.matchesPlayed}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right text-slate-300">
                        {row.wins}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right text-slate-300">
                        {row.kills}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right text-[#38BDF8]">
                        {row.winRate.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right font-semibold text-white">
                        {row.totalPoints}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-right font-bold text-emerald-400">
                        {formatCurrency(row.totalWinnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
