import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthView } from './components/AuthView';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExportView } from './components/ExportView';
import { HomeView } from './components/HomeView';
import { MatchesView } from './components/MatchesView';
import { MyTournamentsView } from './components/MyTournamentsView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { ProfileView } from './components/ProfileView';
import { ResultsView } from './components/ResultsView';
import { RoomPassModal } from './components/RoomPassModal';
import { SplashScreen } from './components/SplashScreen';
import { TopBar } from './components/TopBar';
import { TournamentDetailsModal } from './components/TournamentDetailsModal';
import { WalletView } from './components/WalletView';
import {
  subscribeAnnouncements,
  subscribeDeposits,
  subscribeLeaderboard,
  subscribeMatchResults,
  subscribeMyRegistrations,
  subscribeNotifications,
  subscribeSupportTickets,
  subscribeTournaments,
  subscribeWalletTransactions,
  subscribeWithdrawals,
} from './services/esportsService';
import {
  Announcement,
  AppNotification,
  DepositRequest,
  GameMode,
  LeaderboardEntry,
  MatchResult,
  NavTab,
  SupportTicket,
  Tournament,
  TournamentParticipant,
  TournamentStatus,
  WalletTransaction,
  WithdrawalRequest,
} from './types/esports';

function AjayBattlesShell() {
  const { firebaseUser, authReady, needsProfileCompletion } = useAuth();

  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [matchesInitialStatus, setMatchesInitialStatus] = useState<'All' | TournamentStatus>('All');
  const [matchesInitialMode, setMatchesInitialMode] = useState<'All' | GameMode>('All');
  const [openSupportInProfile, setOpenSupportInProfile] = useState(false);
  const [autoStartExportZip, setAutoStartExportZip] = useState(false);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<TournamentParticipant[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [roomPassTournament, setRoomPassTournament] = useState<Tournament | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Public real-time Firestore listeners (tournaments, announcements, results, leaderboard)
  useEffect(() => {
    const unsubT = subscribeTournaments(setTournaments);
    const unsubA = subscribeAnnouncements(setAnnouncements);
    const unsubR = subscribeMatchResults(setMatchResults);
    const unsubL = subscribeLeaderboard(setLeaderboard);

    return () => {
      unsubT();
      unsubA();
      unsubR();
      unsubL();
    };
  }, []);

  // User-scoped real-time Firestore listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setRegistrations([]);
      setTransactions([]);
      setDeposits([]);
      setWithdrawals([]);
      setNotifications([]);
      setSupportTickets([]);
      return;
    }

    const uid = firebaseUser.uid;
    const unsubReg = subscribeMyRegistrations(uid, setRegistrations);
    const unsubTx = subscribeWalletTransactions(uid, setTransactions);
    const unsubDep = subscribeDeposits(uid, setDeposits);
    const unsubWdl = subscribeWithdrawals(uid, setWithdrawals);
    const unsubNotif = subscribeNotifications(uid, setNotifications);
    const unsubSupport = subscribeSupportTickets(uid, setSupportTickets);

    return () => {
      unsubReg();
      unsubTx();
      unsubDep();
      unsubWdl();
      unsubNotif();
      unsubSupport();
    };
  }, [authReady, firebaseUser]);

  const registrationsByTournament = useMemo(() => {
    const map: Record<string, TournamentParticipant> = {};
    registrations.forEach((r) => {
      map[r.tournamentId] = r;
    });
    return map;
  }, [registrations]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Keep selected modals synced with live Firestore tournament updates
  const liveSelectedTournament = useMemo(() => {
    if (!selectedTournament) return null;
    return tournaments.find((t) => t.id === selectedTournament.id) || selectedTournament;
  }, [selectedTournament, tournaments]);

  const liveRoomPassTournament = useMemo(() => {
    if (!roomPassTournament) return null;
    return tournaments.find((t) => t.id === roomPassTournament.id) || roomPassTournament;
  }, [roomPassTournament, tournaments]);

  if (!splashDone || !authReady) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (!firebaseUser || needsProfileCompletion) {
    return <AuthView />;
  }

  const handleNavigate = (tab: NavTab) => {
    if (tab === 'matches') {
      setMatchesInitialStatus('All');
      setMatchesInitialMode('All');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStatusMatches = (status: TournamentStatus) => {
    setMatchesInitialStatus(status);
    setMatchesInitialMode('All');
    setActiveTab('matches');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenModeMatches = (mode: GameMode) => {
    setMatchesInitialMode(mode);
    setMatchesInitialStatus('All');
    setActiveTab('matches');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 pb-24 md:pb-12">
      <TopBar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        unreadCount={unreadNotifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {activeTab === 'home' && (
          <HomeView
            tournaments={tournaments}
            registrationsByTournament={registrationsByTournament}
            announcements={announcements}
            matchResults={matchResults}
            leaderboard={leaderboard}
            onOpenStatusMatches={handleOpenStatusMatches}
            onOpenModeMatches={handleOpenModeMatches}
            onNavigate={handleNavigate}
            onViewDetails={setSelectedTournament}
            onViewPass={setRoomPassTournament}
            onOpenSupport={() => {
              setOpenSupportInProfile(true);
              setActiveTab('profile');
            }}
            onOpenExport={(autoStartZip = false) => {
              setAutoStartExportZip(autoStartZip);
              setActiveTab('export');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesView
            key={`${matchesInitialStatus}-${matchesInitialMode}`}
            tournaments={tournaments}
            registrationsByTournament={registrationsByTournament}
            initialStatusFilter={matchesInitialStatus}
            initialModeFilter={matchesInitialMode}
            onViewDetails={setSelectedTournament}
            onViewPass={setRoomPassTournament}
          />
        )}

        {activeTab === 'my-tournaments' && (
          <MyTournamentsView
            tournaments={tournaments}
            registrations={registrations}
            onViewDetails={setSelectedTournament}
            onViewPass={setRoomPassTournament}
            onBrowseMatches={() => handleNavigate('matches')}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            transactions={transactions}
            deposits={deposits}
            withdrawals={withdrawals}
          />
        )}

        {activeTab === 'results' && (
          <ResultsView matchResults={matchResults} leaderboard={leaderboard} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            supportTickets={supportTickets}
            openSupportInitially={openSupportInProfile}
            onClearInitialSupport={() => setOpenSupportInProfile(false)}
            onNavigate={handleNavigate}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        )}

        {activeTab === 'export' && (
          <ExportView
            autoStartZip={autoStartExportZip}
            onClearAutoStartZip={() => setAutoStartExportZip(false)}
            onBack={() => handleNavigate('home')}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />

      <TournamentDetailsModal
        tournament={liveSelectedTournament}
        registration={
          liveSelectedTournament
            ? registrationsByTournament[liveSelectedTournament.id]
            : undefined
        }
        onClose={() => setSelectedTournament(null)}
        onOpenWallet={() => handleNavigate('wallet')}
        onViewPass={setRoomPassTournament}
      />

      <RoomPassModal
        tournament={liveRoomPassTournament}
        registration={
          liveRoomPassTournament
            ? registrationsByTournament[liveRoomPassTournament.id]
            : undefined
        }
        onClose={() => setRoomPassTournament(null)}
      />

      <NotificationsDrawer
        open={notificationsOpen}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AjayBattlesShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
