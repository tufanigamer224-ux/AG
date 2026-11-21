import React, { useState } from 'react';
import {
  Calendar,
  KeyRound,
  ShieldCheck,
  Users,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  formatCurrency,
  formatMatchDateTime,
  resolveTournamentBanner,
  VALIDATION_PATTERNS,
} from '../lib/validation';
import { joinTournament } from '../services/esportsService';
import { Tournament, TournamentParticipant } from '../types/esports';

interface TournamentDetailsModalProps {
  tournament: Tournament | null;
  registration?: TournamentParticipant;
  onClose: () => void;
  onOpenWallet: () => void;
  onViewPass: (tournament: Tournament) => void;
}

export function TournamentDetailsModal({
  tournament,
  registration,
  onClose,
  onOpenWallet,
  onViewPass,
}: TournamentDetailsModalProps) {
  const { profile, wallet } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [teammates, setTeammates] = useState([
    { gameName: '', freeFireUid: '' },
    { gameName: '', freeFireUid: '' },
    { gameName: '', freeFireUid: '' },
  ]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!tournament) return null;

  const isRegistered = registration?.status === 'Registered';
  const isTeamMode = tournament.gameMode === 'Duo' || tournament.gameMode === 'Squad';
  const requiredExtraPlayers = tournament.gameMode === 'Duo' ? 1 : 3;
  const banner = resolveTournamentBanner(tournament.bannerUrl, tournament.map);
  const hasEnoughBalance = (wallet?.totalBalance ?? 0) >= tournament.entryFee;
  const canJoin =
    !isRegistered &&
    tournament.status === 'Upcoming' &&
    tournament.availableSlots > 0;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profile) {
      setError('Complete your player profile before joining.');
      return;
    }

    if (!VALIDATION_PATTERNS.freeFireUid.test(profile.freeFireUid)) {
      setError('Your Free Fire UID in Profile is invalid. Please update it first.');
      return;
    }

    if (!hasEnoughBalance) {
      setError(
        `Insufficient wallet balance. Required ${formatCurrency(
          tournament.entryFee
        )}, available ${formatCurrency(wallet?.totalBalance ?? 0)}.`
      );
      return;
    }

    const memberNames: string[] = [profile.gameName];
    const memberUids: string[] = [profile.freeFireUid];

    if (isTeamMode) {
      if (teamName.trim().length < 2) {
        setError('Enter a valid Team Name (at least 2 characters).');
        return;
      }
      for (let i = 0; i < requiredExtraPlayers; i++) {
        const mate = teammates[i];
        if (!mate.gameName.trim() || !VALIDATION_PATTERNS.freeFireUid.test(mate.freeFireUid.trim())) {
          setError(`Enter a valid Game Name and numeric UID for Teammate ${i + 2}.`);
          return;
        }
        memberNames.push(mate.gameName.trim());
        memberUids.push(mate.freeFireUid.trim());
      }
    }

    setJoining(true);
    try {
      await joinTournament({
        tournament,
        profile,
        teamName: isTeamMode ? teamName.trim() : undefined,
        memberNames: isTeamMode ? memberNames : undefined,
        memberUids: isTeamMode ? memberUids : undefined,
      });
      setSuccess(
        `Successfully joined ${tournament.name}! Check My Tournaments for your Room Pass once published.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete registration.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tournament.name}
    >
      <div className="glass-card w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Banner Header */}
        <div className="relative h-48 sm:h-56 shrink-0 bg-[#0b0f1e]">
          <img
            src={banner}
            alt={tournament.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1e] via-[#0b0f1e]/45 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tournament Details"
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/15"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-mono-num text-[#FF6B1A] font-semibold">
                {tournament.matchId}
              </span>
              <span aria-hidden="true">·</span>
              <span>{tournament.gameMode}</span>
              <span aria-hidden="true">·</span>
              <span>{tournament.map}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#38BDF8] font-medium">{tournament.status}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {tournament.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-400">Prize Pool</p>
              <p className="font-mono-num text-lg font-bold text-[#FF6B1A]">
                {formatCurrency(tournament.prizePool)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-400">Entry Fee</p>
              <p className="font-mono-num text-lg font-bold text-[#38BDF8]">
                {tournament.entryFee === 0 ? 'FREE' : formatCurrency(tournament.entryFee)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-400">Per Kill</p>
              <p className="font-mono-num text-lg font-bold text-white">
                {tournament.perKillReward > 0 ? formatCurrency(tournament.perKillReward) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-400">Slots</p>
              <p className="font-mono-num text-lg font-bold text-white">
                {tournament.availableSlots}/{tournament.totalSlots}
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-center justify-between gap-4 py-3 border-y border-white/10 text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-[#FF6B1A]" />
              {formatMatchDateTime(tournament.matchTime)}
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <Users className="w-4 h-4 text-[#9D4EDD]" />
              {tournament.gameMode}
            </span>
          </div>

          {/* Rules & Instructions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-300">
                Tournament Rules
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                {tournament.rules ||
                  '1. Mobile devices only — emulators prohibited.\n2. Respect fair-play guidelines.\n3. Match results are verified by official Staff.'}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-300">
                Joining Instructions
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                {tournament.instructions ||
                  'Room ID and Password appear under VIEW PASS for registered players once published before match kickoff.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                {!hasEnoughBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWallet();
                    }}
                    className="font-semibold text-[#FF6B1A] hover:underline"
                  >
                    Go to Wallet to Add Money
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          {/* Registration Form OR Registered Status */}
          {isRegistered ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      You are Registered
                    </p>
                    <p className="text-xs text-slate-300">
                      IGN: {registration.gameName} · UID: {registration.freeFireUid}
                      {registration.teamName ? ` · Team: ${registration.teamName}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {tournament.roomPublished ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewPass(tournament);
                  }}
                  className="w-full h-11 rounded-xl view-pass-btn text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  VIEW PASS
                </button>
              ) : (
                <p className="text-xs text-slate-300">
                  Room details will be available soon once published by tournament staff.
                </p>
              )}
            </div>
          ) : canJoin ? (
            <form onSubmit={handleJoin} className="space-y-4 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Registering as <strong className="text-white">{profile?.gameName}</strong> (UID:{' '}
                  <span className="font-mono-num">{profile?.freeFireUid}</span>)
                </span>
                <span className="font-mono-num text-slate-400">
                  Wallet: {formatCurrency(wallet?.totalBalance ?? 0)}
                </span>
              </div>

              {isTeamMode && (
                <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Apex Predators"
                      className="w-full h-10 px-3.5 rounded-lg bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>

                  {Array.from({ length: requiredExtraPlayers }).map((_, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={teammates[idx].gameName}
                        onChange={(e) => {
                          const next = [...teammates];
                          next[idx] = { ...next[idx], gameName: e.target.value };
                          setTeammates(next);
                        }}
                        placeholder={`Player ${idx + 2} Game Name`}
                        className="w-full h-10 px-3 rounded-lg bg-[#070913]/80 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={teammates[idx].freeFireUid}
                        onChange={(e) => {
                          const next = [...teammates];
                          next[idx] = { ...next[idx], freeFireUid: e.target.value };
                          setTeammates(next);
                        }}
                        placeholder={`Player ${idx + 2} Free Fire UID`}
                        className="w-full h-10 px-3 rounded-lg bg-[#070913]/80 border border-white/10 text-xs font-mono-num text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={joining}
                className="w-full h-12 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {joining
                  ? 'Confirming Slot...'
                  : tournament.entryFee === 0
                  ? 'Confirm Free Registration'
                  : `Pay ${formatCurrency(tournament.entryFee)} & Join Now`}
              </button>
            </form>
          ) : (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center text-xs text-slate-400">
              {tournament.availableSlots === 0
                ? 'All slots for this tournament are filled.'
                : `Registration closed (${tournament.status}).`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
