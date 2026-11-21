import {
  Timestamp,
  collection,
  doc,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from '../lib/firebase';
import { BRAND_ASSETS, createClientId } from '../lib/validation';
import {
  Announcement,
  AppNotification,
  DepositRequest,
  LeaderboardEntry,
  MatchResult,
  MatchRoom,
  SupportTicket,
  Tournament,
  TournamentParticipant,
  UserProfile,
  Wallet,
  WalletTransaction,
  WithdrawalRequest,
} from '../types/esports';

export function subscribeTournaments(
  onData: (items: Tournament[]) => void
): () => void {
  const q = query(collection(db, 'tournaments'), orderBy('matchTime', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Tournament));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'tournaments')
  );
}

export function subscribeMyRegistrations(
  userId: string,
  onData: (items: TournamentParticipant[]) => void
): () => void {
  const q = query(
    collection(db, 'tournament_participants'),
    where('userId', '==', userId),
    orderBy('registeredAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as TournamentParticipant));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'tournament_participants')
  );
}

export function subscribeWalletTransactions(
  userId: string,
  onData: (items: WalletTransaction[]) => void
): () => void {
  const q = query(
    collection(db, 'wallet_transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WalletTransaction));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'wallet_transactions')
  );
}

export function subscribeDeposits(
  userId: string,
  onData: (items: DepositRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'deposits'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as DepositRequest)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'deposits')
  );
}

export function subscribeWithdrawals(
  userId: string,
  onData: (items: WithdrawalRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'withdrawals'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as WithdrawalRequest)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
  );
}

export function subscribeNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as AppNotification)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
  );
}

export function subscribeAnnouncements(
  onData: (items: Announcement[]) => void
): () => void {
  const q = query(
    collection(db, 'announcements'),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Announcement)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'announcements')
  );
}

export function subscribeMatchResults(
  onData: (items: MatchResult[]) => void
): () => void {
  const q = query(
    collection(db, 'match_results'),
    orderBy('resultDate', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as MatchResult)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'match_results')
  );
}

export function subscribeLeaderboard(
  onData: (items: LeaderboardEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('rank', 'asc'),
    limit(10)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as LeaderboardEntry)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'leaderboard')
  );
}

export function subscribeSupportTickets(
  userId: string,
  onData: (items: SupportTicket[]) => void
): () => void {
  const q = query(
    collection(db, 'support_tickets'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as SupportTicket)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'support_tickets')
  );
}

export async function joinTournament(params: {
  tournament: Tournament;
  profile: UserProfile;
  teamName?: string;
  memberNames?: string[];
  memberUids?: string[];
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in to join a tournament.');
  }

  const { tournament, profile, teamName, memberNames, memberUids } = params;
  const uid = currentUser.uid;
  const participantId = `${tournament.id}_${uid}`;
  const tournamentRef = doc(db, 'tournaments', tournament.id);
  const participantRef = doc(db, 'tournament_participants', participantId);
  const walletRef = doc(db, 'wallets', uid);

  await runTransaction(db, async (tx) => {
    const tournSnap = await tx.get(tournamentRef);
    const partSnap = await tx.get(participantRef);
    if (!tournSnap.exists()) {
      throw new Error('Tournament no longer exists.');
    }
    const latestTournament = tournSnap.data() as Tournament;

    if (partSnap.exists()) {
      throw new Error('You have already joined this tournament.');
    }
    if (latestTournament.status !== 'Upcoming') {
      throw new Error('Registration is closed for this tournament.');
    }
    if (latestTournament.availableSlots < 1) {
      throw new Error('No available slots left.');
    }

    let newDeposit = 0;
    let newWinning = 0;
    let newTotal = 0;

    if (latestTournament.entryFee > 0) {
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists()) {
        throw new Error('Wallet not found. Add funds before joining a paid match.');
      }
      const wallet = walletSnap.data() as Wallet;
      if (wallet.totalBalance < latestTournament.entryFee) {
        throw new Error(
          `Insufficient wallet balance. Required: ₹${latestTournament.entryFee}, Available: ₹${wallet.totalBalance}.`
        );
      }

      const fee = latestTournament.entryFee;
      const fromDeposit = Math.min(wallet.depositBalance, fee);
      const fromWinning = fee - fromDeposit;
      newDeposit = Number((wallet.depositBalance - fromDeposit).toFixed(2));
      newWinning = Number((wallet.winningBalance - fromWinning).toFixed(2));
      newTotal = Number((newDeposit + newWinning).toFixed(2));
    }

    // All reads complete — now perform atomic writes
    let teamId: string | undefined;
    if (latestTournament.gameMode === 'Duo' || latestTournament.gameMode === 'Squad') {
      const cleanTeamName = (teamName || '').trim();
      if (cleanTeamName.length < 2) {
        throw new Error('Please enter a valid team name (2–50 characters).');
      }
      const cleanNames = (memberNames || []).map((n) => n.trim()).filter(Boolean);
      const cleanUids = (memberUids || []).map((u) => u.trim()).filter(Boolean);
      if (cleanNames.length < 2 || cleanUids.length < 2) {
        throw new Error('Please provide teammate Game Names and Free Fire UIDs.');
      }
      teamId = createClientId('team');
      tx.set(doc(db, 'teams', teamId), {
        id: teamId,
        tournamentId: latestTournament.id,
        captainUid: uid,
        teamName: cleanTeamName,
        gameMode: latestTournament.gameMode,
        memberNames: cleanNames.slice(0, 4),
        memberUids: cleanUids.slice(0, 4),
        createdAt: serverTimestamp(),
      });
    }

    tx.set(participantRef, {
      id: participantId,
      tournamentId: latestTournament.id,
      matchId: latestTournament.matchId,
      tournamentName: latestTournament.name,
      gameMode: latestTournament.gameMode,
      matchTime: latestTournament.matchTime,
      userId: uid,
      gameName: profile.gameName,
      freeFireUid: profile.freeFireUid,
      ...(teamId ? { teamId, teamName: (teamName || '').trim() } : {}),
      entryFeePaid: latestTournament.entryFee,
      status: 'Registered',
      registeredAt: serverTimestamp(),
    });

    tx.update(tournamentRef, {
      availableSlots: latestTournament.availableSlots - 1,
      updatedAt: serverTimestamp(),
    });

    if (latestTournament.entryFee > 0) {
      tx.update(walletRef, {
        depositBalance: newDeposit,
        winningBalance: newWinning,
        totalBalance: newTotal,
        updatedAt: serverTimestamp(),
      });

      const txId = createClientId('tx');
      tx.set(doc(db, 'wallet_transactions', txId), {
        id: txId,
        userId: uid,
        title: `Entry Fee: ${latestTournament.name}`,
        type: 'EntryFee',
        amount: latestTournament.entryFee,
        balanceType: 'Deposit',
        status: 'Completed',
        referenceId: latestTournament.matchId,
        tournamentId: latestTournament.id,
        createdAt: serverTimestamp(),
      });
    }

    const notifId = createClientId('notif');
    tx.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: uid,
      title: 'Tournament Registration Confirmed',
      message: `Slot locked for ${latestTournament.name} (${latestTournament.matchId}). Room Pass will unlock once published.`,
      category: 'Registration',
      tournamentId: latestTournament.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  });
}

export type RoomPassResult =
  | { status: 'ready'; room: MatchRoom }
  | { status: 'not_registered'; message: string }
  | { status: 'unpublished'; message: string };

export async function fetchSecureRoomPass(
  tournament: Tournament,
  registration?: TournamentParticipant
): Promise<RoomPassResult> {
  if (!auth.currentUser) {
    return {
      status: 'not_registered',
      message: 'You must join this tournament to view the Room Pass.',
    };
  }

  if (!registration || registration.status !== 'Registered') {
    return {
      status: 'not_registered',
      message: 'You must join this tournament to view the Room Pass.',
    };
  }

  if (!tournament.roomPublished) {
    return {
      status: 'unpublished',
      message: 'Room details will be available soon.',
    };
  }

  try {
    const snap = await getDocFromServer(doc(db, 'match_rooms', tournament.id));
    if (!snap.exists()) {
      return {
        status: 'unpublished',
        message: 'Room details will be available soon.',
      };
    }
    const room = snap.data() as MatchRoom;
    if (!room.isPublished) {
      return {
        status: 'unpublished',
        message: 'Room details will be available soon.',
      };
    }
    return { status: 'ready', room };
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (msg.includes('permission') || msg.includes('insufficient')) {
      return {
        status: 'unpublished',
        message: 'Room details will be available soon.',
      };
    }
    handleFirestoreError(error, OperationType.GET, `match_rooms/${tournament.id}`);
  }
}

export async function submitDepositRequest(params: {
  amount: number;
  paymentMethod: string;
  gatewayRef: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in first.');

  const depositId = createClientId('dep');
  const txId = createClientId('tx');
  const notifId = createClientId('notif');
  const batch = writeBatch(db);

  batch.set(doc(db, 'deposits', depositId), {
    id: depositId,
    userId: user.uid,
    amount: params.amount,
    paymentMethod: params.paymentMethod.trim(),
    gatewayRef: params.gatewayRef.trim(),
    status: 'Pending',
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'wallet_transactions', txId), {
    id: txId,
    userId: user.uid,
    title: `Deposit Verification (${params.paymentMethod})`,
    type: 'Deposit',
    amount: params.amount,
    balanceType: 'Deposit',
    status: 'Pending',
    referenceId: params.gatewayRef.trim(),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: user.uid,
    title: 'Deposit Request Submitted',
    message: `Your ₹${params.amount} deposit (${params.gatewayRef.trim()}) is pending payment gateway verification.`,
    category: 'Wallet',
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `deposits/${depositId}`);
  }
}

export async function submitWithdrawalRequest(params: {
  amount: number;
  payoutMethod: 'UPI' | 'BankTransfer';
  payoutDestination: string;
  winningBalance: number;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in first.');
  if (params.amount < 50) {
    throw new Error('Minimum withdrawal amount is ₹50.');
  }
  if (params.amount > params.winningBalance) {
    throw new Error('Withdrawal amount cannot exceed your withdrawable Winning Balance.');
  }

  const withdrawalId = createClientId('wdl');
  const txId = createClientId('tx');
  const notifId = createClientId('notif');
  const batch = writeBatch(db);

  batch.set(doc(db, 'withdrawals', withdrawalId), {
    id: withdrawalId,
    userId: user.uid,
    amount: params.amount,
    payoutMethod: params.payoutMethod,
    payoutDestination: params.payoutDestination.trim(),
    status: 'Pending',
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'wallet_transactions', txId), {
    id: txId,
    userId: user.uid,
    title: `Withdrawal Request (${params.payoutMethod})`,
    type: 'Withdrawal',
    amount: params.amount,
    balanceType: 'Winning',
    status: 'Pending',
    referenceId: withdrawalId,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: user.uid,
    title: 'Withdrawal Request Queued',
    message: `Withdrawal of ₹${params.amount} to ${params.payoutDestination.trim()} is under verification.`,
    category: 'Wallet',
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `withdrawals/${withdrawalId}`);
  }
}

export async function submitSupportTicket(params: {
  subject: string;
  category: SupportTicket['category'];
  message: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in first.');
  const ticketId = createClientId('tkt');

  const batch = writeBatch(db);
  batch.set(doc(db, 'support_tickets', ticketId), {
    id: ticketId,
    userId: user.uid,
    subject: params.subject.trim(),
    category: params.category,
    message: params.message.trim(),
    status: 'Open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `support_tickets/${ticketId}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(items: AppNotification[]): Promise<void> {
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, 'notifications', n.id), { read: true });
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

/**
 * Admin-only Sandbox Seeder: strictly creates clearly-tagged `isDemo: true`
 * records when the project owner wants to verify the live Firestore pipeline
 * before launching their separate Admin Panel.
 */
export async function seedSandboxTournamentsForAdmin(): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Verified Admin authentication required.');
  }

  const now = Date.now();
  const batch = writeBatch(db);

  const sampleTournaments = [
    {
      id: 'sandbox_bermuda_squad_01',
      matchId: 'AB-SQ-101',
      name: 'Bermuda Apex Squad Showdown',
      bannerUrl: BRAND_ASSETS.maps.Bermuda,
      gameMode: 'Squad',
      map: 'Bermuda',
      entryFee: 0,
      prizePool: 5000,
      perKillReward: 25,
      totalSlots: 48,
      availableSlots: 18,
      matchTime: Timestamp.fromDate(new Date(now + 2 * 60 * 60 * 1000)),
      status: 'Upcoming',
      rules:
        '1. Mobile devices only — emulators prohibited.\n2. Level 30+ Free Fire account required.\n3. Teaming or third-party scripts result in instant disqualification.',
      instructions:
        'Join the custom room 10 minutes before match start. Keep your squad slot verified.',
      featured: true,
      specialEvent: true,
      roomPublished: true,
      roomReleaseTime: Timestamp.fromDate(new Date(now - 5 * 60 * 1000)),
      isDemo: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      id: 'sandbox_purgatory_solo_02',
      matchId: 'AB-SL-204',
      name: 'Purgatory Night Solo Rush',
      bannerUrl: BRAND_ASSETS.maps.Purgatory,
      gameMode: 'Solo',
      map: 'Purgatory',
      entryFee: 0,
      prizePool: 1500,
      perKillReward: 15,
      totalSlots: 48,
      availableSlots: 31,
      matchTime: Timestamp.fromDate(new Date(now + 5 * 60 * 60 * 1000)),
      status: 'Upcoming',
      rules:
        '1. Solo survival scoring: 15 pts Booyah + 2 pts per elimination.\n2. Screenshot your match summary if disputing kills.',
      instructions: 'Room ID & Password will unlock 15 minutes before kickoff.',
      featured: true,
      specialEvent: false,
      roomPublished: false,
      roomReleaseTime: Timestamp.fromDate(new Date(now + 4.75 * 60 * 60 * 1000)),
      isDemo: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      id: 'sandbox_kalahari_cs_03',
      matchId: 'AB-CS-309',
      name: 'Kalahari Clash Squad 1v1',
      bannerUrl: BRAND_ASSETS.maps.Kalahari,
      gameMode: 'Clash Squad 1v1',
      map: 'Kalahari',
      entryFee: 0,
      prizePool: 800,
      perKillReward: 0,
      totalSlots: 16,
      availableSlots: 6,
      matchTime: Timestamp.fromDate(new Date(now - 15 * 60 * 1000)),
      status: 'Ongoing',
      rules: 'Best of 7 rounds. Unlimited ammo off. Gloo wall strict 1v1.',
      instructions: 'Live round in progress.',
      featured: false,
      specialEvent: true,
      roomPublished: false,
      isDemo: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      id: 'sandbox_bermuda_duo_04',
      matchId: 'AB-DU-088',
      name: 'Twilight Duo Championship',
      bannerUrl: BRAND_ASSETS.heroBanner,
      gameMode: 'Duo',
      map: 'Bermuda',
      entryFee: 0,
      prizePool: 3000,
      perKillReward: 20,
      totalSlots: 48,
      availableSlots: 0,
      matchTime: Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000)),
      status: 'Completed',
      rules: 'Standard Duo esports rules.',
      instructions: 'Completed.',
      featured: false,
      specialEvent: false,
      roomPublished: false,
      isDemo: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  sampleTournaments.forEach((t) => {
    batch.set(doc(db, 'tournaments', t.id), t);
  });

  // Published match room for sandbox_bermuda_squad_01 (only accessible to registered players)
  batch.set(doc(db, 'match_rooms', 'sandbox_bermuda_squad_01'), {
    tournamentId: 'sandbox_bermuda_squad_01',
    roomId: '84920175',
    roomPassword: 'AJAY2026',
    instructions: 'Join Slot 1–12. Stay in lobby until Staff starts match.',
    releaseTime: Timestamp.fromDate(new Date(now - 5 * 60 * 1000)),
    isPublished: true,
    approvalStatus: 'Published',
    updatedBy: user.uid,
    publishedBy: user.uid,
    updatedAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'match_results', 'sandbox_res_01'), {
    id: 'sandbox_res_01',
    tournamentId: 'sandbox_bermuda_duo_04',
    tournamentName: 'Twilight Duo Championship',
    gameMode: 'Duo',
    winnerName: 'ViperX_GG',
    winnerUid: '2489104432',
    kills: 14,
    placementPoints: 20,
    totalPoints: 48,
    prizeAmount: 1800,
    resultDate: Timestamp.fromDate(new Date(now - 20 * 60 * 60 * 1000)),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'leaderboard', 'sandbox_top_1'), {
    uid: 'sandbox_top_1',
    playerName: 'ViperX_GG',
    freeFireUid: '2489104432',
    matchesPlayed: 42,
    wins: 16,
    kills: 214,
    winRate: 38.1,
    totalPoints: 1420,
    totalWinnings: 18400,
    rank: 1,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'leaderboard', 'sandbox_top_2'), {
    uid: 'sandbox_top_2',
    playerName: 'ShadowKira',
    freeFireUid: '1984320091',
    matchesPlayed: 39,
    wins: 12,
    kills: 188,
    winRate: 30.8,
    totalPoints: 1265,
    totalWinnings: 12900,
    rank: 2,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'announcements', 'sandbox_ann_1'), {
    id: 'sandbox_ann_1',
    title: 'Weekend Grand Finals Registration Open',
    message: 'Daily Free Entry Squad & Solo matches are live. Register early to secure your slot and unlock Room Pass 15 minutes before match start.',
    priority: 'High',
    active: true,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sandbox_seed');
  }
}


