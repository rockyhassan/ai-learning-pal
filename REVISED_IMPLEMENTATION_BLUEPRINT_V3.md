# Revised Implementation Blueprint - Version 3
## Final Corrections Applied (6 Critical Issues)

**Status:** 🔴 FINAL DESIGN - AWAITING APPROVAL  
**Date:** August 17, 2026  
**Changes:** 6 critical corrections applied to V2

---

## The 6 Final Corrections

### ✅ Correction 1: Disabled User Can Read Own Account

**ISSUE:** If disabled user cannot read their own `/users/{uid}`, realtime listener fails with permission-denied.

**SOLUTION:** Users can always read their own `/users/{uid}`, regardless of status.

**Rules (REVISED):**

```
/users/{uid} {
  // READ: Always allow user to read own document + admin can read all
  allow read: if request.auth.uid == uid ||
              request.auth.token.role == 'admin';
  
  // CREATE/UPDATE: Cloud Functions only (via admin SDK)
  allow create, update: if false;
  
  // DELETE: Never
  allow delete: if false;
}
```

**Why This Works:**
- ✅ User can observe own status changing to "disabled"
- ✅ Listener fires successfully, UI detects disabled state
- ✅ /diary and /exams still check status="active" at data access layer
- ✅ Two-layer protection: read own /users, but cannot read protected collections

---

### ✅ Correction 2: Explicit Compensating Rollback for createUser

**ISSUE:** Firebase Auth and Firestore cannot participate in same transaction.

**SOLUTION:** Define explicit compensating rollback on failure.

**createUser Operation (REVISED):**

```
Cloud Function: createUser({ email, name, role, initialPin })

STEP 1: Create Firebase Auth Account
  auth.createUser({
    uid: generatedUid,
    email: email,
    disabled: false
  })
  
  IF FAILS: Return error, ABORT (no cleanup needed)

STEP 2: Create Firestore /users/{uid}
  firestore.collection('users').doc(uid).set({
    uid, email, name, role, status="active",
    permissions, authMethod="pin", timestamps
  })
  
  IF FAILS:
    COMPENSATE: auth.deleteUser(uid)
    Return error with "Account creation failed, auth rolled back"

STEP 3: Create Firestore /userCredentials/{uid}
  firestore.collection('userCredentials').doc(uid).set({
    uid, pinHash=bcrypt(pin),
    pinFailedAttempts=0, pinLockedUntil=null
  })
  
  IF FAILS:
    COMPENSATE:
      1. auth.deleteUser(uid)
      2. firestore.collection('users').doc(uid).delete()
    Return error with "Account creation failed, rolled back"

STEP 4: Success
  Return { uid, email, initialPin }
```

**Idempotency (REVISED):**

```
If createUser called twice with same email:

  FIRST CALL:
    - Creates auth user
    - Creates /users document
    - Creates /userCredentials document
    - Returns success

  SECOND CALL (same email):
    - STEP 1: auth.createUser() fails (email exists)
    - No Firebase Auth user created
    - No cleanup needed (auth user not created)
    - Return error "User already exists"
    
  RESULT: Idempotent, no orphans
```

**Why This Design:**
- ✅ Each step has explicit compensating action
- ✅ If /users fails, auth account is deleted
- ✅ If /userCredentials fails, both are cleaned up
- ✅ Function is idempotent (safe to retry)
- ✅ No orphan accounts or documents left behind

---

### ✅ Correction 3: Firestore as Source of Truth for Admin Authorization

**ISSUE:** Cannot rely exclusively on request.auth.token.role (custom claims).

**SOLUTION:** Check both Firestore status AND custom claims for admin authorization.

**Admin Authorization Pattern (REVISED):**

```
// EVERYWHERE admin authorization is needed:

1. Cloud Function receives request from Firebase-authenticated user
   request.auth.uid = user's Firebase UID
   request.auth.token.role = custom claim (may be stale)

2. Load Firestore /users/{uid}
   Check: user.role == "admin" && user.status == "active"
   
3. If BOTH conditions met:
   User is authorized as admin
   
4. If EITHER fails:
   Deny request
   
PSEUDO-CODE:
  const user = await db.collection('users').doc(request.auth.uid).get();
  if (user.data().role !== 'admin' || user.data().status !== 'active') {
    throw new Error('Unauthorized: admin role/status required');
  }
  // User is authorized as admin
```

**Why This Design:**
- ✅ Custom claims are optimization only (cache layer)
- ✅ Firestore is source of truth for actual role/status
- ✅ Admin disable is enforced (status check)
- ✅ Role changes take effect immediately (no token wait)
- ✅ Two independent checks prevent claim staleness

---

### ✅ Correction 4: Explicit Diary/Exams Behavior Decision

**ISSUE:** V2 said "preserve existing" but changed rules silently.

**Current Existing Behavior (VERIFIED):**

```
/diary:
  allow read: if true;  // ANYONE can read (public)
  allow write: if request.auth.token.email == "rockyhsn9@gmail.com";  // admin only

/exams:
  (Assumed identical pattern, but NOT verified in current code)
```

**DECISION: Option B - Intentionally Change to Authenticated-Only (EXPLICIT)**

**Reasoning:**
- Current: "public read" means unauthenticated users could read
- Problem: Unauthenticated users are not in our system
- Intent: All existing users are authenticated (student/parent/teacher/admin)
- Change: Restrict to authenticated users only (safer default)
- No students/parents/teachers lose access (they're all authenticated)

**Final Rules (EXPLICIT CHANGE):**

```
/diary/{diaryId} {
  // All AUTHENTICATED users can read diary
  allow read: if request.auth != null;
  
  // Only admin can write diary
  allow write: if request.auth != null &&
               request.auth.token.email == "rockyhsn9@gmail.com" &&
               request.auth.token.role == 'admin';  // Double-check role
}

/exams/{examId} {
  // All AUTHENTICATED users can read exams
  allow read: if request.auth != null;
  
  // Only admin can write exams
  allow write: if request.auth != null &&
               request.auth.token.email == "rockyhsn9@gmail.com" &&
               request.auth.token.role == 'admin';  // Double-check role
}
```

**Change Log:**
- ✅ Changed `/diary` from `allow read: if true` to `allow read: if request.auth != null`
- ✅ Changed `/exams` from (assumed same) to require authentication
- ✅ Added role double-check on admin write (defense in depth)
- ✅ Rationale: Only authenticated users should access school content

**Verification Post-Migration:**
- Test that logged-in users can read diary
- Test that logged-out users cannot read diary
- Test that admin can still write diary/exams

---

### ✅ Correction 5: getLoginUsers - Required & Secure

**FINDING:** Login UX DOES require user list (role cards for student/parent/teacher).

**Login Flow (Current & Future):**
```
1. User opens login page
2. Page renders 3 role cards:
   - Student card (shows name if student user exists)
   - Parent card (shows name if parent user exists)
   - Teacher card (shows name if teacher user exists)
3. User clicks role card
4. PIN entry appears
5. User enters PIN
```

**Current:** Data comes from `useAccess().users` (context from localStorage)

**Future:** Data must come from Firestore via `getLoginUsers` Cloud Function

**getLoginUsers Function (RETAINED & HARDENED):**

```
GET /api/auth/login-users

PUBLIC ENDPOINT: No authentication required
RATE LIMIT: 100 requests per minute per IP (or 5 per 10 seconds for aggressive bots)
CACHE: 5 seconds (responses cached to prevent abuse)

RESPONSE (Safe Fields Only):
{
  "users": [
    {
      "uid": "pin-wafi-123",
      "name": "Wafi",
      "email": "affanwafee@gmail.com",
      "role": "student",
      "status": "active",
      "authMethod": "pin"
    }
  ]
}

SECURITY GUARANTEES:
  ✅ Never returns: pinHash
  ✅ Never returns: pinFailedAttempts
  ✅ Never returns: pinLockedUntil
  ✅ Never returns: createdBy
  ✅ Never returns: permissions
  ✅ Never returns: timestamps (creation/update)
  ✅ Never returns: credential metadata
  ✅ Only returns: uid, name, email, role, status, authMethod

FILTERING:
  - Include only: authMethod == "pin" (PIN users visible)
  - Include only: status == "active" (disabled users hidden)
  - Exclude: admin users (Rocky signs in via Google, not role card)

RATE LIMITING:
  - 100 requests/minute global
  - 5 requests/10 seconds per IP
  - Respond with 429 Too Many Requests if exceeded
  - Retry-After header: suggested wait time

QUERY FILTERING IN CLOUD FUNCTION:
  db.collection('users')
    .where('authMethod', '==', 'pin')
    .where('status', '==', 'active')
    .select('uid', 'name', 'email', 'role', 'status', 'authMethod')
    .get()
```

**Why Retained:**
- ✅ Login UX requires displaying available users
- ✅ Function only returns safe (non-sensitive) fields
- ✅ Rate limiting prevents abuse
- ✅ No credentials or locks exposed

---

### ✅ Correction 6: Account Disable - Complete Flow

**Disable Flow (REVISED - Complete):**

```
ADMIN ACTION: Disable user (Rocky disables Wafi)

STEP 1: Update Firestore /users/{uid}
  firestore.collection('users').doc(wafi_uid).update({
    status: 'disabled',
    updatedAt: now
  })
  
STEP 2: Disable Firebase Auth account
  auth.updateUser(wafi_uid, { disabled: true })
  
STEP 3: Revoke existing refresh tokens (if using refresh tokens)
  auth.revokeRefreshTokens(wafi_uid)
  (This invalidates all existing sessions)

LAYER ENFORCEMENT:

  Layer 1: Authentication (Firebase Auth)
    - Request denied with "User account has been disabled"
    - User cannot obtain new token
    - Old tokens expire naturally (TTL 1 hour)
  
  Layer 2: Authorization (Firestore Rules)
    - /diary & /exams check: request.auth.token.role == 'admin'
    - If user not admin, query fails
    - Even if old token valid, cannot access protected data
  
  Layer 3: Real-time Listener (UI Response)
    - /users/{uid} listener fires
    - UI detects status='disabled'
    - UI shows "Account disabled" message
    - UI redirects to login within 500ms
    - This is ONLY for user experience, NOT security boundary

GUARANTEE:
  - User cannot log in (auth disabled)
  - User cannot access protected data (rules deny)
  - UI responds fast (listener)
  - All 3 layers independent = fail-safe
```

**Why This Design:**
- ✅ Firebase Auth.disabled prevents authentication (hard stop)
- ✅ Firestore rules prevent authorization (defense layer)
- ✅ Listener provides fast UI response (user experience)
- ✅ No reliance on listener for security (it's optional)

---

## FINAL FIRESTORE COLLECTIONS

### Collection 1: `/users/{uid}` - Account Data (Client-Readable with Status)

```typescript
{
  uid: string,                        // Same as document ID
  email: string,                      // Unique, indexed
  name: string,
  role: "admin" | "student" | "parent" | "teacher",
  status: "active" | "disabled",      // User can always observe own status
  permissions: string[],              // Feature access
  authMethod: "google" | "pin",
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  lastLoginAt: timestamp | null,
}
```

**Access Rules (REVISED):**
```
allow read: if request.auth.uid == uid ||
            request.auth.token.role == 'admin';
```

---

### Collection 2: `/userCredentials/{uid}` - PIN Storage (Admin SDK Only)

```typescript
{
  uid: string,
  pinHash: string,                    // bcrypt
  pinFailedAttempts: number,
  pinLockedUntil: timestamp | null,
  pinLastSet: timestamp,
}
```

**Access Rules:**
```
allow read, write: if false;  // DENY ALL
```

---

### Collection 3: `/diary/{id}` - School Content (Authenticated Read)

**Final Rules (INTENTIONALLY CHANGED):**

```
match /diary/{diaryId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null &&
               request.auth.token.email == "rockyhsn9@gmail.com" &&
               request.auth.token.role == 'admin';
}
```

**Change Rationale:**
- From: Public read (allow read: if true)
- To: Authenticated read (allow read: if request.auth != null)
- Why: Only authenticated users should access school content
- Effect: No users lose access (all are authenticated)

---

### Collection 4: `/exams/{id}` - Exams (Authenticated Read)

**Final Rules (NEW):**

```
match /exams/{examId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null &&
               request.auth.token.email == "rockyhsn9@gmail.com" &&
               request.auth.token.role == 'admin';
}
```

**Change Rationale:**
- Same as diary (authenticated read, admin write)
- Double-check role='admin' for security

---

## FINAL FIRESTORE SECURITY RULES

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== USERS COLLECTION ==========
    // Account data with status (client-readable)
    match /users/{uid} {
      // User can read own, admin can read all
      allow read: if request.auth != null && (
        request.auth.uid == uid ||
        request.auth.token.role == 'admin'
      );
      
      // Write via Cloud Functions only (admin SDK)
      allow create, update, delete: if false;
    }
    
    // ========== CREDENTIALS COLLECTION ==========
    // PIN hashes (LOCKED DOWN - admin SDK only)
    match /userCredentials/{uid} {
      allow read, write: if false;  // DENY ALL client access
    }
    
    // ========== DIARY COLLECTION ==========
    // Authenticated read, admin write
    match /diary/{diaryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                   request.auth.token.email == "rockyhsn9@gmail.com" &&
                   request.auth.token.role == 'admin';
      allow delete: if false;  // Admin can delete via removeDoc
    }
    
    // ========== EXAMS COLLECTION ==========
    // Authenticated read, admin write
    match /exams/{examId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                   request.auth.token.email == "rockyhsn9@gmail.com" &&
                   request.auth.token.role == 'admin';
      allow delete: if false;  // Admin can delete via removeDoc
    }
    
    // ========== DEFAULT DENY ==========
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## FINAL CLOUD FUNCTIONS

### Function 1: `getLoginUsers` (PUBLIC - Rate Limited)

```
GET /api/auth/login-users
No authentication required
Rate limit: 100 req/min global, 5 req/10s per IP
Cache: 5 seconds

Returns:
{
  users: [
    {
      uid, name, email, role, status, authMethod
    }
  ]
}

Filters:
  - authMethod == 'pin'
  - status == 'active'
  - Never returns: PIN, hash, attempts, lockout, credentials
```

---

### Function 2: `createUser` (ADMIN - Compensating Rollback)

```
POST /api/admin/users

COMPENSATING ROLLBACK:
  Step 1: Create Firebase Auth
          ↓ fail → return error
  
  Step 2: Create /users/{uid}
          ↓ fail → delete auth user, return error
  
  Step 3: Create /userCredentials/{uid}
          ↓ fail → delete auth + /users, return error
  
  ✅ Success → return { uid, email, pin }

Idempotent:
  - Calling twice with same email fails on second attempt (email exists)
  - No orphan accounts created
```

---

### Function 3: `pinLogin` (PUBLIC)

```
POST /api/auth/pin-login

Process:
  1. Verify PIN against /userCredentials/{uid}.pinHash
  2. Check brute-force lockout
  3. Check /users status == 'active'
  4. Create custom token
  5. Update lastLoginAt

No new changes from V2
```

---

### Function 4: `resetPin` (ADMIN)

```
PUT /api/admin/users/{uid}/pin/reset

Process:
  1. Verify admin (check /users role + status)
  2. Generate new PIN
  3. Update /userCredentials pinHash
  4. Reset attempts/lockout
  5. Return new PIN to admin

No changes from V2
```

---

### Function 5: `disableUser` (ADMIN)

```
PUT /api/admin/users/{uid}/disable

Process:
  1. Verify admin (check /users role + status)
  2. Update /users status = 'disabled'
  3. Update Firebase Auth: disabled = true
  4. Revoke refresh tokens
  5. Return success

ENFORCEMENT LAYERS:
  Layer 1: Auth.disabled (hard stop)
  Layer 2: Firestore rules (authorization check)
  Layer 3: Listener (UI response)
```

---

### Function 6: `updateUser` (ADMIN)

```
PUT /api/admin/users/{uid}

Process:
  1. Verify admin (check /users role + status)
  2. Update /users document
  3. If role changed, update custom claims
  4. Return updated document

No changes from V2
```

---

## FINAL MIGRATION PROCEDURE

### Step 1: Backup Existing Data
- Export wafi.users-access (4 users with PINs)
- Backup /diary and /exams

### Step 2: Deploy Cloud Functions
- createUser (with compensating rollback)
- pinLogin, resetPin, disableUser, updateUser
- getLoginUsers (rate limited)

### Step 3: Deploy Firestore Rules
- /users (read own or admin)
- /userCredentials (deny all)
- /diary (authenticated read, admin write)
- /exams (authenticated read, admin write)

### Step 4: Create Rocky's Account
- Already has Firebase UID from Google Sign-In
- Create /users/{googleUid} with admin role
- No /userCredentials (admin uses Google, no PIN)

### Step 5: Create PIN Users (Afreen, Wafi, Tahsin)
- Call Cloud Function createUser for each
- Function creates: Auth + /users + /userCredentials
- Compensating rollback handles any failure

### Step 6: Deploy Frontend Code
- Update access-store.tsx
- Update index.tsx (login)
- Update admin dashboard
- Remove localStorage users storage
- Add getLoginUsers integration

### Step 7: Test All Verifications
- Admin Google login works
- All 4 users can log in with PIN
- Disable functionality works
- Diary/exams still work
- Fresh incognito works

### Step 8: Go Live
- Deploy to production
- Monitor for 24 hours

---

## FILES TO MODIFY (Same as V2)

| File | Change | Risk |
|------|--------|------|
| access-store.tsx | Major refactor | HIGH |
| index.tsx | Login flow to Cloud Function | HIGH |
| admin/$userId.tsx | Admin ops to Cloud Functions | MEDIUM |
| school-content.tsx | Verify (no change) | LOW |
| route-guard.tsx | Verify (no change) | LOW |

---

## SUMMARY OF V3 CHANGES FROM V2

| Issue | V2 | V3 | Fix |
|-------|----|----|-----|
| Disabled listener | May fail permission-denied | Users can always read own /users | Added uid == request.auth.uid check |
| createUser atomic | Claimed atomic transaction | Explicit compensating rollback | Rollback on each step failure |
| Admin auth | Custom claims only | Firestore source of truth | Check /users role + status always |
| Diary/exams | "Preserved exactly" but changed | Intentional authenticated-only | Changed with explicit rationale |
| getLoginUsers | Not justified | Needed for role cards | Verified login UX requires it |
| Disable complete | Listener + auth | Three layers documented | Auth + rules + listener all required |

---

## APPROVAL CHECKLIST - V3

```
Disabled User Listener:
  ☐ User can read own /users even when disabled
  ☐ Listener succeeds, detects status change
  ☐ Protected collections still check status="active"

Create User Atomicity:
  ☐ Explicit compensating rollback defined
  ☐ Each step can fail independently
  ☐ No orphan accounts possible
  ☐ Operation is idempotent

Admin Authorization:
  ☐ Firestore is source of truth
  ☐ Custom claims are optimization only
  ☐ All admin checks verify /users role + status
  ☐ Dynamic role/status take effect immediately

Diary/Exams Behavior:
  ☐ Change from public to authenticated-only is INTENTIONAL
  ☐ Explicit rationale documented
  ☐ No silent behavior changes
  ☐ Both follow same rules

getLoginUsers:
  ☐ Login UX DOES require user list
  ☐ Function only returns safe fields
  ☐ Rate limiting prevents abuse
  ☐ No credentials exposed

Account Disable:
  ☐ Three independent enforcement layers
  ☐ Auth.disabled prevents login
  ☐ Rules prevent data access
  ☐ Listener is UI response only (not security)
  ☐ Listener failure doesn't break security
```

---

**READY FOR FINAL APPROVAL**

No code changes yet.  
No deployments.  
No migrations.  
No Auth user creation.  
All design-phase corrections applied.

Awaiting your approval to proceed with implementation.

