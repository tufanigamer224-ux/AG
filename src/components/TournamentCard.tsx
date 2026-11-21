import { Calendar, KeyRound, ShieldCheck } from 'lucide-react';
import {
  formatCurrency,
  formatMatchDateTime,
  resolveTournamentBanner,
} from '../lib/validation';
import { Tournament, TournamentParticipant } from '../types/esports';

interface TournamentCardProps {
  tournament: Tournament;
  registration?: TournamentParticipant;
  onViewDetails: (tournament: Tournament) => void;
  onViewPass: (tournament: Tournament) => void;
}

export function TournamentCard({
  tournament,
  registration,
  onViewDetails,
  onViewPass,
}: TournamentCardProps) {
  const isRegistered = registration?.status === 'Registered';
  const filledSlots = Math.max(0, tournament.totalSlots - tournament.availableSlots);
  const fillPercent = Math.min(
    100,
    Math.round((filledSlots / Math.max(1, tournament.totalSlots)) * 100)
  );
  const banner = resolveTournamentBanner(tournament.bannerUrl, tournament.map);

  const showViewPass = isRegistered && tournament.roomPublished === true;

  return (
    <article className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
      <div>
        {/* Banner Header */}
        <div className="relative h-40 w-full bg-[#0b0f1e] overflow-hidden">
          <img
            src={banner}
            alt={tournament.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1e] via-[#0b0f1e]/35 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs text-slate-200">
            <span className="font-mono-num font-semibold text-white">
              {tournament.matchId}
            </span>
            <span
              className={`font-semibold ${
                tournament.status === 'Ongoing'
                  ? 'text-[#FF6B1A]'
                  : tournament.status === 'Completed'
                  ? 'text-slate-400'
                  : 'text-[#38BDF8]'
              }`}
            >
              {tournament.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{tournament.gameMode}</span>
              <span aria-hidden="true">·</span>
              <span>{tournament.map}</span>
              {tournament.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#9D4EDD]">Sandbox</span>
                </>
              )}
            </div>
            <h3 className="font-display text-xl font-bold text-white leading-snug line-clamp-1">
              {tournament.name}
            </h3>
          </div>

          {/* Prize, Entry, Per Kill */}
          <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/10">
            <div>
              <p className="text-[11px] text-slate-400">Prize Pool</p>
              <p className="font-mono-num text-sm font-bold text-[#FF6B1A]">
                {formatCurrency(tournament.prizePool)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Per Kill</p>
              <p className="font-mono-num text-sm font-semibold text-white">
                {tournament.perKillReward > 0
                  ? formatCurrency(tournament.perKillReward)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Entry Fee</p>
              <p className="font-mono-num text-sm font-bold text-[#38BDF8]">
                {tournament.entryFee === 0
                  ? 'FREE'
                  : formatCurrency(tournament.entryFee)}
              </p>
            </div>
          </div>

          {/* Slots & Match Time */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatMatchDateTime(tournament.matchTime)}
              </span>
              <span className="font-mono-num text-slate-300">
                {tournament.availableSlots}/{tournament.totalSlots} left
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#9D4EDD]"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2.5">
        <button
          type="button"
          onClick={() => onViewDetails(tournament)}
          className={`w-full h-11 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
            isRegistered
              ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              : tournament.status === 'Upcoming' && tournament.availableSlots > 0
              ? 'bg-[#FF6B1A] hover:bg-[#ff7f38] text-white'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          {isRegistered ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Joined · View Details
            </>
          ) : tournament.status === 'Upcoming' && tournament.availableSlots > 0 ? (
            'Join Now'
          ) : (
            'View Details'
          )}
        </button>

        {/* Secure VIEW PASS button — rendered ONLY for eligible registered players after publishing */}
        {showViewPass && (
          <button
            type="button"
            onClick={() => onViewPass(tournament)}
            className="w-full h-11 rounded-xl view-pass-btn text-white text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <KeyRound className="w-4 h-4" />
            VIEW PASS
          </button>
        )}
      </div>
    </article>
  );
}
