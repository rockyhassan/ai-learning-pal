# Firebase User Storage Implementation Blueprint
## Custom Tokens + Firestore `/users` Collection as Single Source of Truth

**Status:** ✅ DESIGN ONLY - NO CODE CHANGES YET  
**Date:** August 17, 2026  
**Project:** wafi-learning-buddy-new  
**Approach:** Firebase Auth Custom Tokens (Approved)

---

## EXECUTIVE SUMMARY

### Authentication & Authorization Flow

```
ADMIN PATH (unchanged):
  User → Google Sign-In → Firebase Auth → Authenticated

PIN LOGIN PATH (redesigned):
  User selects role + enters PIN
  → Cloud Function: PIN verification (server-side bcrypt)
  → Cloud Function: Creates Firebase Auth custom token
  → Frontend: signInWithCustomToken(token)
  → User authenticated in Firebase Auth
```

### Key Architecture Decisions

| Component | Solution |
|-----------|----------|
| Auth System | Firebase Auth (both admin + PIN users) |
| User Source of Truth | Firestore `/users/{uid}` collection |
| PIN Storage | Firestore bcrypt hash (admin-only readable) |
| Session Management | Firebase Auth + Firestore listeners |
| Account Revocation | Firebase Auth disable + Firestore listener |
| Cloud Functions | Required for PIN verification + token creation |

---

## 1. FIREBASE AUTH USER CREATION/LINKING STRATEGY

### Admin User (Rocky Hassan)

```
Current State:
  - Already authenticated via Google Sign-In
  - Firebase UID: from existing Google account
  - No changes needed

Post-Migration:
  - Same UID continues
  - Firestore: /users/{googleUid} document created
  - Auth remains: Google OAuth
```

### PIN Users (Afreen, Wafi, Tahsin)

```
Creation Flow:
  1. Admin creates user via Dashboard
  2. Cloud Function creates Firestore /users/{newUid} document
  3. NO Firebase Auth account yet (created on first login)
  
First Login Flow:
  1. User enters email + PIN
  2. Cloud Function verifies PIN via bcrypt
  3. Cloud Function creates Firebase Auth account (if needed)
  4. Cloud Function issues custom token
  5. Frontend signs in via signInWithCustomToken()
  6. Firebase Auth session established
  7. Firestore listeners attach
```

**No email linking needed** - each user has one auth method (Google or PIN).

---

## 2. `/users/{firebaseUid}` FIRESTORE DOCUMENT SCHEMA

### Document Structure

```typescript
{
  // Core Identity (read-only after creation)
  uid: string,                        // Same as document ID
  email: string,                      // Primary lookup (indexed)
  name: string,                       // Display name
  
  // Authentication & Status
  role: "admin" | "student" | "parent" | "teacher",
  status: "active" | "invited" | "disabled",
  authMethod: "google" | "pin",
  
  // PIN Security (PIN users only)
  pinHash: string,                    // bcrypt hash (admin-only readable)
  pinLastReset: timestamp,
  pinFailedAttempts: number,
  pinLockedUntil: timestamp,          // Brute-force lockout expiry
  
  // Permissions
  permissions: string[],              // Array of feature keys
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,                  // Admin UID
  lastLoginAt: timestamp,
}
```

### Firestore Indexes Required

- `email` (ascending)
- `role` (ascending)
- `status` + `role` (both ascending)

---

## 3. CLOUD FUNCTIONS REQUIRED

### Function 1: `pinLogin` (Primary)

**Endpoint:** `POST /api/auth/pin-login`

**Input:**
```json
{
  "email": "string",
  "pin": "string (4 digits)"
}
```

**Process:**
1. Validate input (email format, pin is 4 digits)
2. Query Firestore: `/users` where `email` == input
3. Check: status must be "active"
4. Check: not in brute-force lockout
5. Verify PIN: `bcrypt.compare(input.pin, document.pinHash)`
6. If valid:
   - Reset `pinFailedAttempts` to 0
   - Get or create Firebase Auth account
   - Create custom token with uid + role
   - Return token
7. If invalid:
   - Increment `pinFailedAttempts`
   - If attempts >= 5: set `pinLockedUntil` = now + 15 min
   - Return 401 (generic message)

**Error Handling:**
- 400: Invalid input
- 401: PIN incorrect
- 403: Account not active
- 404: User not found (all generic)
- 429: Account locked (retry-after header)

### Function 2: `resetPin` (Admin Only)

**Endpoint:** `PUT /api/admin/reset-pin/{uid}`

**Input:**
```json
{
  "newPin": "string (optional, 4 digits)"
}
```

**Process:**
1. Verify Firebase Auth admin (custom claims check)
2. Load `/users/{uid}` document
3. Generate new PIN (or use provided)
4. Hash PIN with bcrypt (rounds: 12)
5. Update document:
   - `pinHash`: new hash
   - `pinFailedAttempts`: 0
   - `pinLockedUntil`: null
   - `pinLastReset`: now
6. Return to admin: `{ newPin: "1234" }`

### Function 3: `createUser` (Admin Only)

**Endpoint:** `POST /api/admin/users`

**Input:**
```json
{
  "email": "string",
  "name": "string",
  "role": "student|parent|teacher",
  "initialPin": "string (optional)"
}
```

**Process:**
1. Verify admin
2. Validate email is unique
3. Generate PIN (or use provided)
4. Generate new UID (timestamp-based)
5. Create `/users/{uid}` document with:
   - `pinHash`: bcrypt(pin)
   - `permissions`: rolePresets[role]
   - `status`: "active"
   - `createdBy`: adminUid
6. Return: `{ uid, email, initialPin }`

### Function 4: `disableUser` (Admin Only)

**Endpoint:** `PUT /api/admin/users/{uid}/status`

**Input:**
```json
{
  "status": "active" | "disabled"
}
```

**Process:**
1. Verify admin
2. Update `/users/{uid}`: `status` = input
3. If disabled: disable Firebase Auth account via admin SDK
4. If enabled: enable Firebase Auth account
5. Firestore listener detects change, real-time UI update

### Function 5: `updateUser` (Admin Only)

**Endpoint:** `PUT /api/admin/users/{uid}`

**Input:**
```json
{
  "name": "string (optional)",
  "role": "string (optional)",
  "permissions": ["string"] (optional),
  "status": "string (optional)"
}
```

**Process:**
1. Verify admin
2. Load document, validate role if changed
3. Update fields provided
4. If role changed: update Firebase Auth custom claims
5. Update `updatedAt` = now

### Function 6: `validateCustomToken` (Optional)

**Endpoint:** `POST /api/auth/validate-token`

**Purpose:** Debug endpoint to verify custom token validity

---

## 4. PIN CREATION/RESET/VERIFICATION FLOW

### Initial Creation (Admin Creates User)

```
1. Admin Dashboard → Add User
2. Form: email, name, role, (optional PIN)
3. Admin submits
4. Cloud Function createUser:
   - Generates random 4-digit PIN
   - Hashes with bcrypt
   - Stores in Firestore
   - Returns PIN to admin
5. Admin Dashboard: "PIN: 1234 - Share with user"
6. Admin shares PIN (not via app, out of scope)
```

### PIN Reset (Admin Resets)

```
1. Admin Dashboard → Select User → Reset PIN
2. Cloud Function resetPin:
   - Generates new random PIN
   - Hashes with bcrypt
   - Updates Firestore
   - Resets failed attempts
   - Returns PIN to admin
3. Admin shares new PIN with user
```

### PIN Verification (User Logs In)

```
USER SIDE:
1. Select role
2. Numeric keypad
3. Enter 4 digits
4. Auto-submit on 4th digit

CLOUD FUNCTION:
1. Receive email + PIN
2. Query Firestore for user
3. bcrypt.compare(inputPin, hash)
4. If match:
   - Create Firebase Auth account (first time)
   - Create custom token
   - Return token
5. If no match:
   - Increment failed attempts
   - Check brute-force threshold
   - Return error

CLIENT:
1. Receive custom token
2. signInWithCustomToken(auth, token)
3. Firebase Auth session established
4. Firestore listeners attach
5. Dashboard renders
```

### Brute-Force Protection

```
Attempt 1-4: Fail, increment counter
Attempt 5: Fail, set pinLockedUntil = now + 15 min
Attempt 6+: Locked error until 15 min expires
Reset: Successful login clears counter
```

---

## 5. CUSTOM TOKEN FLOW

### Token Creation (in Cloud Function)

```typescript
const customToken = await admin.auth().createCustomToken(uid, {
  role: role,
  email: email
});
```

### Token Structure

```
Header: { "alg": "RS256", "typ": "JWT" }

Payload:
{
  "iss": "https://securetoken.google.com/wafi-learning-buddy-new",
  "aud": "...",
  "auth_time": 1692288000,
  "user_id": "PinUserUid123",
  "iat": 1692288000,
  "exp": 1692291600,  // 1 hour
  "email": "affanwafee@gmail.com",
  "role": "student",
  "firebase": { ... }
}
```

### Frontend Exchange

```typescript
const token = response.token;
const userCredential = await signInWithCustomToken(auth, token);
// Now authenticated, Firestore listeners attach
```

### Session Persistence

```
Firebase browserLocalPersistence:
- Custom token auth persists across reloads
- Session restored from localStorage
- Listeners re-attach automatically

localStorage after migration:
- NO longer stores "wafi.users-access"
- NO longer stores "wafi.session.email"
- Only Firebase Auth session data (managed by SDK)
```

---

## 6. FIRESTORE SECURITY RULES

### Users Collection Rules

```
match /users/{uid} {
  // Read: own user or admin
  allow read: if 
    request.auth.uid == uid ||
    request.auth.token.role == 'admin';
  
  // Write: admin only
  allow create, update: if request.auth.token.role == 'admin';
  
  // No deletes
  allow delete: if false;
}
```

### Diary/Exams Rules (Existing)

```
match /diary/{diaryId} {
  allow read, write: if request.auth.token.role == 'admin';
}

match /exams/{examId} {
  allow read, write: if request.auth.token.role == 'admin';
}
```

### Indexes Required

Firestore will prompt to create:
- `email` ascending
- `role` ascending
- `status`, `role` both ascending

---

## 7. EXISTING-USER MIGRATION PROCEDURE

### Users to Migrate

```
1. Rocky Hassan
   UID: existing Google UID
   Email: rockyhsn9@gmail.com
   Role: admin
   
2. Afreen
   UID: generate new
   Email: afreen.antora@gmail.com
   Role: parent
   
3. Wafi
   UID: generate new
   Email: affanwafee@gmail.com
   Role: student
   
4. Tahsin
   UID: generate new
   Email: tahsin@gmail.com
   Role: teacher
```

### Migration Steps

**Step 1:** Backup current state
```
- Export wafi.users-access (already done)
- Export wafi.school-content
- Backup Firestore /diary and /exams
```

**Step 2:** Create /users documents
```
For Rocky:
  /users/{googleUid}: {
    uid, email, name, role: admin,
    authMethod: google, permissions, createdAt, updatedAt
  }

For Afreen/Wafi/Tahsin:
  /users/{newUid}: {
    uid, email, name, role,
    authMethod: pin,
    pinHash: bcrypt(storedPin),
    permissions: rolePresets[role],
    pinFailedAttempts: 0,
    pinLockedUntil: null,
    createdAt, updatedAt
  }
```

**Step 3:** Do NOT create Firebase Auth accounts yet
- Will be created on first PIN login
- Ensures fresh auth context

**Step 4:** Deploy Cloud Functions
- Deploy all 6 functions to Firebase
- Test in staging first

**Step 5:** Update frontend code
- Change login flow to use Cloud Function
- Change admin dashboard to use Cloud Functions
- Remove localStorage user read/write

**Step 6:** Test in staging
- Run verification steps (below)

**Step 7:** Deploy to production
- Deploy frontend code
- Verify all users can log in
- Monitor for issues

**Step 8:** Delete localStorage
```javascript
localStorage.removeItem('wafi.users-access');
localStorage.removeItem('wafi.session.email');
```

---

## 8. FRESH INCOGNITO VERIFICATION PROCEDURE

### Test Case: New User Incognito Login

**Phase 1: Admin Creates User**
```
1. Admin logged in as Rocky
2. Dashboard → User Management → Add User
3. Email: test.student@example.com
4. Name: Test Student
5. Role: Student
6. Pin displayed: 5678
```

**Phase 2: Fresh Incognito Browser**
```
1. Open new private window
2. No cookies, no localStorage
3. Navigate to app
4. Select role: Student
5. See "Test Student" card
6. Numeric keypad
7. Enter: 5678
```

**Phase 3: Cloud Function Processes**
```
1. Queries /users by email
2. Finds document
3. bcrypt.compare("5678", hash) → match
4. Creates custom token
5. Returns to frontend
```

**Phase 4: Frontend Authenticates**
```
1. signInWithCustomToken(token)
2. Firebase Auth authenticated
3. Firestore listeners attach
4. /users/{uid} loads
5. currentUser updates
6. Dashboard renders
```

**Phase 5: Verification Checklist**

```
Authentication:
  ✅ Firebase Auth.currentUser exists
  ✅ UID set correctly
  ✅ Auth persists on page reload
  ✅ No console errors

User Data:
  ✅ /users/{uid} document loaded
  ✅ Permissions loaded
  ✅ Role = student
  ✅ Status = active
  ✅ Name = "Test Student"

Features:
  ✅ Student features visible
  ✅ Non-student features hidden
  ✅ Permission check working

Real-time:
  ✅ Admin changes permission in another window
  ✅ Firestore listener fires
  ✅ Student UI updates immediately
  ✅ Admin disables user
  ✅ Student session revoked

Cross-Device:
  ✅ Same user on phone and desktop
  ✅ Both synced via Firestore
  ✅ Admin disable affects both

Logout:
  ✅ Sign out works
  ✅ Can sign in again
  ✅ New session established
```

---

## 9. ROLLBACK PLAN

### If Critical Issues Found

**Immediate Actions (< 30 min):**
```
1. Revert frontend code to previous version
2. Login reverts to localStorage path
3. Temporarily disable Cloud Functions
4. Users can log in via old method
```

**Data Recovery:**
```
1. Restore localStorage backup
2. Keep Firestore /users collection (can delete if needed)
3. Firebase Auth accounts won't interfere
4. Diary/Exams continue working
```

**Full Rollback:**
```
1. Delete /users collection
2. Delete new Firebase Auth accounts (if needed)
3. Restore localStorage
4. Revert code
5. Restart
```

**Partial Fix:**
```
If only Cloud Function logic is wrong:
1. Keep Firestore data as-is
2. Fix function code
3. Re-deploy
4. Existing data will work once fixed
```

---

## 10. FILES THAT WILL NEED MODIFICATION

### Frontend Code Changes

| File | Type | Change | Risk |
|------|------|--------|------|
| `src/lib/access-store.tsx` | TypeScript | Complete restructure | HIGH |
| `src/routes/index.tsx` | TypeScript | PIN flow to Cloud Function | HIGH |
| `src/routes/admin/$userId.tsx` | TypeScript | Admin ops to Cloud Functions | MEDIUM |
| `src/lib/school-content.tsx` | TypeScript | Verify (likely no change) | LOW |
| `src/components/route-guard.tsx` | TypeScript | Verify (likely no change) | LOW |

### Cloud Functions (New)

| File | Type | Purpose |
|------|------|---------|
| `functions/src/auth.ts` | TypeScript | PIN login, reset PIN, token validation |
| `functions/src/users.ts` | TypeScript | Create, update, disable users |
| `functions/src/index.ts` | TypeScript | Export all functions |
| `functions/package.json` | JSON | Dependencies (firebase-admin, bcryptjs) |

### Configuration

| File | Type | Change |
|------|------|--------|
| `firestore.rules` | Text | Add `/users` rules |
| `.env.local` | ENV | No change (already configured) |

---

## 11. SUMMARY

### ✅ WHAT CHANGES

```
Authentication System:
  Firebase Auth (both admin + PIN users with custom tokens)

User Source of Truth:
  Firestore /users/{uid} collection

PIN Storage:
  Firestore bcrypt hash (admin-only readable)

Session Management:
  Firebase Auth + Firestore listeners

Account Revocation:
  Firebase Auth disable + real-time Firestore update
```

### ✅ WHAT STAYS THE SAME

```
Admin Google Sign-In:
  Google OAuth unchanged

User Features & Roles:
  Student: 15, Parent: 10, Teacher: 10, Admin: 20 (same)

Diary & Exams:
  Continue working, no changes needed

Login UI/UX:
  Role selection → keypad → auto-submit (same)

Existing 4 Users:
  Rocky, Afreen, Wafi, Tahsin (same roles)

School Content:
  Diary, exams, routines work as before
```

### ✅ CRITICAL VERIFICATIONS (Before Production)

```
Cloud Functions:
  ✅ pinLogin returns token for correct PIN
  ✅ pinLogin returns 401 for wrong PIN
  ✅ Brute-force lock after 5 attempts
  ✅ resetPin changes PIN hash
  ✅ createUser works
  ✅ disableUser revokes session

Migration:
  ✅ All 4 users in Firestore
  ✅ PINs hashed correctly
  ✅ Permissions match original

Authentication:
  ✅ Admin Google login works
  ✅ New user PIN login works (incognito)
  ✅ Existing user (Rocky) PIN login works
  ✅ Brute-force protection works

Authorization:
  ✅ Student sees student features only
  ✅ Parent sees parent features only
  ✅ Teacher sees teacher features only
  ✅ Admin sees all features

Real-time Sync:
  ✅ User data synced across devices
  ✅ Admin changes reflect immediately
  ✅ Disable revokes session immediately

Firestore Rules:
  ✅ Compile without errors
  ✅ Deploy successfully
  ✅ Access control working

Diary & Exams:
  ✅ Admin add/edit works
  ✅ Students can view
  ✅ Firestore sync works
```

---

## NEXT STEPS

✅ **This blueprint is complete and ready for review.**

**Awaiting approval to proceed with:**
1. Cloud Functions implementation
2. Firestore rules deployment
3. Frontend code changes
4. Migration execution
5. Production deployment

**Do NOT implement until final approval is given.**

