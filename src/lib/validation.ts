import { Timestamp } from 'firebase/firestore';
import { MapName } from '../types/esports';

// Synchronized verbatim with firebase-blueprint.json
export const VALIDATION_PATTERNS = {
  id: /^[a-zA-Z0-9_-]+$/,
  mobileNumber: /^[+]?[0-9\s-]{8,20}$/,
  freeFireUid: /^[0-9]{5,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const FIELD_LIMITS = {
  gameName: { min: 2, max: 40 },
  mobileNumber: { min: 8, max: 20 },
  freeFireUid: { min: 5, max: 20 },
  teamName: { min: 2, max: 50 },
  supportSubject: { min: 3, max: 120 },
  supportMessage: { min: 5, max: 1500 },
  gatewayRef: { min: 4, max: 100 },
  payoutDestination: { min: 4, max: 120 },
};

export const BRAND_ASSETS = {
  logo: '/src/assets/images/ajay_battles_logo_1795254715475.jpg',
  heroBanner: '/src/assets/images/hero_arena_banner_1795254716911.jpg',
  maps: {
    Bermuda: '/src/assets/images/map_bermuda_clash_1795254715972.jpg',
    Purgatory: '/src/assets/images/map_purgatory_night_1795254715783.jpg',
    Kalahari: '/src/assets/images/map_kalahari_arena_1795254716417.jpg',
    Alpine: '/src/assets/images/map_purgatory_night_1795254715783.jpg',
    NexTerra: '/src/assets/images/hero_arena_banner_1795254716911.jpg',
  } as Record<MapName, string>,
};

export function resolveTournamentBanner(bannerUrl?: string, map: MapName = 'Bermuda'): string {
  if (bannerUrl && (bannerUrl.startsWith('/') || bannerUrl.startsWith('https://'))) {
    return bannerUrl;
  }
  return BRAND_ASSETS.maps[map] || BRAND_ASSETS.heroBanner;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMatchDateTime(ts?: Timestamp | null): string {
  if (!ts) return 'TBD';
  const date = ts.toDate();
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatShortDate(ts?: Timestamp | null): string {
  if (!ts) return '—';
  const date = ts.toDate();
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function validateSignUpFields(input: {
  mobileNumber: string;
  email: string;
  gameName: string;
  freeFireUid: string;
  password: string;
  confirmPassword: string;
}): string | null {
  const mobile = input.mobileNumber.trim();
  const email = input.email.trim();
  const gameName = input.gameName.trim();
  const uid = input.freeFireUid.trim();

  if (!VALIDATION_PATTERNS.mobileNumber.test(mobile)) {
    return 'Enter a valid 8–20 digit mobile number.';
  }
  if (!VALIDATION_PATTERNS.email.test(email) || email.length > 160) {
    return 'Enter a valid email address.';
  }
  if (gameName.length < FIELD_LIMITS.gameName.min || gameName.length > FIELD_LIMITS.gameName.max) {
    return `Game Name must be ${FIELD_LIMITS.gameName.min}–${FIELD_LIMITS.gameName.max} characters.`;
  }
  if (!VALIDATION_PATTERNS.freeFireUid.test(uid)) {
    return 'Free Fire UID must be 5–20 numeric digits.';
  }
  if (input.password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (input.password !== input.confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

export function createClientId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now()}_${random}`;
}
