# AJAY BATTLES — Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **PII Isolation**: User profiles (`/users/{userId}`) contain mobile numbers and emails; only the profile owner (`request.auth.uid == userId`) or verified Admin (`isAdmin()`) may read or write them.
2. **Confidential Room Credentials**: `/match_rooms/{tournamentId}` stores `roomId` and `roomPassword`. Unregistered users, unpublished rooms (`isPublished != true`), pre-release requests (`request.time < resource.data.releaseTime`), and cancelled/disqualified participants (`status != 'Registered'`) are strictly denied read access. `allow list` on `/match_rooms` is forbidden for non-Admin/non-Staff users.
3. **Deterministic Duplicate Registration Prevention**: `/tournament_participants/{tournamentId}_{userId}` enforces that each user can only register once per tournament, that `userId == request.auth.uid`, and that the referenced tournament exists and is `Upcoming` with `availableSlots > 0`.
4. **Atomic Wallet Protection**: Players cannot self-credit `depositBalance`, `winningBalance`, or `totalBalance` on `/wallets/{userId}`. Initial wallet creation is locked to zero balances (`0`). Updates by a player may only deduct exact tournament entry fees atomically alongside creating their `tournament_participants` document (`existsAfter`) and maintaining `totalBalance == depositBalance + winningBalance`.
5. **Withdrawal Eligibility**: `/withdrawals/{withdrawalId}` creation requires `amount > 0` and `amount <= get(/databases/$(database)/documents/wallets/$(request.auth.uid)).data.winningBalance`, and `status == 'Pending'`.
6. **Privilege Escalation Prevention**: Normal players and Staff cannot write to `/admin_roles`, `/staff`, `/staff_assignments`, or elevate `role` in `/users/{userId}`.
7. **Staff Scoping**: Assigned Staff can read/update `/match_rooms/{tournamentId}` only when an active `/staff_assignments/{tournamentId}_{uid}` exists, and can set `isPublished: true` only when `canPublishRoom == true` on both their `/staff/{uid}` record and `/staff_assignments/{tournamentId}_{uid}`.
8. **Temporal Integrity**: All `createdAt`, `updatedAt`, `registeredAt` timestamps on client-initiated writes must equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Room Fetch**: `get(/match_rooms/tourn_01)` with `auth == null`.
2. **Unregistered Player Room Fetch**: `get(/match_rooms/tourn_01)` by authenticated user without `/tournament_participants/tourn_01_{uid}`.
3. **Pre-Release Room Fetch**: `get(/match_rooms/tourn_01)` by registered user when `request.time < resource.data.releaseTime`.
4. **Unpublished Room Fetch**: `get(/match_rooms/tourn_01)` by registered user when `isPublished == false`.
5. **Cancelled Registration Room Fetch**: `get(/match_rooms/tourn_01)` when participant doc has `status == 'Cancelled'`.
6. **Wallet Self-Credit**: `update(/wallets/{uid}, { totalBalance: 50000, depositBalance: 50000 })` by owner.
7. **Withdraw From Deposit Balance**: `create(/withdrawals/w_1, { amount: 500, status: 'Pending' })` when `winningBalance == 100`.
8. **Shadow Role Escalation**: `create(/users/{uid}, { ..., role: 'admin', isAdmin: true })` by player.
9. **Spoofed Admin Email Unverified**: Write `/tournaments/t_spoof` with `auth.token.email == 'pv9870144@gmail.com'` and `email_verified == false`.
10. **PII Blanket Read**: `get(/users/{otherUid})` or `list(/users)` by a regular authenticated player.
11. **Staff Unauthorized Publish**: `update(/match_rooms/tourn_01, { isPublished: true })` by assigned staff whose `canPublishRoom == false`.
12. **Resource Poisoning / Oversized ID**: `create(/support_tickets/{200-char-id}, { ... })` or oversized `message` exceeding 1500 chars.
