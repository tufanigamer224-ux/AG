import { useEffect, useState } from 'react';
import { Calendar, Check, Copy, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { formatMatchDateTime } from '../lib/validation';
import { fetchSecureRoomPass, RoomPassResult } from '../services/esportsService';
import { Tournament, TournamentParticipant } from '../types/esports';

interface RoomPassModalProps {
  tournament: Tournament | null;
  registration?: TournamentParticipant;
  onClose: () => void;
}

export function RoomPassModal({
  tournament,
  registration,
  onClose,
}: RoomPassModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RoomPassResult | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'pass' | null>(null);

  useEffect(() => {
    if (!tournament) return;
    let cancelled = false;
    setLoading(true);
    fetchSecureRoomPass(tournament, registration)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            status: 'unpublished',
            message: 'Room details will be available soon.',
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tournament, registration]);

  if (!tournament) return null;

  const copyValue = async (text: string, field: 'id' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Room Pass Credentials"
    >
      <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden border border-[#FF6B1A]/30 shadow-[0_0_50px_rgba(157,78,221,0.22)]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B1A] to-[#9D4EDD] flex items-center justify-center text-white">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Match Room Pass
              </h2>
              <p className="font-mono-num text-xs text-slate-400">
                {tournament.matchId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Room Pass"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">{tournament.name}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF6B1A]" />
              {formatMatchDateTime(tournament.matchTime)}
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#FF6B1A] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Verifying registration and release permissions...
              </p>
            </div>
          ) : result?.status === 'ready' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Registered Player Access</span>
              </div>

              {/* Room ID Box */}
              <div className="rounded-xl bg-[#070913]/90 border border-white/10 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Room ID</p>
                  <p className="font-mono-num text-xl font-bold text-white tracking-wider">
                    {result.room.roomId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(result.room.roomId, 'id')}
                  className="h-10 px-3.5 rounded-lg bg-[#FF6B1A]/15 hover:bg-[#FF6B1A]/25 border border-[#FF6B1A]/40 text-[#FF6B1A] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {copiedField === 'id' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy ID
                    </>
                  )}
                </button>
              </div>

              {/* Room Password Box */}
              <div className="rounded-xl bg-[#070913]/90 border border-white/10 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Room Password</p>
                  <p className="font-mono-num text-xl font-bold text-[#38BDF8] tracking-wider">
                    {result.room.roomPassword}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(result.room.roomPassword, 'pass')}
                  className="h-10 px-3.5 rounded-lg bg-[#9D4EDD]/15 hover:bg-[#9D4EDD]/25 border border-[#9D4EDD]/40 text-[#d8b4fe] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {copiedField === 'pass' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Pass
                    </>
                  )}
                </button>
              </div>

              {/* Joining Instructions */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-slate-200">
                  Lobby Joining Instructions
                </p>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                  {result.room.instructions ||
                    'Enter the Free Fire Custom Room using the Room ID and Password above at least 10 minutes prior to match start. Do not share credentials outside your registered team.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 text-[#FF6B1A] flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white">
                {result?.message || 'Room details will be available soon.'}
              </p>
              {tournament.roomReleaseTime && result?.status === 'unpublished' && (
                <p className="text-xs text-slate-400">
                  Scheduled Release: {formatMatchDateTime(tournament.roomReleaseTime)}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
