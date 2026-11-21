# AJAY BATTLES — Separate Admin & Staff Panel Firebase Integration Guide

## 1. Shared Firebase Project Configuration
Connect your separate Admin Panel and Staff Panel applications to the exact Firebase project and Firestore database configured in `firebase-applet-config.json`:
- **Project ID**: `gen-lang-client-0907530323`
- **Firestore Database ID**: `ai-studio-ajaybattles-7e4da196-6b9f-4ee9-ba95-e781a3668fe4`

Initialize Firestore in both external panels using:
```ts
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
```

## 2. Authentication Providers
- **Google Sign-In**: Pre-configured out of the box.
- **Email/Password Sign-In**: Enable **Email/Password** in Firebase Console → Authentication → Sign-in method (`https://console.firebase.google.com/project/gen-lang-client-0907530323/authentication/providers`).

## 3. Role-Based Access Control (Enforced in `firestore.rules`)
- **Admin**: Verified email `pv9870144@gmail.com` or active document in `admin_roles/{uid}` (`active: true`).
- **Staff**: Active document in `staff/{staffUid}` (`active: true`) + active tournament assignment in `staff_assignments/{tournamentId}_{staffUid}` (`active: true`).

## 4. Room ID & Password Publishing Workflow
1. **Admin Panel** creates a document in `tournaments/{tournamentId}` (never storing `roomId` or `roomPassword` in `tournaments`).
2. **Admin Panel** creates `staff/{staffUid}` and `staff_assignments/{tournamentId}_{staffUid}` (`canPublishRoom: true | false`).
3. **Staff Panel** signs in as the assigned staff member, enters `roomId`, `roomPassword`, `releaseTime` (Firestore `Timestamp`), and `instructions` into `match_rooms/{tournamentId}`:
   - To save draft / submit for approval: set `isPublished: false` and `approvalStatus: 'Draft' | 'PendingApproval'`.
   - To publish (requires `canPublishRoom == true` on both `staff/{uid}` and `staff_assignments/{tournamentId}_{uid}`): update `match_rooms/{tournamentId}` with `isPublished: true`, `approvalStatus: 'Published'`, `publishedBy: staffUid`, `publishedAt: serverTimestamp()`, AND update `tournaments/{tournamentId}` with `roomPublished: true` and `roomReleaseTime: releaseTime`.
4. **User App** automatically receives `roomPublished: true` in real time, displays the glowing **VIEW PASS** button underneath that tournament for registered players, and securely fetches `match_rooms/{tournamentId}` only when `isPublished == true`, `request.time >= releaseTime`, and `tournament_participants/{tournamentId}_{uid}.status == 'Registered'`.

## 5. Firestore Collections Summary
All 18 collections are defined in `firebase-blueprint.json` and protected in `firestore.rules`:
`users`, `tournaments`, `tournament_participants`, `teams`, `match_rooms`, `match_results`, `wallets`, `wallet_transactions`, `deposits`, `withdrawals`, `notifications`, `announcements`, `support_tickets`, `staff`, `admin_roles`, `staff_assignments`, `leaderboard`, `audit_logs`.


