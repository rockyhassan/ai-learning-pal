# Firebase Migration Strategy - Serverless Architecture (Revised)
**Created:** August 17, 2026  
**Status:** PLANNING PHASE - NO CODE CHANGES  
**Target:** Migrate real users to Firebase using Firebase-native services ONLY (Cloud Functions + Firestore)  
**Backend:** Firebase Cloud Functions (serverless, no Node.js/Express/Python backend needed)

---

## Executive Summary

This document proposes a **Firebase-native, serverless architecture** that:
- Uses **Cloud Functions** for all backend logic (PIN hashing, JWT generation, rate limiting, admin operations)
- Uses **Firestore** as the persistent source of truth for all user data
- Keeps **localStorage** as a session cache only (JWT tokens, not user arrays)
- **Eliminates the need for a separate Node.js/Express/Python backend**
- Preserves all 4 authentication flows (Admin Google, Student PIN, Parent PIN, Teacher PIN)
- Maintains role-based permissions exactly as they work today
- Enables multi-device sync and data durability
- Allows existing localStorage users to be migrated without data loss
- Scales automatically from 10 to 10,000+ concurrent users

**Key Principle:** Fully serverless—no backend infrastructure to manage; Firebase handles scaling, security, and operations automatically.

---

## 1. Proposed Firebase-Native Serverless Architecture

### 1.1 Current State
```
┌─ Firebase Auth ────────────────┐
│  - Used: Admin Google Sign-In  │
│  - Firebase's UIDs: Only admins│
│  - Email verification: None    │
└────────────────────────────────┘

┌─ localStorage ─────────────────┐
│  - Used: All user data storage │
│  - Session: wafi.session.email │
│  - Users array: wafi.users     │
└────────────────────────────────┘

┌─ Backend (None)────────────────┐
│  - No server infrastructure    │
│  - No Node.js/Express/Python   │
└────────────────────────────────┘
```

### 1.2 Proposed Post-Migration Architecture (Serverless)

```
┌────────────────────────────────────────────────────────────┐
│              FRONTEND (TanStack Start App)                 │
│  - Role selector (public)                                 │
│  - PIN keypad input                                       │
│  - User list display                                      │
│  - JWT token stored in localStorage                       │
│  - Real-time sync via Firestore listeners                 │
└────────────────┬─────────────────────────────────────────┘
                 │
    ┌────────────┴──────────────┬──────────────────┐
    │                           │                  │
    ▼                           ▼                  ▼
  LOGIN              ADMIN OPERATIONS        USER LIST QUERY
  /login             /create-user            /users?role=X
                     /reset-pin
                     /set-permissions
                     
    │                           │                  │
    └────────────┬──────────────┴──────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │   CLOUD FUNCTIONS (Node.js Runtime)         │
    │   ✅ Fully serverless, auto-scaling         │
    │                                             │
    │  Function: login                           │
    │  ├─ Receives: email, pin                    │
    │  ├─ Validate: Rate limit check              │
    │  ├─ Process: bcrypt.compare(pin, hash)      │
    │  ├─ Increment: metadata.failedAttempts      │
    │  ├─ Generate: JWT token (30-day expiry)    │
    │  ├─ Update: metadata.lastLogin timestamp    │
    │  └─ Return: { token, user, expiresIn }    │
    │                                             │
    │  Function: create-user (admin)              │
    │  ├─ Verify: Admin permission               │
    │  ├─ Generate: Random 4-digit PIN           │
    │  ├─ Hash: bcrypt.hash(pin, 10)             │
    │  ├─ Create: Firestore /users/{docId}      │
    │  └─ Return: { pin (one-time display) }    │
    │                                             │
    │  Function: users-list                       │
    │  ├─ Query: Firestore WHERE role=X          │
    │  ├─ Return: [ { email, name }, ... ]       │
    │  └─ NO PINs exposed                         │
    │                                             │
    │  Function: reset-pin (admin)                │
    │  ├─ Verify: Admin permission               │
    │  ├─ Generate: New random PIN               │
    │  ├─ Hash & Update: Firestore               │
    │  └─ Return: { pin (one-time) }            │
    │                                             │
    │  Triggers: Firestore onCreate, onUpdate    │
    │  ├─ onCreate: Log audit event               │
    │  ├─ onUpdate: Log permission changes        │
    │  └─ Auto-send welcome emails               │
    │                                             │
    └────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │   FIRESTORE (Real-time Database)            │
    │   ✅ Persistent source of truth             │
    │   ✅ Auto-sync to all devices              │
    │   ✅ Security rules enforce access          │
    │                                             │
    │  Collection: /users                         │
    │  ├─ Document ID: user_email_${email}       │
    │  ├─ Fields:                                 │
    │  │  ├─ id: "u-1723900800000"               │
    │  │  ├─ email: "student@example.com"        │
    │  │  ├─ name: "Ahmed Hassan"                │
    │  │  ├─ role: "student"                     │
    │  │  ├─ status: "active"|"disabled"         │
    │  │  ├─ permissions: [15 features...]       │
    │  │  ├─ pin: "$2b$10$..." (bcrypt hash)    │
    │  │  ├─ firebaseUid: null (or Firebase UID) │
    │  │  ├─ createdAt: timestamp (server)       │
    │  │  ├─ updatedAt: timestamp (server)       │
    │  │  ├─ deletedAt: null|timestamp           │
    │  │  └─ metadata: {                          │
    │  │     ├─ lastLogin: timestamp             │
    │  │     ├─ failedLoginAttempts: 0           │
    │  │     ├─ lastFailedAttempt: timestamp     │
    │  │     ├─ lockedUntil: null|timestamp      │
    │  │     ├─ loginCount: 42                   │
    │  │     ├─ createdBy: "admin@ex.com"        │
    │  │     └─ sessionRevision: 1               │
    │  │                                         │
    │  ├─ Collection: /audit (login logs)        │
    │  │  ├─ Document: { email, success, timestamp, reason }
    │  │  │                                       │
    │  └─ Security Rules:                         │
    │     ├─ PIN field NEVER readable by client  │
    │     ├─ Only Cloud Functions can write      │
    │     ├─ Users read own document only        │
    │     └─ Admin reads all documents           │
    │                                             │
    └────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │   FIREBASE AUTH (Enhanced, not changed)     │
    │                                             │
    │  Admin Google Sign-In:                     │
    │  ├─ Email verified by Google OAuth         │
    │  ├─ Firebase UID created                   │
    │  ├─ Linked to Firestore admin user doc     │
    │  └─ ID token includes admin claims         │
    │                                             │
    │  PIN-based Users:                           │
    │  ├─ NO Firebase Auth accounts created      │
    │  ├─ Only custom JWT issued by Cloud Fn     │
    │  └─ JWT validated via Firestore rules      │
    │                                             │
    └────────────────────────────────────────────┘
                 ▲
                 │
    ┌────────────┴────────────────────────────────┐
    │  localStorage (Session Cache Only)          │
    │  ✅ No user array stored anymore            │
    │  ✅ Only JWT token (looks like: header.payload.signature)
    │  ✅ Token auto-refreshes on API calls      │
    │                                             │
    │  Fields:                                    │
    │  ├─ wafi.session.token: JWT (expires 30d) │
    │  ├─ wafi.session.email: "student@ex.com" │
    │  ├─ wafi.session.expiresAt: timestamp     │
    │  └─ wafi.session.role: "student"          │
    │                                             │
    │  NOT stored (changed from old system):      │
    │  ├─ ❌ wafi.users-access (no user array)  │
    │  ├─ ❌ PIN (ever)                         │
    │  └─ ❌ User permissions (in token only)   │
    │                                             │
    └────────────────────────────────────────────┘
```

### 1.3 Architecture Decision: Cloud Functions vs Others

**Option A: Cloud Functions (RECOMMENDED) ✅**
- Node.js runtime with npm packages (bcryptjs, jsonwebtoken)
- Auto-scaling (0 to 1000s concurrent)
- Pay only for what you use ($0.40 per 1M calls)
- Built into Firebase ecosystem (no external setup)
- Easy integration with Firestore + Auth
- Deployment: `firebase deploy --only functions`

**Why NOT Option B (Traditional Backend)?**
- ❌ Requires maintaining server infrastructure
- ❌ VPS/AWS EC2 costs add up ($10-50/month)
- ❌ Need to manage scaling, load balancing, deployment
- ❌ Overkill for school app with 100 users
- ❌ More complex ops/monitoring

**Why NOT Option C (Firebase Realtime DB)?**
- ❌ No query language (WHERE conditions impossible)
- ❌ Can't do composite indexes efficiently
- ❌ Not suitable for user management (better for real-time data like dashboards)

### 1.4 Authentication Flow Summary

**Admin (Google Sign-In):**
```
Existing code works unchanged
└─ Firebase Auth handles Google OAuth
└─ Cloud Function links admin to Firestore user doc
└─ JWT token issued with admin claims
```

**Students/Parents/Teachers (PIN):**
```
User enters PIN via keypad
└─ Calls Cloud Function: POST /login { email, pin }
└─ Cloud Function verifies PIN via bcrypt.compare()
└─ Issues JWT token (30-day expiry)
└─ Frontend stores JWT in localStorage
```

**Session Management:**
```
On every API call:
1. Frontend includes JWT in Authorization header
2. Cloud Function verifies JWT signature
3. If valid: Request proceeds
4. If expired: Function issues new token (transparent refresh)
5. If revoked: Return 401, frontend redirects to login
```

---

## 2. Firestore Collection Structure (Detailed)

### 2.1 Collection: `/users` (User Data)

```
/users
├─ /user_email_student@example.com (document ID = email-derived)
│  ├─ id: "u-1723900800000"
│  ├─ email: "student@example.com"
│  ├─ name: "Ahmed Hassan"
│  ├─ role: "student"
│  ├─ status: "active"  // or "disabled"
│  ├─ permissions: [
│  │   "dashboard", "study", "homework", "ai-teacher",
│  │   "scan", "vocabulary", "pronunciation", "question-bank",
│  │   "practice", "games", "progress", "planner",
│  │   "notifications", "documents", "achievements"
│  │ ]
│  ├─ pin: "$2b$10$abcdefghijklmnopqrstuvwxyz..." (bcrypt hashed)
│  ├─ firebaseUid: null  (only for admins who use Google OAuth)
│  ├─ createdAt: 2024-08-17T10:30:00Z (server timestamp)
│  ├─ updatedAt: 2024-08-17T10:30:00Z (server timestamp)
│  ├─ deletedAt: null  (only set on soft delete)
│  └─ metadata: {
│      "lastLogin": 2024-08-16T15:45:00Z,
│      "lastLoginDevice": "chrome-windows",
│      "failedLoginAttempts": 0,
│      "lastFailedAttempt": null,
│      "lockedUntil": null,  // Locked if > now
│      "loginCount": 42,
│      "createdBy": "admin@example.com",
│      "sessionRevision": 1  // Increment on force logout
│    }
│
├─ /user_email_parent@example.com
│  ├─ (similar structure for parent)
│  ├─ linkedStudents: ["student@example.com"]  // optional reference
│
├─ /user_email_teacher@example.com
│  ├─ (similar structure for teacher)
│
└─ /user_email_admin@example.com
   ├─ email: "admin@example.com"
   ├─ role: "admin"
   ├─ firebaseUid: "kF3x9bXqWvU8xQz..."  ← Links to Firebase Auth UID
   ├─ pin: null  (admins don't use PIN)
   ├─ permissions: [all 19 features]
   └─ metadata: {
      "firebaseProvider": "google.com",
      "googleEmail": "admin@example.com",
      "lastLogin": timestamp
    }
```

### 2.2 Collection: `/audit` (Login & Permission Change Log)

```
/audit
├─ /login_2024081715450001
│  ├─ email: "student@example.com"
│  ├─ event: "login_success"  // or "login_failed", "login_locked"
│  ├─ reason: null  // or "invalid_pin", "rate_limited", "account_disabled"
│  ├─ timestamp: 2024-08-17T15:45:00Z (server)
│  ├─ device: "chrome-windows"
│  └─ metadata: {
│      "ipHash": "sha256(...)",  // Optional: track IP
│      "attemptsBeforeSuccess": 2  // Failed attempts in this session
│    }
│
├─ /permission_change_2024081716200001
│  ├─ email: "student@example.com"
│  ├─ event: "permission_change"
│  ├─ changedBy: "admin@example.com"
│  ├─ timestamp: 2024-08-17T16:20:00Z
│  ├─ changes: {
│      "from": ["dashboard", "study", "homework"],
│      "to": ["dashboard", "study", "homework", "ai-teacher"],
│      "added": ["ai-teacher"],
│      "removed": []
│    }
│  └─ reason: "User promoted to AI access"
│
└─ /status_change_2024081717000001
   ├─ email: "parent@example.com"
   ├─ event: "status_change"
   ├─ changedBy: "admin@example.com"
   ├─ timestamp: 2024-08-17T17:00:00Z
   ├─ changes: {
      "from": "active",
      "to": "disabled",
      "reason": "Parent requested account deactivation"
    }
```

### 2.3 Document ID Strategy

**Chosen:** `user_email_${email}` (email-derived)
- Example: `user_email_student@example.com`
- Pros:
  - Email is unique identifier (good for lookups)
  - Human-readable (easy to debug)
  - No need for separate email field index
  - Natural for WHERE queries: `email == "student@example.com"`
- Cons:
  - If email changes, doc ID doesn't (would need to migrate)

**Alternative (Not recommended for this app):** Auto-generated ID
```
/users/u_abc123xyz
├─ email: "student@example.com"
├─ name: "Ahmed"
...
```
- Pro: Flexible if email changes
- Con: Requires email field index; queries slower; less intuitive

### 2.4 PIN Storage Security (Critical)

**Current Problem (localStorage):**
```
pin: "1234" ← PLAINTEXT! Visible in DevTools, storage.json
Risk: Anyone with browser access can extract PIN
```

**Proposed Solution (Firestore):**
```
pin: "$2b$10$R9h7cIPz91XvL9bJJHl0WO0K7IxHDUqKLFIb2CesPTQcZTwSMPz8W"
     ↑ This is bcrypt hash (one-way function)
     
PIN VERIFICATION NEVER HAPPENS CLIENT-SIDE:

1. Client sends: { email: "student@example.com", pin: "1234" }
2. Cloud Function receives POST /login
3. Cloud Function retrieves document from Firestore
4. Cloud Function runs: bcrypt.compare("1234", "$2b$10$...")
   - Returns true/false (only server knows)
5. Cloud Function returns: { token: "jwt...", user: {...} }
   - PIN is NEVER sent back, NEVER visible to client
6. Client never sees the hash or plaintext PIN
```

**BCrypt Benefits:**
- ✅ One-way hashing (can't reverse)
- ✅ Salted (different hash for same PIN)
- ✅ Slow by design (~100ms per comparison—prevents brute-force)
- ✅ Industry standard for password hashing
- ✅ If database leaked, PINs are still safe

### 2.5 Indexes Required (Firestore)

```
Single-field indexes (auto-created):
  - /users , field: email (for email lookups)
  - /users , field: role (for role queries)
  - /users , field: status (for active/disabled queries)

Composite indexes (manual creation):
  - Collection: /users
    ├─ Field 1: role (Ascending)
    ├─ Field 2: status (Ascending)
    └─ Query: WHERE role="student" AND status="active"
    
  - Collection: /users
    ├─ Field 1: metadata.failedLoginAttempts (Ascending)
    ├─ Field 2: metadata.lastFailedAttempt (Descending)
    └─ Query: WHERE failedLoginAttempts >= 5 AND lastFailedAttempt > (now - 24h)
    
  - Collection: /audit
    ├─ Field 1: email (Ascending)
    ├─ Field 2: timestamp (Descending)
    └─ Query: WHERE email="student@ex.com" ORDER BY timestamp DESC

Firestore will auto-create these on first query; or create manually in console.
```

---

## 3. How Admin Will Create Student/Parent/Teacher Users

### 3.1 Current Flow (localStorage)

```
Admin fills form:
  name: string
  email: string
  role: "student"|"parent"|"teacher"
    ↓
Admin clicks "Send invite"
    ↓
1. Generate random 4-digit PIN
2. Create AccessUser object
3. Add to localStorage array
4. Save to localStorage
    ↓
Success → Admin must manually share PIN with user
```

### 3.2 Proposed Flow (Firebase)

```
Admin fills form in UI:
  name: string
  email: string
  role: "student"|"parent"|"teacher"
    ↓
Admin clicks "Send invite"
    ↓
FRONTEND calls: /api/admin/invite (or Cloud Function)
    ↓
BACKEND:
  1. Verify admin is logged in + has "admin" permission
  2. Generate random 4-digit PIN (e.g., "5729")
  3. Hash PIN with bcrypt → "$2b$10$xyz..."
  4. Check if user with email already exists in Firestore
     - If exists: return error "User already exists"
  5. Create Firestore document at /users/user_email_${email}:
     {
       id: "u-${Date.now()}",
       email: email,
       name: name,
       role: role,
       status: "active",
       permissions: rolePresets[role],
       pin: "$2b$10$xyz..." (hashed),
       firebaseUid: null,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
       deletedAt: null,
       metadata: { createdBy: admin@example.com, ... }
     }
  6. Return to frontend:
     {
       success: true,
       message: "User created successfully",
       pin: "5729", ← ONLY SHOWN ONCE, not persisted
       email: email
     }
    ↓
FRONTEND:
  1. Shows modal: "Share this PIN with the user: 5729"
  2. Auto-hides after 5 seconds or manual close
  3. PIN not saved anywhere; user must write it down
  4. localStorage still empty (no user array stored)
```

### 3.3 Key Differences

| Aspect | localStorage (Old) | Firebase (New) |
|--------|-------------------|----------------|
| **Storage** | Browser localStorage | Firestore (server) |
| **PIN sent to** | Client (plaintext in array) | Backend (hashed before storing) |
| **Persistence** | Lost if cache cleared | Durable across browsers |
| **Email verification** | None | Backend validates format |
| **Audit trail** | None | Firestore has createdBy, timestamp |
| **Multi-device** | Each device has own copy | All devices see same data |
| **Recovery** | No way to recover | Admin can reset PIN |

---

## 4. How PIN Login Will Work with Firebase

### 4.1 Current Flow (localStorage)

```
User selects role
    ↓
User sees list of all available users for that role
    ↓
User selects user email
    ↓
User enters PIN (4 digits)
    ↓
Client-side logic:
  Find user in localStorage array
  If user.pin === enteredPin → Success
    ↓
Success → localStorage.wafi.session.email = email
```

### 4.2 Proposed Flow (Firebase)

```
User visits /login page
    ↓
User selects role from 3-column grid
    ↓
FRONTEND: Calls /api/users/list?role=student
    ↓
BACKEND:
  1. Query Firestore: /users where role=student AND status≠disabled
  2. Return user list (WITHOUT PIN!)
     [
       { email: "student1@ex.com", name: "Ahmed" },
       { email: "student2@ex.com", name: "Fatima" }
     ]
    ↓
FRONTEND:
  1. Displays user list for selected role
  2. User clicks on their email
  3. Shows PIN input keypad (4 digits)
  4. User enters PIN
  5. Calls /api/auth/signin with: { email, pin, role }
    ↓
BACKEND (PIN Login):
  1. Query Firestore: /users/user_email_${email}
  2. If not found: return { ok: false, reason: "not-found" }
  3. If status=disabled: return { ok: false, reason: "disabled" }
  4. Compare: bcrypt.compare(inputPin, doc.pin)
     - If no match: return { ok: false, reason: "invalid-pin" }
     - If match:
       a. Create auth session (JWT or session cookie)
       b. Update metadata.lastLogin = serverTimestamp()
       c. Return session token + user data
    ↓
FRONTEND:
  1. Stores session token in localStorage: wafi.session.token
  2. Stores email: wafi.session.email
  3. Sets token expiration: wafi.session.expiresAt
  4. Fetches user permissions from token + Firestore
  5. Redirects to /dashboard
```

### 4.3 Key Improvements

| Aspect | Old (localStorage) | New (Firebase) |
|--------|-------------------|----------------|
| **PIN Exposure** | Visible in localStorage (plaintext) | Hashed on server, never sent to client |
| **Rate Limiting** | None (10k attempts possible) | Backend can enforce rate limiting |
| **Brute Force** | Easy (offline) | Harder (server-side logging) |
| **Validation** | Client-side only | Server-side validation mandatory |
| **Session** | No expiration | Tokens can expire |
| **Multi-device** | No sync | Sync via Firestore |
| **User List** | All users visible client-side | Backend controls visibility |
| **Audit Log** | No logging | Backend logs all attempts |

---

## 5. How Existing localStorage Users Will Be Migrated

### 5.1 Migration Strategy (Two Approaches)

#### Approach A: Gradual Background Migration (Recommended)

```
Phase 1: Dual Storage (Backward Compatible)
  - Both localStorage AND Firestore active
  - On login: Check localStorage first, then sync to Firestore
  - New invites go to Firestore immediately
  - Existing users still use localStorage path

Phase 2: Read from Firestore, Write to Both
  - All reads now from Firestore
  - Writes go to Firestore (and localStorage as fallback for old clients)
  - Session token issued by backend

Phase 3: Firestore Only
  - localStorage only holds session token, not user data
  - All user operations read/write Firestore
  - Old clients automatically migrated
```

#### Approach B: One-Time Migration (Faster but Riskier)

```
Export current users from localStorage
    ↓
Create backend migration script:
  For each user in localStorage:
    1. Generate new ID if needed
    2. Hash PIN if plaintext
    3. Create Firestore document
    4. Log migration success/failure
    ↓
Verify migration:
  - Compare counts (old vs new)
  - Spot-check some users
  - Test login with sample users
    ↓
Cutover:
  - Update frontend to use Firebase paths
  - Update admin to create users in Firestore
  - Provide rollback plan (re-enable localStorage if needed)
```

**Recommendation:** Use **Approach A** (Gradual). Safer because:
- Old code still works if Firestore is down
- Can catch issues before full migration
- Users don't get locked out during transition
- Easier rollback

### 5.2 Migration Execution Plan

```
Step 1: Export Existing Users
  Time: Admin dashboard → Export as CSV/JSON
  Data:
    id, email, name, role, status, permissions (as string)
    permissions NOT exported: PIN (can't read hashed value)
  Output: users-export-backup.json

Step 2: Prepare Migration Script
  Input: users-export-backup.json
  Process:
    1. Read each user
    2. Generate new PIN (since old not readable)
    3. Hash PIN with bcrypt
    4. Create Firestore document
    5. Log each creation with success/failure
  Output: migration-log.txt (audit trail)

Step 3: Run Migration (One-time)
  Node.js script or Firebase Cloud Function
  
  for each user in export:
    doc = {
      id: user.id || "u-${Date.now()}",
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status || "active",
      permissions: user.permissions,
      pin: bcrypt.hash(generateNewPIN()),
      firebaseUid: null,
      createdAt: new Date(user.createdAt),
      updatedAt: serverTimestamp(),
      deletedAt: null,
      metadata: {
        migratedFrom: "localStorage",
        migratedAt: serverTimestamp(),
        createdBy: "migration-script"
      }
    }
    
    await db.collection("users")
      .doc(`user_email_${user.email}`)
      .set(doc)

Step 4: Verification
  1. Query all Firestore users → count
  2. Compare with localStorage export → count
  3. Test login with sample users
  4. Admin panel shows all users accessible

Step 5: Cutover
  Update frontend code:
    - Stop writing to localStorage users array
    - Fetch user list from /api/users/list
    - PIN login uses /api/auth/signin
  Keep admin notify: "PINs have been reset. Check email for new PINs"
  (or: "Contact admin to reset PIN if forgotten")

Step 6: Cleanup
  After 1 week of successful operation:
    - Remove localStorage user array code
    - Remove fallback reads from localStorage
    - Archive migration logs
```

### 5.3 Data Mapping Table

```
localStorage User Object → Firestore Document
─────────────────────────────────────────────
{
  id: "u-1723900800000"      →  id: "u-1723900800000"
  email: "student@ex.com"     →  email: "student@ex.com"
  name: "Ahmed"               →  name: "Ahmed"
  role: "student"             →  role: "student"
  status: "active"            →  status: "active"
  permissions: [...]          →  permissions: [...]
  pin: "1234" (plaintext)     →  pin: "$2b$10$xyz..." (hashed)
  (not in firebase)           ←  firebaseUid: null
  (not in firebase)           ←  createdAt: timestamp
  (not in firebase)           ←  updatedAt: timestamp
  (not in firebase)           ←  deletedAt: null
  (not in firebase)           ←  metadata: {...}
}
```

### 5.4 PIN Reset During Migration

**Problem:** Old PINs stored as plaintext; can't migrate existing PINs securely.

**Solution:**
```
Option 1: Generate New PINs
  - Migration script generates new random PIN for each user
  - Admin must communicate new PIN to each user
  - Provide template email: "Your PIN has been reset to: 5729"
  - Pros: Secure (no plaintext exposure)
  - Cons: User inconvenience, potential confusion

Option 2: Hash Existing PINs (If Safe)
  - For users with 4-digit numeric PINs:
    pin_plaintext = "1234"
    pin_hashed = bcrypt.hash(pin_plaintext)
    → User can still login with original PIN
  - Pros: Users don't need new PIN
  - Cons: Reveals which users have weak PINs
  - Use only if current PINs are 4 digits only

Recommendation: Mix both
  - Try hashing existing 4-digit PINs
  - For admin users or invalid PINs: generate new ones
  - Notify admins of PIN changes
```

---

## 6. How Login Will Work on a Completely Fresh Browser

### 6.1 Scenario: User never used this app before

```
User visits: https://learning-buddy.com/login

FRONTEND LOAD:
  1. App initializes
  2. Checks localStorage for wafi.session.email → null (new browser)
  3. Checks localStorage for wafi.session.token → null
  4. Sets authReady = true
  5. currentUser = null
  6. RouteGuard sees: not authenticated
  7. Keeps user on /login page

USER ACTION:
  1. Sees 3 columns: Student, Parent, Teacher
  2. Clicks "Student"
  3. FRONTEND calls: GET /api/users/list?role=student
  4. BACKEND queries Firestore, returns list:
     [
       { email: "student1@ex.com", name: "Ahmed" },
       { email: "student2@ex.com", name: "Fatima" }
     ]
  5. UI displays list
  6. User clicks their email: "Ahmed (student1@ex.com)"
  7. Keypad appears for PIN input
  8. User enters: "5729"
  9. FRONTEND calls: POST /api/auth/signin
     {
       email: "student1@ex.com",
       pin: "5729",
       role: "student"
     }

BACKEND PIN VERIFICATION:
  1. Query Firestore: /users/user_email_student1@ex.com
  2. Get document:
     {
       id: "u-1723900800000",
       email: "student1@ex.com",
       name: "Ahmed Hassan",
       role: "student",
       status: "active",
       permissions: [...15 student features...],
       pin: "$2b$10$abcdefg..."  ← Hashed!
     }
  3. Compare: bcrypt.compare("5729", "$2b$10$abcdefg...")
  4. If match:
     a. Create JWT token:
        {
          sub: "student1@ex.com",
          email: "student1@ex.com",
          role: "student",
          permissions: [...],
          iat: now,
          exp: now + 30 days
        }
     b. Sign with backend secret key
     c. Return:
        {
          token: "eyJhbGc...",
          user: {
            email: "student1@ex.com",
            name: "Ahmed",
            role: "student",
            permissions: [...]
          },
          expiresIn: 2592000 (30 days in seconds)
        }
  5. If no match: return { error: "Invalid PIN" }

FRONTEND SESSION SETUP:
  1. Receives token + user data
  2. Sets localStorage:
     - wafi.session.email: "student1@ex.com"
     - wafi.session.token: "eyJhbGc..."
     - wafi.session.expiresAt: (now + 30 days in ms)
  3. Sets React state: email = "student1@ex.com"
  4. useEffect runs → currentUser = user object from token
  5. RouteGuard checks: user exists + has access → Allow
  6. Redirects to /dashboard
  7. Dashboard loads student-specific features

USER NAVIGATES AWAY & RETURNS LATER:
  1. Closes browser tab
  2. Returns next day, visits https://learning-buddy.com
  3. App loads, checks localStorage:
     - wafi.session.token exists → Parse JWT
     - wafi.session.email: "student1@ex.com"
     - wafi.session.expiresAt: still valid (< 30 days old)
  4. useEffect reads token, sets currentUser
  5. RouteGuard allows access
  6. User back on /dashboard (no re-login needed!)

MULTI-DEVICE SCENARIO:
  1. Student logs in on Laptop browser → token in laptop localStorage
  2. Same student logs in on Phone browser → token in phone localStorage
  3. Each device has independent session
  4. User can be logged in on both simultaneously
  5. If admin disables student on Server:
     - Next API call from either device fails (token validation fails)
     - Both devices forced to re-login
```

### 6.2 What's NOT in localStorage Anymore

```
OLD (localStorage-based):
  wafi.users-access: [
    { id, email, name, role, status, permissions, pin },
    { id, email, name, role, status, permissions, pin },
    ...all users...
  ]

NEW (Firebase-based):
  wafi.users-access: NOT SET (empty or removed)
  
  Instead:
  wafi.session.token: JWT token (session only)
  wafi.session.email: Current user email (for reference)
```

**Benefits:**
- ✅ Users array never exposed to client
- ✅ PIN never stored on client
- ✅ No data loss on browser clear (easily re-login)
- ✅ Multi-device sync works (server has source of truth)

---

## 7. How Logout/Login Will Work Across Devices

### 7.1 Logout Flow

**Current (localStorage):**
```
User clicks "Logout"
  ↓
Frontend:
  1. Remove localStorage.wafi.session.email
  2. Set email state = null
  3. currentUser = null
  ↓
RouteGuard sees no user → Redirect to /login
```

**Problem:** localStorage cleared on one device, but other devices still logged in (no sync).

### 7.2 Proposed Logout Flow (Firebase)

```
User clicks "Logout" on Device A (Laptop):
  ↓
FRONTEND:
  1. Remove localStorage.wafi.session.token
  2. Remove localStorage.wafi.session.email
  3. Remove localStorage.wafi.session.expiresAt
  4. Call: POST /api/auth/logout
     Body: { token: previous_token, deviceId?: optional }

BACKEND:
  1. Validate token is real
  2. Optional: Mark token as revoked in Redis/list
     (prevents token reuse if stolen)
  3. Update Firestore metadata:
     users/${docId}/metadata.lastLogout = serverTimestamp()
  4. Return: { success: true }

FRONTEND:
  1. Sets currentUser = null
  2. Redirects to /login page
  3. Other devices (phone, tablet) still logged in
     (They have their own separate tokens)
```

### 7.3 Multi-Device Logout Scenario

```
Scenario: User wants to logout from ALL devices at once

Option A: "Logout from All Devices" Button (Recommended)
  1. User clicks "Logout from All Devices"
  2. FRONTEND calls: POST /api/auth/logout-all
     Body: { email: "student1@ex.com" }
  3. BACKEND:
     a. Query Firestore: /users/user_email_student1@ex.com
     b. Get all active sessions/tokens for this user
     c. Revoke all tokens (mark in Redis as invalid)
     d. Update metadata.allSessionsRevoked = true
     e. Next request from ANY device with old token → 401 Unauthorized
  4. FRONTEND detects 401 → Clear localStorage → Redirect to /login
  5. ALL devices see login page on next action/refresh

Option B: Force Logout via Admin
  1. Admin goes to: /admin/users/student1@ex.com
  2. Admin clicks: "Force Logout" button
  3. FRONTEND calls: POST /api/admin/users/student1@ex.com/logout
  4. BACKEND:
     a. Verify admin permission
     b. Mark user.metadata.forcedLogoutAt = now
     c. Invalidate all tokens for this user
  5. All user's devices → 401 → Logout
```

### 7.4 Token Management

**Token Expiration Strategy:**
```
Token lifetime: 30 days (long for convenience)
Refresh logic:
  - On each successful API call: Check token expiry
  - If expires in < 7 days: Issue new token
  - Return new token in response header
  - Frontend auto-updates localStorage with new token
  
This provides:
  ✅ Long session (30 days)
  ✅ No re-login interruptions
  ✅ Automatic refresh (transparent to user)
  ✅ Invalidation works (new token not issued if user disabled)
```

### 7.5 Across-Device Sync Scenarios

| Scenario | Old (localStorage) | New (Firebase) |
|----------|-------------------|----------------|
| **User disables** on Admin panel | Only affects next login; other devices still active | Invalidates all tokens; all devices forced to re-login next request |
| **User resets PIN** on Admin panel | Old device can still login with old PIN | Old PIN hashed in Firestore; login fails next attempt |
| **User changes role** on Admin panel | No sync to other devices | All devices see new role on next API call |
| **User logs out on Device A** | Device B still logged in (isolated) | Device B still logged in (isolated) |
| **User logs out on ALL devices** | Not possible with localStorage alone | Possible via /api/auth/logout-all |

---

## 8. How Permissions and Roles Will Be Persisted

### 8.1 Current Flow (localStorage)

```
Admin creates user with role="student"
  ↓
Frontend auto-assigns permissions: rolePresets["student"] = [15 features]
  ↓
Stored in localStorage: user.permissions = [...]
  ↓
On every page: can(feature) checks user.permissions.includes(feature)
```

**Problems:**
- ✅ Works
- ⚠️ Admin can edit permissions manually; no validation
- ⚠️ Custom permissions lost if role changed
- ⚠️ Permissions visible in localStorage (client-side)

### 8.2 Proposed Flow (Firebase)

```
PERMISSION PRESET (Server-side Constant):
  
const rolePermissionMap = {
  student: [
    "dashboard", "study", "homework", "ai-teacher",
    "scan", "vocabulary", "pronunciation", "question-bank",
    "practice", "games", "progress", "planner",
    "notifications", "documents", "achievements"
  ],
  parent: [
    "dashboard", "parent-mode", "progress", "homework",
    "planner", "notifications", "documents", "achievements",
    "ai-memory", "school-profile"
  ],
  teacher: [
    "dashboard", "study", "homework", "question-bank",
    "practice", "progress", "planner", "notifications",
    "documents", "school-profile"
  ],
  admin: [all 19 features]
};

CREATING USER (Admin Dashboard):
  1. Admin selects role: "student"
  2. FRONTEND submits: POST /api/admin/users
     {
       name: "Ahmed",
       email: "student@ex.com",
       role: "student"
     }
  3. BACKEND:
     a. Verify admin permission
     b. permissions = rolePermissionMap["student"]
     c. Create Firestore doc:
        {
          role: "student",
          permissions: [15 features],
          status: "active",
          ...
        }
  4. Returns to frontend with permissions array

CHANGING USER ROLE (Admin Edit Page):
  1. Admin changes role: "student" → "teacher"
  2. FRONTEND submits: PUT /api/admin/users/student@ex.com
     {
       role: "teacher"
     }
  3. BACKEND:
     a. Verify admin permission
     b. Fetch current user from Firestore
     c. New permissions = rolePermissionMap["teacher"]
     d. Update Firestore:
        {
          role: "teacher",
          permissions: [10 features for teacher],
          updatedAt: serverTimestamp()
        }
     e. Any custom permissions overridden (by design)
  4. Returns updated user

UPDATING SPECIFIC PERMISSION (Advanced):
  1. Admin manually checks/unchecks feature checkbox
  2. FRONTEND submits: PUT /api/admin/users/student@ex.com/permissions
     {
       permissions: ["dashboard", "study", ... custom array]
     }
  3. BACKEND:
     a. Validate each permission against FeatureKey enum
     b. Check if valid for user's role (optional soft check)
     c. Update Firestore.permissions = custom array
     d. Log update: updatedBy = admin@ex.com
  4. Changes persist to Firestore

PERMISSION CHECK IN APP:
  1. User visits /homework route
  2. RouteGuard needs to check: does user have "homework" permission
  3. Frontend has: currentUser.permissions = [array from Firestore]
  4. can("homework") → return permissions.includes("homework")
  5. Access granted/denied

PERMISSION SYNC ACROSS DEVICES:
  1. Admin disables "ai-teacher" feature for a student
  2. Student's document in Firestore updated
  3. Student Device A (Laptop):
     - Makes any API call
     - Backend includes permissions in response
     - Frontend updates currentUser.permissions
     - Next route check sees "ai-teacher" removed
     - If currently on /ai-teacher: RouteGuard denies access
  4. Student Device B (Phone):
     - Same process on next network call
     - Both devices sync permissions automatically
```

### 8.3 Permission Data Model in Firestore

```
Document: /users/user_email_student@ex.com

{
  ...other fields...
  
  role: "student",
  
  permissions: [
    "dashboard",
    "study",
    "homework",
    "ai-teacher",
    "scan",
    "vocabulary",
    "pronunciation",
    "question-bank",
    "practice",
    "games",
    "progress",
    "planner",
    "notifications",
    "documents",
    "achievements"
  ],
  
  permissionHistory: [
    {
      changedAt: timestamp,
      changedBy: "admin@ex.com",
      action: "role_change",
      from: ["..."],
      to: ["..."],
      reason: "Promoted to teacher role"
    },
    {
      changedAt: timestamp,
      changedBy: "admin@ex.com",
      action: "custom_update",
      changed: ["ai-teacher"],
      reason: "Removed ai-teacher access"
    }
  ]
}
```

**Benefits:**
- ✅ Audit trail of permission changes
- ✅ Can revert to previous permissions if needed
- ✅ Admins can see who made changes when

### 8.4 Permission Validation Rules

```
Firestore Security Rule (pseudo-code):

allow read of /users/{docId}:
  if isAuthenticatedUser() and (
    request.auth.email == docId.email OR
    request.auth.role == "admin"
  )

allow update of /users/{docId}/permissions:
  if isAdmin() and
  validatePermissions(request.resource.data.permissions) and
  // Ensure permissions are valid FeatureKey values
  request.resource.data.permissions.every(p => isValidFeature(p))
```

---

## 9. How Existing Admin Google Login Will Remain Intact

### 9.1 Current Admin Flow (No Changes Needed)

```
Current (Already Works):
  1. Admin clicks lock icon
  2. Firebase Google OAuth popup
  3. Email verified: must be VITE_FIREBASE_ADMIN_EMAIL
  4. Firebase auth success
  5. Admin user created in localStorage
  6. Session email set to admin email
  7. Dashboard shows admin panel
```

### 9.2 Proposed Admin Flow (Preserve Existing, Enhance)

```
BACKWARD COMPATIBLE APPROACH:

Phase 1: Dual Path (No Code Changes Needed Yet)
  - Admin signs in via Google OAuth (existing code)
  - Firebase auth creates UID (existing)
  - After Firebase auth success:
    OPTION A (Current path): Create user in localStorage ← Still works
    OPTION B (New path): Also write to Firestore ← Added for redundancy

Phase 2: Migrate to Firestore (When Ready)
  - Admin signs in via Google OAuth (same)
  - Firebase auth creates UID (same)
  - On auth success:
    1. Query Firestore: /users/user_email_${email}
    2. If not exists: Create admin user in Firestore with:
       {
         email: "admin@ex.com",
         role: "admin",
         firebaseUid: auth.uid (link to Firebase auth UID),
         permissions: [all 19 features],
         pin: null (admins don't use PIN),
         status: "active",
         createdAt: now,
         ...
       }
    3. If exists: Update lastLogin metadata
    4. Return token to frontend
```

### 9.3 Admin User Document in Firestore

```
Path: /users/user_email_admin@example.com

{
  id: "u-firebase-admin-kF3x9...",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  status: "active",
  
  // Admin-specific fields
  firebaseUid: "kF3x9bXqWvU8xQz...",    ← Links to Firebase Auth UID
  pin: null,                             ← Admins don't use PIN
  
  permissions: [
    "dashboard", "study", "homework", "ai-teacher",
    "scan", "vocabulary", "pronunciation", "question-bank",
    "practice", "games", "progress", "planner",
    "notifications", "documents", "achievements",
    "ai-memory", "school-profile", "admin"
  ],
  
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
  
  metadata: {
    lastLogin: timestamp,
    lastLoginDevice: "chrome-macos",
    firebaseProvider: "google.com",
    googleEmail: "admin@example.com",
    createdBy: "firebase-oauth-flow"
  }
}
```

### 9.4 Admin Login Flow (Detailed)

```
GOOGLE SIGN-IN (Unchanged):
  1. Admin sees lock icon on /login
  2. Clicks lock → Firebase Google OAuth popup
  3. Authenticates with Google account
  4. Google redirects back with auth code
  5. Firebase exchanges code for user session
  6. onAuthStateChanged listener fires with:
     {
       uid: "kF3x9bXqWvU8xQz...",
       email: "admin@example.com",
       displayName: "Admin User",
       ...
     }

BACKEND PROCESSING (New):
  7. Cloud Function triggered: onAdminAuth
  8. Verify email == VITE_FIREBASE_ADMIN_EMAIL
  9. If mismatch: Sign out user, return error
  10. If match:
      a. Query Firestore: /users/user_email_admin@example.com
      b. If not exists:
         - Create new admin user in Firestore
         - Set firebaseUid = auth.uid
         - Set role = "admin"
         - Set permissions = all 19
      c. If exists:
         - Update metadata.lastLogin = now
         - Update metadata.lastLoginDevice = device info
      d. Create JWT session token:
         {
           sub: "admin@example.com",
           role: "admin",
           firebaseUid: "kF3x9...",
           permissions: [...19...],
           iat: now,
           exp: now + 30 days
         }
      e. Return token to frontend

FRONTEND SETUP (Modified):
  11. Receives token from backend
  12. Stores in localStorage:
      - wafi.session.token: token
      - wafi.session.email: "admin@example.com"
      - wafi.session.expiresAt: (now + 30 days)
  13. Sets currentUser with admin role/permissions
  14. RouteGuard allows /admin access
  15. Redirects to /admin dashboard
```

### 9.5 Admin Sign-Out (Unchanged)

```
Admin clicks "Sign Out"
  ↓
FRONTEND:
  1. Clear localStorage session tokens
  2. Call: firebase.auth().signOut() ← Clears Firebase auth
  3. Call: POST /api/auth/logout ← Backend cleanup
  ↓
BACKEND:
  1. Invalidate session token
  2. Update metadata.lastLogout = now
  ↓
FRONTEND:
  1. Redirect to /login
  2. Admin sees login page again
```

### 9.6 What Stays the Same for Admin

| Aspect | Current | Proposed | Change? |
|--------|---------|----------|---------|
| **Google OAuth flow** | Popup auth | Popup auth | ❌ No |
| **Email verification** | VITE_FIREBASE_ADMIN_EMAIL check | Same check | ❌ No |
| **Firebase UID** | Created but unused | Stored in Firestore.firebaseUid | ✅ Used |
| **Admin access** | via localStorage user.role="admin" | via Firestore doc.role="admin" | ✅ Enhanced |
| **Sign-out process** | firebase.auth().signOut() | Same + backend cleanup | ✅ Enhanced |
| **Admin dashboard** | Works if logged in | Works if logged in | ❌ No |

---

## 10. Security & Firestore Rules Changes Required

### 10.1 Current State
- Firebase has basic auth setup
- No custom Firestore security rules
- All data access is client-side

### 10.2 Required Firestore Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // ========== USERS COLLECTION ==========
    match /users/{document=**} {
      
      // RULE 1: Admin can read all users
      allow read: if isAdmin();
      
      // RULE 2: Users can read their own document
      allow read: if 
        request.auth != null && 
        request.auth.email == resource.data.email;
      
      // RULE 3: Only backend (Cloud Functions) can write
      //         (Not direct client writes)
      allow write: if false;  // ← All writes go through backend only
      
      // RULE 4: PIN field is never readable by client
      allow read: if 
        request.auth != null &&
        !("pin" in resource.data);  // ← Don't return PIN
      
      // RULE 5: Email field is indexed and queryable
      allow list: if 
        request.auth != null &&
        (
          isAdmin() ||
          (
            request.query.where[0].fieldPath == "email" &&
            request.query.where[0].value == request.auth.email
          )
        );
      
      // RULE 6: Metadata field (read-only for users)
      match /metadata/{document} {
        allow read: if 
          parent_user.role == "admin" ||
          parent_user.email == request.auth.email;
        
        allow write: if false;  // ← Backend only
      }
    }
    
    // ========== HELPER FUNCTIONS ==========
    function isAdmin() {
      return 
        request.auth != null &&
        get(/databases/$(database)/documents/users/user_email_$(request.auth.email))
          .data.role == "admin";
    }
    
    function parent_user() {
      return get(/databases/$(database)/documents/users/$(resource.id)).data;
    }
  }
}
```

### 10.3 Security Principles

| Principle | Implementation |
|-----------|-----------------|
| **PIN Never to Client** | Firestore rule excludes pin field from reads |
| **User Auth** | Must have valid Firebase/JWT token + email match |
| **Admin-Only Writes** | Backend Cloud Functions have service account credentials |
| **No Direct Client Writes** | `allow write: if false;` forces backend proxy |
| **Email-Based Access** | Users can only read/query by their own email |
| **Audit Trail** | All changes logged with admin email + timestamp |
| **Data Minimization** | Only necessary fields returned to client |

### 10.4 Backend API Endpoints (New)

```
These endpoints MUST validate token, verify admin, and do server-side auth:

POST /api/auth/signin
  Input: { email, pin, role }
  Logic:
    1. Query Firestore for user
    2. bcrypt.compare PIN
    3. Issue JWT token
  Returns: { token, user, expiresIn }

POST /api/auth/logout
  Input: { token }
  Logic:
    1. Validate token
    2. Mark as revoked (optional)
  Returns: { success }

POST /api/auth/logout-all
  Input: { email }
  Logic:
    1. Verify current user is the email owner or admin
    2. Revoke all sessions for user
  Returns: { success }

GET /api/users/list?role=student
  Input: query params (role, limit, offset)
  Logic:
    1. Query Firestore (without PIN)
    2. Filter visible users
  Returns: [ { email, name, createdAt }, ... ]

POST /api/admin/users
  Input: { name, email, role }
  Logic:
    1. Verify admin permission
    2. Check email uniqueness
    3. Generate PIN, hash it
    4. Create Firestore document
  Returns: { user, pin (one-time display) }

PUT /api/admin/users/{email}
  Input: { name?, role?, status? }
  Logic:
    1. Verify admin permission
    2. Update Firestore (with audit)
    3. If role changed: reset permissions
  Returns: { user }

POST /api/admin/users/{email}/reset-pin
  Input: {}
  Logic:
    1. Verify admin permission
    2. Generate new PIN
    3. Hash and store in Firestore
    4. Log action
  Returns: { pin (one-time), user }

DELETE /api/admin/users/{email}
  Input: {}
  Logic:
    1. Verify admin permission
    2. Soft delete (set deletedAt timestamp)
    3. Optionally: hard delete after 30 days
  Returns: { success }

POST /api/admin/users/{email}/logout
  Input: {}
  Logic:
    1. Verify admin permission
    2. Revoke all sessions for user
    3. Set forcedLogoutAt metadata
  Returns: { success }
```

### 10.5 PIN Hashing Strategy

```
NODE.JS BCRYPT HASHING (on Backend):

const bcrypt = require("bcrypt");

// When creating user or resetting PIN:
const plainPin = "5729";
const saltRounds = 10;  // High cost to slow down brute-force
const hashedPin = await bcrypt.hash(plainPin, saltRounds);
// Store hashedPin in Firestore (not plainPin)

// When user tries to login:
const inputPin = "5729";
const isMatch = await bcrypt.compare(inputPin, storedHashedPin);
// Only server knows if match; never send to client
```

**Why bcrypt?**
- ✅ Salted hash (prevents rainbow tables)
- ✅ Slow by design (expensive to brute-force)
- ✅ Industry standard for password hashing
- ✅ Can increase cost factor if security needs rise
- ✅ Deterministic (same input = same hash for verification)

### 10.6 Session Token (JWT) Strategy

```
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "sub": "student1@example.com",
  "email": "student1@example.com",
  "role": "student",
  "permissions": [
    "dashboard", "study", "homework",
    ...14 more...
  ],
  "iat": 1723900800,           // Issued at
  "exp": 1726492800,           // Expires in 30 days
  "jti": "xyz789unique",       // Unique token ID (for revocation list)
  "device": "chrome-windows",  // Optional: track device
  "ipHash": "sha256(IP)"       // Optional: detect unusual login
}

Signature: HMAC-SHA256(
  header + payload,
  secret_key_from_env
)

Validation on EVERY API call:
  1. Check signature (ensures token not tampered)
  2. Check expiration (exp > now)
  3. Check jti not in revocation list (if logout-all called)
  4. Check user.status != "disabled" in Firestore
```

### 10.7 Rate Limiting (PIN Attempts)

```
PSEUDO-CODE (Node.js + Redis):

// After 5 failed attempts within 15 minutes:
// Lock account for 30 minutes

const attempts = await redis.get(`pin-attempts:${email}`);
if (attempts >= 5) {
  const lockTime = await redis.ttl(`pin-lock:${email}`);
  if (lockTime > 0) {
    return { error: "Too many attempts. Try again in 30 min." };
  }
}

// On failed PIN:
await redis.incr(`pin-attempts:${email}`);
await redis.expire(`pin-attempts:${email}`, 900);  // 15 min

// After 5 attempts:
if (attempts >= 5) {
  await redis.set(`pin-lock:${email}`, true, "EX", 1800);  // 30 min
  // Also notify admin: user_email locked
}

// On successful login:
await redis.del(`pin-attempts:${email}`);
```

**Benefits:**
- ✅ Prevents brute-force attacks
- ✅ Temporary lockout (not permanent)
- ✅ Admin can override if user locked accidentally
- ✅ Logs all attempts for audit

---

## Summary Table: All 10 Requirements

| # | Requirement | Current (localStorage) | Proposed (Firebase) | Status |
|---|-------------|----------------------|-------------------|--------|
| 1 | **Firebase Auth Arch** | Admin OAuth only | Admin OAuth + PIN via backend | ✅ Enhanced |
| 2 | **Firestore Collection** | N/A | /users with doc ID = email | ✅ New |
| 3 | **Admin Create Users** | localStorage direct | Backend API + Firestore write | ✅ Improved |
| 4 | **PIN Login** | Client-side comparison | Backend hashed verification | ✅ Secure |
| 5 | **Migrate Existing** | N/A | One-time script + gradual dual-write | ✅ Safe |
| 6 | **Fresh Browser** | Empty, must be invited | Query Firestore, enter PIN, get token | ✅ Seamless |
| 7 | **Logout/Multi-Device** | localStorage only | Token-based + revocation list | ✅ Enhanced |
| 8 | **Permissions/Roles** | localStorage array | Firestore + audit log | ✅ Durable |
| 9 | **Admin Google Login** | Works now | Works + Firestore sync | ✅ Preserved |
| 10 | **Security/Rules** | None | Firestore rules + backend validation | ✅ Enforced |

---

## Implementation Phases (NO CODE YET)

### Phase 1: Backend Setup (1-2 weeks)
- [ ] Create Firestore users collection
- [ ] Write backend API endpoints (/api/auth/signin, /api/admin/users, etc.)
- [ ] Implement bcrypt PIN hashing
- [ ] Implement JWT token generation
- [ ] Set up rate limiting (Redis)
- [ ] Write Firestore security rules
- [ ] Create migration script for existing users

### Phase 2: Dual-Write Transition (1 week)
- [ ] Update frontend signIn to call backend API (returns token)
- [ ] Update frontend to store token instead of user array in localStorage
- [ ] Update access-store to fetch currentUser from token
- [ ] Keep localStorage fallback for backward compatibility
- [ ] Test all 4 auth flows on staging

### Phase 3: Full Migration (1 week)
- [ ] Run migration script on production (existing users → Firestore)
- [ ] All new invites go to Firestore only
- [ ] Monitor for errors/issues
- [ ] Enable Firestore rules (no direct client writes)

### Phase 4: Cleanup (1 week)
- [ ] Remove localStorage user array code
- [ ] Remove fallback reads to localStorage
- [ ] Archive old localStorage data
- [ ] Full end-to-end testing all devices

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Existing users can't login after migration** | 🔴 Critical | Run migration script first, test with sample users, have rollback plan |
| **PIN brute-force attacks** | 🔴 Critical | Rate limiting + bcrypt hashing + timeout |
| **Firebase rules allow client writes** | 🟡 High | Deny all writes (allow write: if false), force backend proxy |
| **Token theft via XSS** | 🟡 High | Store token in sessionStorage if possible, implement CSP headers |
| **Cross-site forgery (CSRF)** | 🟡 High | Use SameSite cookie + CSRF token validation |
| **Data loss during migration** | 🟡 High | Backup users export first, verify counts before cutover |
| **Downtime during cutover** | 🟡 Medium | Use gradual dual-write (no sudden cutover) |
| **Admin can't access during migration** | 🟢 Low | Migrate admin users first, test admin access |

---

## Next Steps (After Approval)

1. ✅ You review this architecture
2. ✅ You approve or request changes
3. ⏳ I create implementation plan (detailed step-by-step code changes)
4. ⏳ I implement Phase 1: Backend setup
5. ⏳ I implement Phase 2: Dual-write transition
6. ⏳ I implement Phase 3: Migration + testing
7. ⏳ I implement Phase 4: Cleanup

**Currently:** Planning phase complete. Awaiting your feedback.

---

## Questions for You

1. **Backend Framework:** What backend are you using? (Node.js/Express, Python/Django, other?)
2. **Rate Limiting:** Redis available? Or use Firestore counters?
3. **Email Sending:** Should the system send actual PIN emails during invite, or stay manual?
4. **Token Refresh:** Should tokens auto-refresh on every API call, or only on demand?
5. **Token Storage:** localStorage (current), sessionStorage, or IndexedDB?
6. **Admin Access:** Should all admins be created via Google OAuth, or some via PIN too?
7. **Data Privacy:** Any GDPR/COPPA compliance requirements for this migration?
8. **Timeline:** When do you want to start implementation?
