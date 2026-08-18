# PHASE 1 - PRE-IMPLEMENTATION AUDIT REPORT

**Status:** 🔴 AUDIT COMPLETE - READY FOR PHASE 2 APPROVAL  
**Date:** August 17, 2026  
**Scope:** Current authentication, Firebase, and data architecture  

---

## 1. CURRENT AUTHENTICATION FLOW

### Login Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│           WAFI CURRENT AUTHENTICATION                  │
└────────────────────────────────────────────────────────┘

ENTRY POINT: "/" route (src/routes/index.tsx)

PATH 1: NON-ADMIN (Student, Teacher, Parent)
  1. User sees 3 role cards (Student, Teacher, Parent)
  2. Clicks role → UI shows role-specific user(s)
  3. User selects role → PIN entry screen appears
  4. User enters 4-digit PIN on numeric keypad
  5. Frontend: lookup user in localStorage["wafi.users-access"]
  6. Frontend: validate PIN matches user.pin
  7. On match:
     - Store: localStorage["wafi.session.email"] = user.email
     - Call: setEmail() in AccessProvider
     - Trigger: currentUser useMemo updates
     - Navigate: to /dashboard or redirect param
  8. On mismatch:
     - Show: "Incorrect PIN" error
     - Keep: PIN screen visible for retry

PATH 2: ADMIN (Google OAuth)
  1. Click lock icon → Firebase signInWithPopup(GoogleAuthProvider)
  2. User authorizes Google account in popup
  3. Firebase Auth: Create/link account
  4. onAuthStateChanged fires in AccessProvider:
     - Validate: firebaseUser.email == VITE_FIREBASE_ADMIN_EMAIL
     - On match:
       - Create: {id: "u-firebase-admin", role: "admin", ...} in users array
       - Store: localStorage["wafi.session.email"] = firebaseUser.email
       - Navigate: to /dashboard or redirect param
     - On mismatch:
       - Call: firebaseSignOut(auth)
       - Show: "Only {admin_email} can authenticate as admin"
  5. Firebase Auth: Persist via browserLocalPersistence
     - Survives page reload
     - Auto-triggers onAuthStateChanged on app restart

LOGOUT (Both Paths)
  1. User calls signOut()
  2. Remove: localStorage["wafi.session.email"]
  3. Clear: setEmail(null)
  4. If admin: firebaseSignOut(auth)
  5. Navigate: back to "/"

SESSION RESTORE ON PAGE RELOAD
  1. App mounts: AccessProvider runs useEffect
  2. Check: localStorage["wafi.session.email"]
  3. Find: user in localStorage["wafi.users-access"] by email
  4. Set: currentUser = found user
  5. Auto-navigate: to /dashboard (via useEffect)
  6. Admin path: onAuthStateChanged also fires → auto-creates admin user
```

### Current Auth State Persistence

| Mechanism | Location | Persists | Purpose |
|-----------|----------|----------|---------|
| Session email | `localStorage["wafi.session.email"]` | Page reload | Current user identity |
| All users | `localStorage["wafi.users-access"]` | Browser storage | User database |
| Firebase Auth | `browserLocalPersistence` | Cookie + indexedDB | Admin OAuth token |
| Firestore listener | Memory (React state) | Not persistent | Real-time data |

---

## 2. FIREBASE CONFIGURATION

### Project Details

```
Project ID:                    wafi-learning-buddy-new
Admin Email:                   rockyhsn9@gmail.com
Firebase SDK Version:          Latest (from package.json)
Authentication Providers:      Google OAuth only (admin)
Database:                      Firestore
Deployment Target:             Web + Cloudflare Workers (Nitro)
```

### Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `.env.local` | Firebase config + admin email | ✅ Configured |
| `src/lib/firebase.ts` | Firebase initialization | ✅ Ready |
| `firebase.json` | Deployment config | ✅ Set up |
| `firestore.rules` | Security rules | ⚠️ Needs expansion |

### Current Firebase Config (from .env.local)

```
VITE_FIREBASE_API_KEY=AIzaSyA4tQ2p0qY79I0GkeC_mxfXJcV9bXtCSEk
VITE_FIREBASE_AUTH_DOMAIN=wafi-learning-buddy-new.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wafi-learning-buddy-new
VITE_FIREBASE_STORAGE_BUCKET=wafi-learning-buddy-new.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=225157832572
VITE_FIREBASE_APP_ID=1:225157832572:web:ca791b5a0e76e28635cef9
VITE_FIREBASE_ADMIN_EMAIL=rockyhsn9@gmail.com
```

---

## 3. FIRESTORE RULES - CURRENT STATE

### Deployed Rules (firestore.rules)

```firestore-rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Diary collection: 
    match /diary/{diaryId} {
      allow read: if true;              // ✅ PUBLIC READ
      allow write: if request.auth != null
                   && request.auth.token.email == "rockyhsn9@gmail.com";  // ✅ ADMIN ONLY
    }

    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;      // ✅ ALL OTHERS DENIED
    }
  }
}
```

### Collection Coverage (Current)

| Collection | Read | Write | Scope | Notes |
|-----------|------|-------|-------|-------|
| `/diary/*` | ALL (public) | rockyhsn9@gmail.com | Public classroom info | Currently deployed |
| `/exams/*` | DENIED | DENIED | None | No rules defined (default deny) |
| `/users/*` | DENIED | DENIED | None | No collection exists |
| `/userCredentials/*` | DENIED | DENIED | None | No collection exists |
| `/{document=**}` | DENIED | DENIED | Default | Catch-all deny-all |

### Coverage Gap Analysis

```
✅ /diary: Properly ruled (public read, admin write)
❌ /exams: No rules (currently stored in localStorage only)
❌ /users: No collection + no rules
❌ /userCredentials: No collection + no rules
❌ Role-based access: Not implemented
❌ Active status enforcement: Not implemented
```

---

## 4. CLOUD FUNCTIONS - CURRENT STATE

**Status:** ❌ NONE DEPLOYED

### Functions Directory

```
Path: d:\wafi-learning-buddy-new\functions
Status: Directory does NOT EXIST
```

### Required Functions (V5 Blueprint - Not Yet Created)

```
1. pinLogin(email, pin)
   - Verify PIN
   - Load /users/{uid}
   - Create custom token
   - Return token + expiresIn

2. resetPin(uid)
   - Verify admin
   - Generate new PIN
   - Save to /userCredentials/{uid}
   - Return new PIN (via email/admin panel)

3. createUser(name, email, role)
   - Verify admin
   - Create Firebase Auth account
   - Create /users/{uid} document
   - Create /userCredentials/{uid}
   - Set custom claims
   - Return uid

4. updateUser(uid, patch)
   - Verify admin
   - Update /users/{uid}
   - Sync custom claims if role/status changed

5. disableUser(uid)
   - Verify admin
   - Set /users:{uid}.status = 'disabled'
   - Disable Firebase Auth account
   - Revoke refresh tokens

6. getLoginUsers()
   - Return: [{uid, name, email, role, status}]
   - Never return: PIN, pinHash, failed attempts, lockout state
```

---

## 5. LOCALSTORAGE - CURRENT STATE

### Storage Keys and Values

| Key | Type | Current Value | Updated By | Persists | Notes |
|-----|------|---------------|-----------|----------|-------|
| `wafi.users-access` | JSON | `[]` (empty) | AccessProvider | localStorage | All user accounts |
| `wafi.session.email` | string | `null` | AccessProvider | localStorage | Current login session |
| `wafi.lang` | string | `"en"` | AppProvider | localStorage | Language preference |
| `wafi.dark` | string | `"0"` or `"1"` | AppProvider | localStorage | Dark mode |
| `wafi.school-content` | JSON | seed data | SchoolContentProvider | localStorage | Diary + exams + routine |

### Current Users in Storage

```
localStorage["wafi.users-access"] = []  // EMPTY

NOTE: seedUsers array in access-store.tsx is empty:
  const seedUsers: AccessUser[] = [];

CONSEQUENCE: 
  - No users available on fresh app start
  - User must be added via admin panel (invite action)
  - No pre-seeded test accounts exist
```

---

## 6. USER DATA STRUCTURE - CURRENT

### AccessUser Type (src/lib/access-store.tsx)

```typescript
type AccessUser = {
  id: string;                           // "u-{timestamp}" or "u-firebase-admin"
  name: string;                         // Display name
  email: string;                        // Unique identifier
  role: "student" | "parent" | "teacher" | "admin";
  status: "active" | "invited" | "disabled";
  permissions: FeatureKey[];            // Array of allowed features
  pin: string;                          // 4-digit PIN (plaintext in localStorage!)
};

// Example:
{
  id: "u-1700000000",
  name: "Wafi Rahman",
  email: "wafi@example.com",
  role: "student",
  status: "active",
  permissions: ["dashboard", "study", "homework", ...],
  pin: "1234"
}
```

### DiaryEntry Type (src/lib/school-content.tsx)

```typescript
type DiaryEntry = {
  id: string;                  // UID generated client-side
  date: string;                // YYYY-MM-DD format
  subject: string;             // "English Language", etc.
  cw: string;                  // Classwork description
  hw: string;                  // Homework description
  answer: string;              // Optional student answer
  teacherAnswer?: string;      // Advanced fields
  easyAnswer?: string;
  banglaExplanation?: string;
  pronunciation?: string[];
  wordMeanings?: Array<{word, meaning}>;
  practice?: { question, options };
};

// Current Storage Location: BOTH Firestore + localStorage
//   - Firestore: read by all, written by admin
//   - localStorage: fallback + cache
```

### ExamEntry Type

```typescript
type ExamEntry = {
  id: string;                  // UID generated
  name: string;                // "Math Class Test"
  date: string;                // YYYY-MM-DD
  chapter: string;             // "Chapter 3: Fractions"
  description?: string;        // Optional notes
};

// Current Storage Location: localStorage ONLY
//   - Firestore: no rules defined (default deny)
//   - localStorage: primary storage
```

### RoutineEntry Type

```typescript
type RoutineEntry = {
  day: string;                 // "Monday", "Tuesday", etc.
  subject: string;             // "English", "Math", etc.
  period: string;              // "1st Period", "2nd Period"
  room: string;                // Room number
};

// Current Storage Location: localStorage ONLY
//   - Firestore: no rules defined
//   - localStorage: primary storage
```

---

## 7. DIARY & EXAMS ACCESS PATTERNS - CURRENT

### Current Rules Enforcement

| Role | Can Read Diary | Can Write Diary | Can Read Exams | Can Write Exams |
|------|---|---|---|---|
| student | ✅ Yes (public) | ❌ No (admin only) | ✅ Yes (localStorage) | ❌ No |
| teacher | ✅ Yes (public) | ❌ No (admin only) | ✅ Yes (localStorage) | ❌ No |
| parent | ✅ Yes (public) | ❌ No (admin only) | ✅ Yes (localStorage) | ❌ No |
| admin | ✅ Yes (public) | ✅ Yes (Firestore + auth) | ✅ Yes (localStorage) | ✅ Yes (localStorage) |

### Read Path (Current)

```
DIARY READ:
  1. Frontend: db.collection('diary').get()
  2. Firestore: allow read: if true
  3. Result: ✅ All diary docs returned (no auth check)
  4. Note: Public access - anyone with app can read

EXAMS READ:
  1. Frontend: Check localStorage["wafi.school-content"]
  2. Firestore: Rules deny all (default)
  3. Result: ✅ LocalStorage only
  4. Note: Never synced to Firestore (app data loss risk)
```

### Write Path (Admin Only - Current)

```
DIARY WRITE:
  1. Frontend: Check currentUser.role === 'admin'
  2. Frontend: Check isAdminAuthenticatedWithFirebase
  3. Frontend: Call setDoc(db, 'diary', entry)
  4. Firestore Rules: Check request.auth.token.email == "rockyhsn9@gmail.com"
  5. Result: ✅ Write allowed (double validation)
  6. Sync: Also update localStorage["wafi.school-content"]

EXAMS WRITE:
  1. Frontend: Check currentUser.role === 'admin'
  2. Frontend: Update localStorage["wafi.school-content"]
  3. Firestore: No sync (exams stored locally only)
  4. Result: ✅ Write to localStorage only
  5. Risk: Data lost if localStorage cleared
```

---

## 8. EXISTING USERS - CURRENT STATE

### The Four Target Users

| User | Name | Email | Role | Status | Current Location | Notes |
|------|------|-------|------|--------|------------------|-------|
| Rocky | Rocky Hassan | rockyhsn9@gmail.com | admin | active | Firebase Auth only | Google OAuth, not in localStorage |
| Afreen | Afreen | ? | parent | ? | **NOT FOUND** | ❌ Missing |
| Wafi | Wafi Rahman | ? | student | ? | Mock data only | Mock profile in mock-data.ts, not in localStorage |
| Tahsin | Tahsin | ? | teacher | ? | **NOT FOUND** | ❌ Missing |

### Current User Seed Status

```
File: src/lib/access-store.tsx

const seedUsers: AccessUser[] = [];  // ⚠️ EMPTY!

Implication:
  - No users seeded at app start
  - localStorage["wafi.users-access"] is empty
  - Admin must manually invite users via admin panel
  - No test accounts pre-configured
  - Login screen shows "No account found for this role" for non-admin
```

### Rocky Hassan (Admin)

```
Current Status: ✅ FIREBASE AUTH EXISTS
  - Email: rockyhsn9@gmail.com
  - Provider: Google OAuth
  - Method: Firebase Auth (not PIN)
  - Access: Via lock icon on login screen
  - Storage: Firebase Auth only (no Firestore /users doc)
  
What Needs to Happen (V5):
  1. Keep Firebase Auth account as-is
  2. Create /users/{uid} document
  3. Create /userCredentials/{uid} (if PIN-based, but Rocky is OAuth)
  4. Set custom claims (role, email)
  5. Create uid linking (Firebase UID stays same)
```

### Afreen (Parent) - MISSING

```
Current Status: ❌ NO ACCOUNT FOUND
  
What Needs to Happen (V5):
  1. Create Firebase Auth account (custom token based)
  2. Assign PIN (to be provided or generated)
  3. Create /users/{uid} document
  4. Create /userCredentials/{uid} with PIN hash
  5. Verify email/name/role with user
```

### Wafi (Student) - MOCK ONLY

```
Current Status: ⚠️ MOCK DATA ONLY
  - Found in: src/lib/mock-data.ts (demo UI profile)
  - Not in: localStorage["wafi.users-access"]
  - Cannot: Actually log in to app
  
What Needs to Happen (V5):
  1. Create Firebase Auth account
  2. Assign PIN
  3. Create /users/{uid} document
  4. Create /userCredentials/{uid}
  5. Remove from mock-data.ts (or keep for demo)
```

### Tahsin (Teacher) - MISSING

```
Current Status: ❌ NO ACCOUNT FOUND
  
What Needs to Happen (V5):
  1. Create Firebase Auth account
  2. Assign PIN
  3. Create /users/{uid} document
  4. Create /userCredentials/{uid}
  5. Verify email/name/role with user
```

---

## 9. FILES REQUIRING MODIFICATION

### Frontend Files

| File | Purpose | Modification Needed |
|------|---------|---------------------|
| `src/lib/access-store.tsx` | User auth store | Seed 4 users + Firestore sync |
| `src/routes/index.tsx` | Login UI/flow | No changes (structure compatible) |
| `src/lib/firebase.ts` | Firebase config | No changes (already ready) |
| `src/lib/school-content.tsx` | Diary/exams sync | No changes (already syncs Firestore) |
| `src/routes/admin/$userId.tsx` | Admin user panel | No changes (already uses useAccess) |
| `src/routes/admin/diary.tsx` | Admin diary editor | No changes (already uses school-content) |
| `src/routes/admin/exams.tsx` | Admin exams editor | No changes (already uses school-content) |
| `src/components/route-guard.tsx` | Feature access | No changes (already checks status) |

### Backend/Config Files

| File | Purpose | Modification Needed |
|------|---------|---------------------|
| `firestore.rules` | Security rules | ADD: /users, /userCredentials, exams rules + get() queries |
| `.env.local` | Firebase config | ✅ Already complete |
| (create) `functions/` | Cloud Functions | CREATE: 6 functions |
| (create) `functions/src/auth.ts` | Auth functions | CREATE: pinLogin, resetPin, custom token |
| (create) `functions/src/users.ts` | User functions | CREATE: createUser, updateUser, disableUser, getLoginUsers |
| (create) `functions/src/index.ts` | Function exports | CREATE: export functions |
| (create) `.env.production` | Prod config | CREATE: if different from .env.local |

---

## 10. CRITICAL SECURITY FINDINGS

### Issue 1: PIN Stored in Plaintext (localStorage)

```
Location: localStorage["wafi.users-access"]
Problem: PIN stored as plaintext
  {
    ...
    pin: "1234"
  }

Risk:
  - Browser DevTools can inspect storage
  - XSS attack can exfiltrate PINs
  - Plaintext in network (if synced)

V5 Plan:
  - Move PIN hash to /userCredentials/{uid} (Firestore)
  - Remove PIN from localStorage
  - Server-side verification in Cloud Functions
  - Never send PIN hash to client
```

### Issue 2: No Role-Based Collection Access

```
Current: /diary public to all (even unauthenticated)
Problem: No role-based filtering in Firestore
  - Students can read admin notes (if added)
  - Parents can read other parent accounts (if collection created)
  - No per-user data privacy

V5 Plan:
  - Add get(/users) checks to all collection rules
  - Enforce status="active" in rules
  - Separate public collections from private
```

### Issue 3: Exams Stored in localStorage Only

```
Current: /exams data never synced to Firestore
Problem: Data lost on browser clear
  - No backup
  - No audit trail
  - Admin cannot modify from another device

V5 Plan:
  - Add Firestore rules for /exams
  - Add sync pattern (like diary)
  - Admin can edit from any device
```

### Issue 4: Custom Token TTL Misunderstood (V5.1 Corrected)

```
Blueprint stated: "expiresIn: 900 creates 15-minute TTL"
Reality: expiresIn is informational only
  - Firebase TTL: 3600 seconds (fixed)
  - Cannot be shortened by expiresIn field
  
V5.1 Correction: Applied ✅
```

### Issue 5: Stale Claims Window (V5 Fixed)

```
V4 Problem: Custom claims could be stale (1 hour)
V5 Solution: Rules use get(/users) instead of claims
Result: Zero stale window ✅
```

---

## 11. FIRESTORE RULES TESTING - EMULATOR VERIFICATION PENDING

### V5.1 Requirement: Query Behavior

**Must Verify:**
```
Test 1: Query with permission-denied rule
  Precondition: User with status='disabled'
  Query: db.collection('diary').get()
  Expected: Error with code='permission-denied' (not empty result)
  Status: ⏳ PENDING - requires emulator test
  
Test 2: Where clause with permission-denied
  Precondition: User with status='disabled'
  Query: db.collection('diary').where('date', '>=', startDate).get()
  Expected: Error with code='permission-denied' (not empty result)
  Status: ⏳ PENDING - requires emulator test
```

### V5.1 Requirement: Billing/Performance

**Must Verify:**
```
Test 1: get() call count with multiple documents
  Setup: 100 diary documents, single user query
  Measure: How many billable get(/users/{uid}) calls?
  Expected: 1-100 (depending on caching)
  Status: ⏳ PENDING - requires emulator + production monitoring
  
Test 2: get() caching across request
  Setup: Frontend loads 10 diary docs in single snapshot listener
  Measure: Single get(/users) call or per-document?
  Expected: Single call (cached within request)
  Status: ⏳ PENDING - requires emulator logs
```

---

## 12. PHASE 1 SUMMARY

### Current Architecture State

```
✅ EXISTING & WORKING:
  - Firebase project configured
  - Google OAuth for admin working
  - Firestore diary sync working
  - localStorage user storage working
  - Seed data (diary/exams/routine) working
  - Access control store implemented
  - Login UI working

⚠️  PARTIALLY WORKING:
  - /diary public access (needs auth layer)
  - Admin auth (Firebase only, no PIN option)
  - Exams stored locally only (not synced)

❌ MISSING:
  - /users collection (not created)
  - /userCredentials collection (not created)
  - Cloud Functions (not deployed)
  - PIN hashing (currently plaintext)
  - Status-based rule enforcement
  - getLoginUsers function
  - Firestore rules for exams
  - Test data for 4 users

🔒 SECURITY ISSUES:
  - PIN plaintext in localStorage
  - No role-based data access
  - No per-user data privacy
  - Exams not backed up (localStorage only)
```

### Implementation Readiness

| Component | Ready | Needs | Effort |
|-----------|-------|-------|--------|
| Firebase config | ✅ Yes | - | None |
| Frontend structure | ✅ Yes | Seed 4 users | Low |
| Firestore collections | ❌ No | Create /users + /userCredentials | Medium |
| Cloud Functions | ❌ No | Write 6 functions | High |
| Firestore rules | ⚠️ Partial | Add /users + /exams + get() queries | Medium |
| Testing | ⏳ Pending | Emulator tests for V5.1 corrections | Medium |

### Blocking Issues Before Implementation

```
MUST RESOLVE BEFORE PHASE 2:
  1. ❓ Verify user details (Afreen, Tahsin emails/names)
  2. ⏳ Emulator tests for query behavior (V5.1)
  3. ⏳ Emulator tests for billing (V5.1)
  4. ⏳ Define exact PIN values for each user
  5. ⏳ Define test data structure (diary entries, exams)

NICE TO HAVE:
  - Mock data for emulator testing
  - Fresh test environment (staging)
  - Monitoring/logging plan for production
```

---

## 13. NEXT STEPS - PHASE 2 APPROVAL

### Phase 1 Deliverables (This Document)

```
✅ Current auth flow documented
✅ Firebase config audited
✅ Firestore rules analyzed
✅ Cloud Functions requirements identified
✅ User data structures catalogued
✅ Files to modify identified
✅ Security issues discovered
✅ Implementation gaps listed
```

### Phase 2 Actions (Upon Approval)

```
PHASE 2A: PREPARE TEST DATA
  1. Collect exact user info (Rocky, Afreen, Wafi, Tahsin)
  2. Assign PIN to each user
  3. Create test diary/exams entries
  4. Prepare test environment

PHASE 2B: CREATE INFRASTRUCTURE
  1. Create Cloud Functions (6 functions)
  2. Deploy to staging
  3. Test all functions
  4. Update Firestore rules

PHASE 2C: MIGRATE DATA
  1. Create Firebase Auth accounts
  2. Seed /users collection
  3. Seed /userCredentials collection
  4. Verify all 4 users can log in

PHASE 2D: UPDATE FRONTEND
  1. Seed access-store.tsx with 4 users
  2. Test login flow with new users
  3. Test error handling (permission-denied)
  4. Test disabled user flow

PHASE 2E: TESTING & VERIFICATION
  1. Emulator tests (query behavior, billing)
  2. Staging: test all users
  3. Staging: test disabled user enforcement
  4. Staging: test permission-denied errors
  5. Fresh incognito: test new user creation

PHASE 2F: PRODUCTION DEPLOYMENT
  1. Deploy Cloud Functions
  2. Deploy Firestore rules
  3. Migrate Rocky's Google Auth to /users doc
  4. Monitor for errors
  5. Rollback plan ready
```

---

## APPROVAL GATE

**PHASE 1 AUDIT: COMPLETE ✅**

**AWAITING YOUR APPROVAL TO PROCEED:**

- [ ] Review findings above
- [ ] Confirm user details (Afreen, Tahsin missing)
- [ ] Approve V5.1 testing plan
- [ ] Approve Phase 2A (test data prep)

**When ready, respond with:**
```
APPROVED FOR PHASE 2

Provide:
- User details (emails, names, roles, PINs)
- Test data (diary entries, exams)
- Staging environment confirmation
- Rollback procedures approval
```

