# Security Specification: Our Travel Planner

## 1. Data Invariants
1. **User Scoping & Identity Integrity**: A user can only read and write their own user profile `/users/{userId}` where `request.auth.uid == userId`.
2. **Master Gate Relationship**: A sub-collection resource (`activity`, `budgetItem`, `place`, `checklistItem`, `note`) cannot be created, updated, or read unless the parent trip exists and belongs to the authenticated user (`trip.ownerId == request.auth.uid`).
3. **Trip Ownership Integrity**: When creating or updating a trip, `ownerId` must strictly equal `request.auth.uid` and cannot be modified after creation (`incoming().ownerId == existing().ownerId`).
4. **Sub-item Ownership Integrity**: Every sub-item (`activities`, `budget_items`, `places`, `checklist`, `notes`) must have `ownerId == request.auth.uid` and matching `tripId`.
5. **Key Exactness & Ghost Field Rejection**: Payloads must strictly match expected fields; arbitrary unauthorized ghost keys are rejected on creation and action-constrained on update.
6. **Bounded Sizes**: String fields are constrained with `.size() <= MAX` to prevent Denial of Wallet resource attacks.
7. **Temporal Protection**: `createdAt` is immutable on update; `updatedAt` tracks current updates.
8. **Secure List Queries**: List queries must check `resource.data.ownerId == request.auth.uid` so that blanket scans across users are prohibited.

---

## 2. The "Dirty Dozen" Payloads (All MUST return PERMISSION_DENIED)

### Attack 1: Unauthenticated Read on Trips
- **Target**: `GET /trips/trip-1`
- **Auth**: `null` (Anonymous / Unauthenticated)
- **Expected**: `PERMISSION_DENIED`

### Attack 2: Identity Spoofing on Trip Creation
- **Target**: `CREATE /trips/trip-spoof`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Payload**: `{ id: "trip-spoof", ownerId: "victim-user-id", name: "Stolen Trip", destination: "Hanoi", startDate: "2026-10-01", endDate: "2026-10-05", status: "Planning" }`
- **Expected**: `PERMISSION_DENIED` (`ownerId != request.auth.uid`)

### Attack 3: Cross-User Trip Modification
- **Target**: `UPDATE /trips/victim-trip`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Payload**: `{ name: "Hacked Trip Title" }`
- **Existing**: `{ id: "victim-trip", ownerId: "victim-user-id", ... }`
- **Expected**: `PERMISSION_DENIED`

### Attack 4: Shadow Field Injection (Ghost Fields)
- **Target**: `CREATE /trips/trip-2`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ id: "trip-2", ownerId: "user-123", name: "Trip", destination: "Hue", startDate: "2026-09-01", endDate: "2026-09-03", status: "Planning", isAdmin: true }`
- **Expected**: `PERMISSION_DENIED` (Strict keys violation)

### Attack 5: Document ID Poisoning with Oversized Key
- **Target**: `GET /trips/` + `A`.repeat(200)
- **Auth**: `{ uid: "user-123" }`
- **Expected**: `PERMISSION_DENIED` (ID size > 128 chars rejected by `isValidId`)

### Attack 6: Cross-User Activity Creation (Orphaned Write)
- **Target**: `CREATE /trips/victim-trip/activities/act-1`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Payload**: `{ id: "act-1", tripId: "victim-trip", ownerId: "attacker-user-id", date: "2026-09-01", time: "08:00", title: "Malicious Breakfast", location: "Cafe", category: "Food" }`
- **Parent Trip**: Owned by `victim-user-id`
- **Expected**: `PERMISSION_DENIED` (Master gate: Parent trip is not owned by attacker)

### Attack 7: Mismatched Activity Owner ID
- **Target**: `CREATE /trips/attacker-trip/activities/act-2`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Payload**: `{ id: "act-2", tripId: "attacker-trip", ownerId: "victim-user-id", date: "2026-09-01", time: "09:00", title: "Activity", location: "Cafe", category: "Food" }`
- **Expected**: `PERMISSION_DENIED` (`ownerId != request.auth.uid`)

### Attack 8: Denial of Wallet (Gigantic String Payload)
- **Target**: `CREATE /trips/my-trip/activities/act-3`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ id: "act-3", tripId: "my-trip", ownerId: "user-123", date: "2026-09-01", time: "09:00", title: "A".repeat(5000), location: "Cafe", category: "Food" }`
- **Expected**: `PERMISSION_DENIED` (Title size exceeds 200 character limit)

### Attack 9: Modifying Immutable `ownerId` on Trip Update
- **Target**: `UPDATE /trips/my-trip`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ ownerId: "transferred-user-id", name: "My Trip Updated" }`
- **Expected**: `PERMISSION_DENIED` (Cannot change immutable `ownerId`)

### Attack 10: Blanket Query on Another User's Checklist
- **Target**: `LIST /trips/victim-trip/checklist`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Expected**: `PERMISSION_DENIED` (List query enforces `resource.data.ownerId == request.auth.uid`)

### Attack 11: Cross-User Profile Read (PII Protection)
- **Target**: `GET /users/victim-user-id`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Expected**: `PERMISSION_DENIED` (`userId != request.auth.uid`)

### Attack 12: Invalid Status Enum Poisoning
- **Target**: `CREATE /trips/my-trip-enum-test`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ id: "my-trip-enum-test", ownerId: "user-123", name: "Trip", destination: "Da Lat", startDate: "2026-09-01", endDate: "2026-09-03", status: "SuperHackedStatus" }`
- **Expected**: `PERMISSION_DENIED` (`status` is not in allowed enum list)

---

## 3. Test Runner
See `firestore.rules.test.ts` for unit test assertions against all 12 Dirty Dozen payloads.
