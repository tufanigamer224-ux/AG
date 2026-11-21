import { Timestamp } from 'firebase/firestore';

export type GameMode = 'Solo' | 'Duo' | 'Squad' | 'Clash Squad 1v1' | 'Custom Room';
export type MapName = 'Bermuda' | 'Purgatory' | 'Kalahari' | 'Alpine' | 'NexTerra';
export type TournamentStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
export type NavTab = 'home' | 'matches' | 'wallet' | 'results' | 'profile' | 'my-tournaments' | 'export';

export interface UserProfile {
  uid: string;
  mobileNumber: string;
  email: string;
  gameName: string;
  freeFireUid: string;
  photoUrl?: string;
  role: 'player';
  totalMatches: number;
  totalWins: number;
  totalKills: number;
  winRate: number;
  totalEarnings: number;
  currentRank: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Tournament {
  id: string;
  matchId: string;
  name: string;
  bannerUrl?: string;
  gameMode: GameMode;
  map: MapName;
  entryFee: number;
  prizePool: number;
  perKillReward: number;
  totalSlots: number;
  availableSlots: number;
  matchTime: Timestamp;
  status: TournamentStatus;
  rules?: string;
  instructions?: string;
  featured?: boolean;
  specialEvent?: boolean;
  roomPublished: boolean;
  roomReleaseTime?: Timestamp;
  assignedStaffUid?: string;
  isDemo?: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  matchId: string;
  tournamentName: string;
  gameMode: GameMode;
  matchTime: Timestamp;
  userId: string;
  gameName: string;
  freeFireUid: string;
  teamId?: string;
  teamName?: string;
  entryFeePaid: number;
  status: 'Registered' | 'Cancelled' | 'Disqualified';
  registeredAt?: Timestamp;
}

export interface MatchRoom {
  tournamentId: string;
  roomId: string;
  roomPassword: string;
  instructions?: string;
  releaseTime: Timestamp;
  isPublished: boolean;
  approvalStatus: 'Draft' | 'PendingApproval' | 'Published' | 'Unpublished';
  updatedBy: string;
  publishedBy?: string;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
}

export interface MatchResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  gameMode: GameMode;
  winnerName: string;
  winnerUid: string;
  winnerAvatarUrl?: string;
  kills: number;
  placementPoints: number;
  totalPoints: number;
  prizeAmount: number;
  resultDate: Timestamp;
  createdAt?: Timestamp;
}

export interface Wallet {
  userId: string;
  totalBalance: number;
  depositBalance: number;
  winningBalance: number;
  updatedAt?: Timestamp;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  title: string;
  type: 'Deposit' | 'EntryFee' | 'Winning' | 'Withdrawal' | 'Bonus' | 'Refund';
  amount: number;
  balanceType: 'Deposit' | 'Winning' | 'Bonus';
  status: 'Completed' | 'Pending' | 'Failed' | 'Rejected';
  referenceId?: string;
  tournamentId?: string;
  createdAt?: Timestamp;
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  gatewayRef: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  createdAt?: Timestamp;
  verifiedAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  payoutMethod: 'UPI' | 'BankTransfer';
  payoutDestination: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  createdAt?: Timestamp;
  processedAt?: Timestamp;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'Registration' | 'RoomPass' | 'Result' | 'Wallet' | 'Announcement';
  tournamentId?: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Normal' | 'High' | 'Urgent';
  active: boolean;
  createdBy: string;
  createdAt?: Timestamp;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'Tournament' | 'RoomPass' | 'Wallet' | 'Account' | 'Report';
  message: string;
  status: 'Open' | 'InProgress' | 'Resolved';
  adminReply?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  playerName: string;
  freeFireUid: string;
  avatarUrl?: string;
  matchesPlayed: number;
  wins: number;
  kills: number;
  winRate: number;
  totalPoints: number;
  totalWinnings: number;
  rank: number;
  updatedAt?: Timestamp;
}


