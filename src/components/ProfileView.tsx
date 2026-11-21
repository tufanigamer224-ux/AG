import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Edit3,
  FileArchive,
  FileText,
  Headphones,
  History,
  KeyRound,
  LogOut,
  Shield,
  Swords,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  formatCurrency,
  formatShortDate,
  VALIDATION_PATTERNS,
} from '../lib/validation';
import { submitSupportTicket } from '../services/esportsService';
import { NavTab, SupportTicket } from '../types/esports';

interface ProfileViewProps {
  supportTickets: SupportTicket[];
  openSupportInitially?: boolean;
  onClearInitialSupport?: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenNotifications: () => void;
}

export function ProfileView({
  supportTickets,
  openSupportInitially = false,
  onClearInitialSupport,
  onNavigate,
  onOpenNotifications,
}: ProfileViewProps) {
  const { profile, updateProfileDetails, changePassword, logout } = useAuth();

  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupport, setShowSupport] = useState(openSupportInitially);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Edit Profile State
  const [editGameName, setEditGameName] = useState(profile?.gameName || '');
  const [editUid, setEditUid] = useState(profile?.freeFireUid || '');
  const [editMobile, setEditMobile] = useState(profile?.mobileNumber || '');

  // Password State
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Support State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Tournament');
  const [message, setMessage] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const openEditModal = () => {
    setEditGameName(profile?.gameName || '');
    setEditUid(profile?.freeFireUid || '');
    setEditMobile(profile?.mobileNumber || '');
    setFeedback(null);
    setShowEdit(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (editGameName.trim().length < 2 || editGameName.trim().length > 40) {
      setFeedback({ type: 'err', text: 'Game Name must be 2–40 characters.' });
      return;
    }
    if (!VALIDATION_PATTERNS.freeFireUid.test(editUid.trim())) {
      setFeedback({ type: 'err', text: 'Free Fire UID must be 5–20 numeric digits.' });
      return;
    }
    if (!VALIDATION_PATTERNS.mobileNumber.test(editMobile.trim())) {
      setFeedback({ type: 'err', text: 'Enter a valid 8–20 digit mobile number.' });
      return;
    }
    setSaving(true);
    try {
      await updateProfileDetails({
        gameName: editGameName,
        freeFireUid: editUid,
        mobileNumber: editMobile,
      });
      setShowEdit(false);
      setFeedback({ type: 'ok', text: 'Profile updated successfully.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPass.length < 6) {
      setFeedback({ type: 'err', text: 'New password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      await changePassword(currPass, newPass);
      setCurrPass('');
      setNewPass('');
      setShowPasswordModal(false);
      setFeedback({ type: 'ok', text: 'Password updated successfully.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to change password.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (subject.trim().length < 3 || message.trim().length < 5) {
      setFeedback({
        type: 'err',
        text: 'Please provide a descriptive subject and message.',
      });
      return;
    }
    setSaving(true);
    try {
      await submitSupportTicket({ subject, category, message });
      setSubject('');
      setMessage('');
      setFeedback({ type: 'ok', text: 'Support ticket submitted. Our team will respond soon.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to submit ticket.',
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Matches', value: String(profile?.totalMatches ?? 0) },
    { label: 'Total Wins', value: String(profile?.totalWins ?? 0) },
    { label: 'Total Kills', value: String(profile?.totalKills ?? 0) },
    { label: 'Win Rate', value: `${(profile?.winRate ?? 0).toFixed(1)}%` },
    { label: 'Total Earnings', value: formatCurrency(profile?.totalEarnings ?? 0) },
    {
      label: 'Current Rank',
      value: profile?.currentRank ? `#${profile.currentRank}` : 'Unranked',
    },
  ];

  const menuItems = [
    { label: 'Edit Profile', Icon: Edit3, action: openEditModal },
    {
      label: 'Change Password',
      Icon: KeyRound,
      action: () => {
        setFeedback(null);
        setShowPasswordModal(true);
      },
    },
    { label: 'My Tournaments', Icon: Swords, action: () => onNavigate('my-tournaments') },
    { label: 'Match History', Icon: History, action: () => onNavigate('results') },
    { label: 'Wallet', Icon: WalletIcon, action: () => onNavigate('wallet') },
    { label: 'Export App & Source Code', Icon: FileArchive, action: () => onNavigate('export') },
    { label: 'Notifications', Icon: Bell, action: onOpenNotifications },
    {
      label: 'Help and Support',
      Icon: Headphones,
      action: () => {
        setFeedback(null);
        setShowSupport(true);
      },
    },
    { label: 'Privacy Policy', Icon: Shield, action: () => setLegalModal('privacy') },
    { label: 'Terms and Conditions', Icon: FileText, action: () => setLegalModal('terms') },
  ];

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Player Identity Header */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FF6B1A] to-[#9D4EDD] p-0.5 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#0b0f1e] flex items-center justify-center overflow-hidden font-display text-2xl font-bold text-white">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.gameName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile?.gameName || 'AB').slice(0, 2).toUpperCase()
              )}
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white truncate">
              {profile?.gameName || 'Player'}
            </h1>
            <p className="font-mono-num text-xs text-[#FF6B1A] font-semibold">
              Free Fire UID: {profile?.freeFireUid || '—'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-0.5">
              <span>{profile?.mobileNumber || '—'}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{profile?.email || '—'}</span>
              <span aria-hidden="true">·</span>
              <span>Joined {formatShortDate(profile?.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('export')}
            className="h-11 px-4 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-xs font-semibold text-white whitespace-nowrap shrink-0"
          >
            EXPORT APP
          </button>
          <button
            type="button"
            onClick={openEditModal}
            className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white whitespace-nowrap shrink-0"
          >
            Edit Profile
          </button>
        </div>
      </section>

      {/* Player Statistics */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 space-y-1">
            <p className="text-[11px] text-slate-400">{s.label}</p>
            <p className="font-mono-num text-lg font-bold text-white">{s.value}</p>
          </div>
        ))}
      </section>

      {/* Profile Options */}
      <section className="glass-card rounded-2xl overflow-hidden divide-y divide-white/10">
        {menuItems.map(({ label, Icon, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors text-left min-h-[56px]"
          >
            <span className="flex items-center gap-3.5 text-sm font-medium text-slate-200">
              <Icon className="w-4 h-4 text-[#FF6B1A]" />
              {label}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        ))}

        <button
          type="button"
          onClick={() => logout()}
          className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-red-500/10 transition-colors text-left min-h-[56px]"
        >
          <span className="flex items-center gap-3.5 text-sm font-semibold text-red-400">
            <LogOut className="w-4 h-4" />
            Logout
          </span>
        </button>
      </section>

      {/* Edit Profile Modal */}
      {showEdit && (
        <ModalWrapper title="Edit Profile" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Game Name
              </label>
              <input
                type="text"
                required
                value={editGameName}
                onChange={(e) => setEditGameName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Free Fire UID
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={editUid}
                onChange={(e) => setEditUid(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 font-mono-num text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-sm font-semibold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ModalWrapper
          title="Change Password"
          onClose={() => setShowPasswordModal(false)}
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-sm font-semibold"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* Help & Support Modal */}
      {showSupport && (
        <ModalWrapper
          title="Help & Support"
          onClose={() => {
            setShowSupport(false);
            onClearInitialSupport?.();
          }}
        >
          <div className="space-y-6">
            <form onSubmit={handleTicketSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SupportTicket['category'])
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#070913]/80 border border-white/10 text-xs text-white"
                >
                  <option value="Tournament">Tournament Issue</option>
                  <option value="RoomPass">Room Pass Access</option>
                  <option value="Wallet">Deposit / Withdrawal</option>
                  <option value="Account">Account / UID</option>
                  <option value="Report">Fair Play Report</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full h-10 px-3 rounded-xl bg-[#070913]/80 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Include Match ID or Transaction ID if relevant..."
                  className="w-full p-3 rounded-xl bg-[#070913]/80 border border-white/10 text-xs text-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-xs font-semibold"
              >
                {saving ? 'Sending...' : 'Submit Ticket'}
              </button>
            </form>

            {supportTickets.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-white/10 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-300">Recent Tickets</p>
                {supportTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-white">{t.subject}</span>
                      <span className="text-[#38BDF8]">{t.status}</span>
                    </div>
                    <p className="text-slate-400">{t.message}</p>
                    {t.adminReply && (
                      <p className="text-emerald-300 pt-1">Reply: {t.adminReply}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {/* Privacy & Terms Modals */}
      {legalModal && (
        <ModalWrapper
          title={legalModal === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'}
          onClose={() => setLegalModal(null)}
        >
          <div className="text-xs text-slate-300 leading-relaxed space-y-3 max-h-72 overflow-y-auto">
            {legalModal === 'privacy' ? (
              <>
                <p>
                  AJAY BATTLES stores only your essential esports registration profile (Game Name, Free Fire UID, Mobile Number, and Email) inside secured Cloud Firestore records protected by strict owner-only access rules.
                </p>
                <p>
                  Passwords are handled exclusively by Firebase Authentication and are never stored in Firestore or plaintext. Room credentials are encrypted in transit and accessible only to verified registered participants after release time.
                </p>
              </>
            ) : (
              <>
                <p>
                  AJAY BATTLES is an independent Free Fire esports tournament platform and is not affiliated with or endorsed by Garena.
                </p>
                <p>
                  Players must register with their authentic Free Fire UID. Emulators, scripts, teaming, or sharing confidential Room IDs/Passwords outside registered squads will lead to disqualification.
                </p>
              </>
            )}
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}

function ModalWrapper({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass-card w-full max-w-md rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
