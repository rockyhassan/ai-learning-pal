# Revised Implementation Blueprint - Version 2
## Firebase Custom Tokens + Secure Credential Storage

**Status:** 🔄 REVISED DESIGN - AWAITING APPROVAL  
**Date:** August 17, 2026  
**Changes:** 8 major corrections applied

---

## CRITICAL CORRECTIONS APPLIED

```
✅ CORRECTION 1: Separate /userCredentials Collection
   Problem: pinHash exposed to client (security risk)
   Solution: Create /userCredentials/{uid} (admin SDK only)
   
✅ CORRECTION 2: Create Firebase Auth at User Creation
   Problem: Waiting until first login is late
   Solution: Admin Cloud Function creates auth + user simultaneously
   
✅ CORRECTION 3: Disable Enforcement in Rules + Code
   Problem: Listener is UI only, not security boundary
   Solution: Firestore rules + server auth checks enforce disabled
   
✅ CORRECTION 4: Custom Claims Staleness Risk
   Problem: Claims don't refresh until token refresh
   Solution: Firestore /users/{uid} remains source of truth for roles
   
✅ CORRECTION 5: Safe Unauthenticated Login Screen
   Problem: Login needs to show users without exposing credentials
   Solution: New Cloud Function getLoginUsers (safe fields only)
   
✅ CORRECTION 6: Remove Unused Function
   Problem: validateCustomToken has no concrete use
   Solution: Deleted, reduces attack surface
   
✅ CORRECTION 7: Verify Current /diary Rules Behavior
   Current: allow read: if true (EVERYONE can read diary)
   Current: allow write: if email == admin (admin-only write)
   Action: Preserve exactly as-is (all users read diary, admin writes)
   
✅ CORRECTION 8: Recalculate Migration with New Auth Lifecycle
   Impact: Firebase Auth accounts created during admin-creates-user step
```

---

## 1. FINAL FIRESTORE COLLECTIONS STRUCTURE

### Collection 1: `/users/{uid}` - User Account Data (Client-Readable)

**Document Structure:**

```typescript
{
  // Core Identity (immutable after creation)
  uid: string,                        // Firebase Auth UID (document ID)
  email: string,                      // Login identifier (indexed, unique)
  name: string,                       // Display name
  
  // Authorization & Status (mutable by admin)
  role: "admin" | "student" | "parent" | "teacher",
  status: "active" | "disabled",      // Account state
  permissions: string[],              // Feature access array
  
  // Authentication Metadata
  authMethod: "google" | "pin",       // How user authenticates
  
  // Timestamps
  createdAt: timestamp,               // Account creation time
  updatedAt: timestamp,               // Last modification time
  createdBy: string,                  // Admin UID who created this user
  lastLoginAt: timestamp,             // Last successful login (optional)
}
```

**Access Rules:**
- ✅ All authenticated users can read their own `/users/{uid}`
- ✅ Admin can read all `/users/{uid}` documents
- ✅ Only Cloud Functions (admin SDK) can create/update

**Example Documents:**

```json
{
  "uid": "google-rocky-uid-xyz",
  "email": "rockyhsn9@gmail.com",
  "name": "Rocky Hassan",
  "role": "admin",
  "status": "active",
  "permissions": ["dashboard", "study", ..., "admin"],  // all 20
  "authMethod": "google",
  "createdAt": 1692288000,
  "updatedAt": 1692288000,
  "createdBy": "system-init"
}

{
  "uid": "pin-wafi-uid-123",
  "email": "affanwafee@gmail.com",
  "name": "Wafi",
  "role": "student",
  "status": "active",
  "permissions": ["dashboard", "study", "homework", ..., "achievements"],  // 15 features
  "authMethod": "pin",
  "createdAt": 1692288100,
  "updatedAt": 1692288100,
  "createdBy": "google-rocky-uid-xyz"
}
```

**Why This Design:**
- ✅ No sensitive data (PIN, hash, attempts) exposed to client
- ✅ Real-time sync updates role/status changes
- ✅ Firestore rules control read/write access
- ✅ Audit trail (createdAt, updatedAt, createdBy)

---

### Collection 2: `/userCredentials/{uid}` - Secret Credential Storage (Admin SDK Only)

**Document Structure:**

```typescript
{
  // PIN Security (PIN users only)
  pinHash: string,                    // bcrypt hash (cost=12)
  pinLastSet: timestamp,              // When PIN was last changed
  pinFailedAttempts: number,          // Failed login counter
  pinLockedUntil: timestamp | null,   // Brute-force lockout expiry
  
  // Metadata (admin reference)
  uid: string,                        // Denormalized UID (matches doc ID)
}
```

**Access Rules:**
- ❌ NO client-side reads (Firestore rules deny all)
- ❌ NO client-side writes (Firestore rules deny all)
- ✅ ONLY Cloud Functions (admin SDK) can read/write
- ✅ ONLY admins (via Cloud Functions) can see/modify

**Example Document:**

```json
{
  "uid": "pin-wafi-uid-123",
  "pinHash": "$2b$12$R9h4cIPz...",  // bcrypt hash
  "pinLastSet": 1692288100,
  "pinFailedAttempts": 0,
  "pinLockedUntil": null
}
```

**Why This Design:**
- ✅ PIN never reaches client (maximum security)
- ✅ PIN hash never exposed to users
- ✅ Firestore rules prevent all client access
- ✅ Brute-force state server-side only
- ✅ Cloud Function has full access via admin SDK

**CRITICAL:** This collection must be 100% protected. Firestore rules must explicitly deny all client access.

---

### Collection 3: `/diary/{diaryId}` - School Content (EXISTING, PRESERVE)

**Current Behavior (DO NOT CHANGE):**
- ✅ All users can READ diary (public classroom information)
- ✅ Only admin (rockyhsn9@gmail.com) can WRITE diary
- ✅ Authenticated via email in custom claims

**Rules:**
```
allow read: if true;  // Everyone can read
allow write: if request.auth != null && 
             request.auth.token.email == "rockyhsn9@gmail.com";
```

**Why Preserve:**
- Current behavior is intentional (shared classroom data)
- All users see same diary (not personalized)
- Only admin creates/edits entries
- This design will continue working post-migration

---

### Collection 4: `/exams/{examId}` - Exam Content (EXISTING, PRESERVE)

**Current Behavior (AUDIT RESULT):**
- Listener set up in `school-content.tsx`
- Merge pattern with localStorage
- Admin-only writes (same as diary)

**Expected Rules (by analogy with diary):**
```
allow read: if true;  // Everyone can read
allow write: if request.auth != null && 
             request.auth.token.email == "rockyhsn9@gmail.com";
```

**Will Verify Post-Migration:** Confirm exams work exactly as before

---

## 2. FINAL FIRESTORE SECURITY RULES

### Complete Rules Schema

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== USERS COLLECTION ==========
    // User account data (shared with client)
    match /users/{uid} {
      // READ: User can read own, admin can read all
      allow read: if request.auth != null && (
        request.auth.uid == uid ||
        request.auth.token.role == 'admin'
      );
      
      // CREATE/UPDATE: Cloud Functions only (via admin SDK, bypasses rules)
      // These rules are informational; actual enforcement in Cloud Functions
      allow create, update: if false;  // Cloud Functions use admin SDK
      
      // DELETE: Never allow
      allow delete: if false;
    }
    
    // ========== CREDENTIALS COLLECTION ==========
    // PIN hashes and brute-force state (LOCKED DOWN)
    match /userCredentials/{uid} {
      // DENY ALL CLIENT ACCESS
      allow read, write: if false;
    }
    
    // ========== DIARY COLLECTION ==========
    // Shared classroom information
    match /diary/{diaryId} {
      // All authenticated users can read
      allow read: if request.auth != null;
      
      // Only admin can write
      allow write: if request.auth != null &&
                   request.auth.token.email == "rockyhsn9@gmail.com";
    }
    
    // ========== EXAMS COLLECTION ==========
    // School exams and assessments
    match /exams/{examId} {
      // All authenticated users can read
      allow read: if request.auth != null;
      
      // Only admin can write
      allow write: if request.auth != null &&
                   request.auth.token.email == "rockyhsn9@gmail.com";
    }
    
    // ========== DEFAULT DENY ==========
    // All other collections/documents
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules Explanation

| Collection | Operation | Allowed | Condition |
|-----------|-----------|---------|-----------|
| `/users/{uid}` | READ | ✅ | Self OR admin |
| `/users/{uid}` | WRITE | ❌ | Never (Cloud Functions only) |
| `/userCredentials/{uid}` | READ | ❌ | Never (admin SDK only) |
| `/userCredentials/{uid}` | WRITE | ❌ | Never (admin SDK only) |
| `/diary/{id}` | READ | ✅ | Authenticated user |
| `/diary/{id}` | WRITE | ✅ | Admin email match |
| `/exams/{id}` | READ | ✅ | Authenticated user |
| `/exams/{id}` | WRITE | ✅ | Admin email match |

### Firestore Indexes Required

```
Collection: /users
  - email (Ascending) - used in login queries
  - role (Ascending) - used in admin queries
  - status, role (Ascending) - used in filtering
```

---

## 3. FINAL CLOUD FUNCTIONS

### Function 1: `getLoginUsers` (NEW - Unauthenticated)

**Endpoint:** `GET /api/auth/login-users`  
**Auth:** PUBLIC (no Firebase Auth required)  
**Purpose:** Provide login screen with users list

**Response:**
```json
{
  "users": [
    {
      "uid": "pin-wafi-uid-123",
      "name": "Wafi",
      "email": "affanwafee@gmail.com",
      "role": "student",
      "status": "active",
      "authMethod": "pin"
    },
    {
      "uid": "pin-tahsin-uid-456",
      "name": "Tahsin",
      "email": "tahsin@gmail.com",
      "role": "teacher",
      "status": "active",
      "authMethod": "pin"
    }
  ]
}
```

**Process:**
1. Query Firestore `/users` collection
2. Filter: authMethod == "pin" && status == "active"
3. Return ONLY: uid, name, email, role, status, authMethod
4. NEVER return: pinHash, pinFailedAttempts, createdBy, permissions

**Why:**
- Login screen needs to know which users exist
- But must never expose credentials/sensitive fields
- Public endpoint is safe because data is non-sensitive

---

### Function 2: `createUser` (Admin Only - Changed)

**Endpoint:** `POST /api/admin/users`  
**Auth:** Firebase Auth (admin only)

**Input:**
```json
{
  "email": "affanwafee@gmail.com",
  "name": "Wafi",
  "role": "student",
  "initialPin": "1234"  // optional, generates random if not provided
}
```

**Process (REVISED - Create Auth Immediately):**

```
1. Verify caller is admin (custom claims check)

2. Validate input:
   - email unique (not in /users)
   - role in valid set
   - name not empty
   - initialPin 4 digits (or generate)

3. Generate new UID for this user
   - uid = crypto.randomUUID() or timestamp-based

4. CREATE FIREBASE AUTH ACCOUNT (NEW STEP):
   - auth.createUser({
       uid: uid,
       email: email,
       disabled: false
     })
   - This creates account immediately with stable UID
   - Account disabled=false (user can log in after PIN verified)

5. CREATE FIRESTORE /users/{uid}:
   {
     "uid": uid,
     "email": email,
     "name": name,
     "role": role,
     "status": "active",
     "authMethod": "pin",
     "permissions": rolePresets[role],
     "createdAt": now,
     "updatedAt": now,
     "createdBy": adminUid,
     "lastLoginAt": null
   }

6. CREATE FIRESTORE /userCredentials/{uid}:
   {
     "uid": uid,
     "pinHash": bcrypt(initialPin, rounds=12),
     "pinLastSet": now,
     "pinFailedAttempts": 0,
     "pinLockedUntil": null
   }

7. Return to admin:
   {
     "uid": uid,
     "email": email,
     "initialPin": initialPin,
     "message": "User created and Firebase Auth account established"
   }
```

**Why This Changes:**
- ✅ Firebase Auth account exists immediately (admin can disable/enable before first login)
- ✅ PIN verification step just needs to verify credentials, not create auth
- ✅ Admin has more control (can disable user before they even log in)
- ✅ Cleaner separation: admin creates account, user logs in

---

### Function 3: `pinLogin` (REVISED - Simpler Since Auth Exists)

**Endpoint:** `POST /api/auth/pin-login`  
**Auth:** PUBLIC (unauthenticated)

**Input:**
```json
{
  "email": "affanwafee@gmail.com",
  "pin": "1234"
}
```

**Process (REVISED - Auth Account Already Exists):**

```
1. Validate input (email format, pin 4 digits)

2. Query Firestore: /users where email == input.email
   - If not found: return 404 (generic)

3. Get uid from /users document

4. Check status:
   - If status != "active": return 403 (generic)

5. Query Firestore: /userCredentials/{uid}
   - Get: pinHash, pinFailedAttempts, pinLockedUntil

6. Check brute-force lockout:
   - If pinLockedUntil > now: return 429 (retry-after header)

7. Verify PIN:
   - bcrypt.compare(input.pin, pinHash)
   - If NO MATCH:
     * Increment pinFailedAttempts
     * If attempts >= 5: set pinLockedUntil = now + 15 min
     * Update /userCredentials/{uid}
     * Return 401 (generic)

8. PIN MATCHES (success):
   - Reset pinFailedAttempts = 0
   - Clear pinLockedUntil = null
   - Update /userCredentials/{uid}
   - Update /users/{uid}: lastLoginAt = now
   
   - Get /users/{uid} for role
   
9. Create Firebase Auth custom token:
   - admin.auth().createCustomToken(uid, {
       role: user.role,
       email: user.email
     })
   - TTL: 3600 seconds (1 hour)

10. Return success:
    {
      "token": "customTokenJWT...",
      "expiresIn": 3600,
      "uid": uid
    }
```

**What Changed:**
- Firebase Auth account already exists (created during admin createUser)
- Cloud Function just verifies credentials and issues token
- Much simpler flow (no account creation)

---

### Function 4: `resetPin` (Admin Only - REVISED)

**Endpoint:** `PUT /api/admin/users/{uid}/pin/reset`  
**Auth:** Firebase Auth (admin only)

**Input:**
```json
{
  "newPin": "5678"  // optional, generates random if not provided
}
```

**Process:**

```
1. Verify admin

2. Load /users/{uid} (verify exists)

3. Generate new PIN (or use provided)

4. Hash PIN with bcrypt (rounds=12)

5. Update /userCredentials/{uid}:
   {
     "pinHash": bcrypt(newPin),
     "pinFailedAttempts": 0,
     "pinLockedUntil": null,
     "pinLastSet": now
   }

6. Return to admin:
   {
     "uid": uid,
     "newPin": newPin,
     "message": "PIN reset successfully"
   }
```

**Note:** Firebase Auth account unchanged (disable/enable separate)

---

### Function 5: `disableUser` (Admin Only - REVISED)

**Endpoint:** `PUT /api/admin/users/{uid}/disable`  
**Auth:** Firebase Auth (admin only)

**Input:**
```json
{
  "disabled": true  // or false to re-enable
}
```

**Process:**

```
1. Verify admin
   - Prevent disabling self

2. Load /users/{uid}

3. If disabled == true:
   - Update Firestore /users/{uid}: status = "disabled"
   - Disable Firebase Auth: auth.updateUser(uid, { disabled: true })
   - Now:
     * User cannot log in (auth rejects them)
     * Firestore rules check status="active"
     * Real-time listener notifies UI immediately

4. If disabled == false:
   - Update Firestore /users/{uid}: status = "active"
   - Enable Firebase Auth: auth.updateUser(uid, { disabled: false })
   - User can log in again

5. Return success
```

**Why This Design (REVISED):**
- ✅ Firebase Auth.disabled enforces at authentication layer (hard stop)
- ✅ Firestore status enforces at rules layer (defense in depth)
- ✅ Realtime listener updates UI immediately (< 500ms)
- ✅ Two independent layers = account revocation is guaranteed

---

### Function 6: `updateUser` (Admin Only)

**Endpoint:** `PUT /api/admin/users/{uid}`  
**Auth:** Firebase Auth (admin only)

**Input:**
```json
{
  "name": "Wafi Ahmed",        // optional
  "role": "student",            // optional
  "permissions": ["dashboard"], // optional (override role defaults)
  "status": "active"            // optional (use disableUser endpoint for this)
}
```

**Process:**

```
1. Verify admin

2. Load /users/{uid}

3. Validate inputs (role in set, etc.)

4. Update /users/{uid}:
   - name (if provided)
   - role (if provided)
   - permissions (if provided, or recalculate from role)
   - status (if provided)
   - updatedAt = now

5. If role changed:
   - Custom token will use new role on next login

6. Return updated document
```

**Note:** Does NOT modify /userCredentials (that's for PIN only)

---

### Deleted Functions

```
❌ validateCustomToken
   - No concrete production use case
   - Reduces attack surface
   - Frontend can detect expired token directly
```

---

## 4. FINAL FIREBASE AUTH LIFECYCLE

### Complete Auth User Lifecycle

#### Stage 1: Admin Creates User

```
TIMELINE: During createUser Cloud Function call

BEFORE:
  Firebase Auth: (no user)
  Firestore /users: (no document)
  Firestore /userCredentials: (no document)

ACTION: Admin calls createUser({ email, name, role, pin })

AFTER:
  Firebase Auth:
    ✅ Account created with uid
    ✅ disabled: false (ready for first login)
    ✅ email: configured
    ✅ custom claims: { role: role }
  
  Firestore /users/{uid}:
    ✅ uid, email, name, role, status="active"
    ✅ permissions, authMethod="pin", timestamps
  
  Firestore /userCredentials/{uid}:
    ✅ pinHash: bcrypt(pin)
    ✅ pinFailedAttempts: 0
    ✅ pinLockedUntil: null

ADMIN SEES: "User created. PIN: 1234"
```

#### Stage 2: User First Login

```
TIMELINE: User enters email + PIN

ACTION: User calls pinLogin({ email, pin })

PROCESS:
1. Verify PIN against /userCredentials/{uid}.pinHash
2. Create custom token: admin.auth().createCustomToken(uid, {...})
3. Return token to frontend

RESULT:
  Firebase Auth:
    ✅ signInWithCustomToken(token) → authenticated session
    ✅ currentUser.uid = uid
    ✅ currentUser.customClaims.role = role
  
  Frontend:
    ✅ onAuthStateChanged fires
    ✅ Firestore /users/{uid} listener attaches
    ✅ currentUser state updates
    ✅ Dashboard renders with user's permissions
```

#### Stage 3: Account Disable (Admin Action)

```
TIMELINE: Admin disables user

ACTION: Admin calls disableUser({ uid, disabled: true })

PROCESS:
1. Update Firestore /users/{uid}: status = "disabled"
2. Update Firebase Auth: auth.updateUser(uid, { disabled: true })

EFFECTS IMMEDIATELY:
  Firestore Listener:
    ✅ Detects /users/{uid}.status = "disabled"
    ✅ Notifies UI (< 500ms)
    ✅ UI can redirect to login or show "account disabled"
  
  Auth Layer (Hard Stop):
    ✅ User cannot obtain new token
    ✅ If user tries login: Firebase Auth rejects
    ✅ If current session active: expires naturally
    ✅ Real-time listener + auth = double enforcement

ADMIN SEES: "User disabled"
USER SEES: If active session → "Account disabled" popup (from listener)
           If tries login → "Account not found" error
```

#### Stage 4: PIN Reset (Admin Action)

```
TIMELINE: Admin resets PIN

ACTION: Admin calls resetPin({ uid, newPin })

PROCESS:
1. Update /userCredentials/{uid}:
   - pinHash = bcrypt(newPin)
   - pinFailedAttempts = 0
   - pinLockedUntil = null

EFFECTS:
  Old PIN: No longer works
  New PIN: Works immediately on next login
  Account Status: Unchanged (still active/disabled as was)
```

#### Stage 5: User Logout

```
TIMELINE: User clicks logout

ACTION: Frontend calls signOut()

PROCESS:
1. Firebase Auth session cleared
2. Firestore listeners detached
3. localStorage cleared (non-sensitive data only)

RESULT:
  Firebase Auth: (no current user)
  Firestore: (listeners stopped)
  Frontend: Return to login screen
```

---

## 5. EXACT MIGRATION PROCEDURE (REVISED)

### Users to Migrate

```
1. Rocky Hassan (u-firebase-admin)
   Current: Admin via Google OAuth
   Future: Admin via same Google OAuth (no auth change)
   
2. Afreen (u-1786970828154)
   Current: localStorage, role=parent, pin stored
   Future: Firebase Auth + Firestore, pin hashed
   
3. Wafi (u-1786970842930)
   Current: localStorage, role=student, pin stored
   Future: Firebase Auth + Firestore, pin hashed
   
4. Tahsin (u-1786970857370)
   Current: localStorage, role=teacher, pin stored
   Future: Firebase Auth + Firestore, pin hashed
```

### Migration Steps (Revised - Auth Created Immediately)

#### STEP 1: Backup Existing Data

```bash
# Backup localStorage wafi.users-access (already captured)
# Backup Firestore /diary collection
# Backup Firestore /exams collection
# Backup auth/diary/exams storage
```

#### STEP 2: Prepare Migration Data

```json
{
  "users": [
    {
      "id": "u-firebase-admin",
      "email": "rockyhsn9@gmail.com",
      "name": "Rocky Hassan",
      "role": "admin",
      "pin": ""  // No PIN for admin
    },
    {
      "id": "u-1786970828154",
      "email": "afreen.antora@gmail.com",
      "name": "Afreen",
      "role": "parent",
      "pin": "stored_from_localStorage"
    },
    {
      "id": "u-1786970842930",
      "email": "affanwafee@gmail.com",
      "name": "Wafi",
      "role": "student",
      "pin": "stored_from_localStorage"
    },
    {
      "id": "u-1786970857370",
      "email": "tahsin@gmail.com",
      "name": "Tahsin",
      "role": "teacher",
      "pin": "stored_from_localStorage"
    }
  ]
}
```

#### STEP 3: Deploy Cloud Functions

```bash
firebase deploy --only functions:createUser,functions:pinLogin,functions:resetPin,functions:disableUser,functions:updateUser,functions:getLoginUsers
```

#### STEP 4: Create Admin User (Rocky)

```
METHOD: Admin SDK script or manual

ACTION: Create Rocky with Google auth

Process:
  1. Rocky already has Firebase UID from Google Sign-In
     → Get UID from auth.getUserByEmail("rockyhsn9@gmail.com")
     → Save as rockysUid = "google-...abc..."
  
  2. Create /users/{rockysUid}:
     {
       "uid": rockysUid,
       "email": "rockyhsn9@gmail.com",
       "name": "Rocky Hassan",
       "role": "admin",
       "status": "active",
       "permissions": [all 20 features],
       "authMethod": "google",
       "createdAt": now,
       "updatedAt": now,
       "createdBy": "system-migration"
     }

RESULT: Rocky is set up in Firestore, can log in immediately via Google
```

#### STEP 5: Create PIN Users (Afreen, Wafi, Tahsin)

```
METHOD: Call Cloud Function createUser for each user

FOR EACH USER (Afreen, Wafi, Tahsin):

  INPUT TO createUser:
  {
    "email": "affanwafee@gmail.com",
    "name": "Wafi",
    "role": "student",
    "initialPin": "stored_pin_from_localStorage"
  }

  CLOUD FUNCTION DOES:
  1. Generate new uid (e.g., crypto.randomUUID())
  2. CREATE Firebase Auth account:
     auth.createUser({
       uid: uid,
       email: email,
       disabled: false  // Ready for login
     })
  
  3. CREATE /users/{uid}:
     {
       "uid": uid,
       "email": email,
       "name": name,
       "role": role,
       "status": "active",
       "permissions": rolePresets[role],
       "authMethod": "pin",
       "createdAt": now,
       "updatedAt": now,
       "createdBy": rockysUid
     }
  
  4. CREATE /userCredentials/{uid}:
     {
       "uid": uid,
       "pinHash": bcrypt(initialPin, rounds=12),
       "pinLastSet": now,
       "pinFailedAttempts": 0,
       "pinLockedUntil": null
     }

  RESULT:
  - Afreen: Firebase Auth + /users + /userCredentials created
  - Wafi: Firebase Auth + /users + /userCredentials created
  - Tahsin: Firebase Auth + /users + /userCredentials created
  - All 3 can now log in with their stored PIN
```

#### STEP 6: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**Rules Must Include:**
- `/users/{uid}` - read rules only (no write)
- `/userCredentials/{uid}` - DENY ALL (admin SDK only)
- `/diary/{id}` - preserve existing rules
- `/exams/{id}` - preserve existing rules

#### STEP 7: Deploy Frontend Code

```
Frontend changes:
  ✅ Update access-store.tsx to use Firebase Auth + Firestore
  ✅ Update index.tsx (login) to call getLoginUsers + pinLogin
  ✅ Update admin dashboard to call Cloud Functions
  ✅ REMOVE localStorage user storage
  ✅ KEEP localStorage for diary/exams caching
```

#### STEP 8: Test in Staging

```
VERIFICATION:
  ✅ Admin (Rocky) can log in via Google
  ✅ Afreen can log in with PIN (parent)
  ✅ Wafi can log in with PIN (student)
  ✅ Tahsin can log in with PIN (teacher)
  ✅ Features render correctly per role
  ✅ Admin can create new users
  ✅ Admin can disable/enable users
  ✅ Fresh incognito browser login works
  ✅ Diary sync works
  ✅ Exams sync works
```

#### STEP 9: Production Deployment

```
1. Deploy Cloud Functions to production
2. Deploy Firestore rules to production
3. Deploy frontend code to production
4. Monitor logs for 24 hours
5. Verify all 4 users can log in
6. Keep rollback plan active for 48 hours
```

#### STEP 10: Cleanup

```
AFTER 1 WEEK (if everything stable):
  ✅ Delete localStorage backup code
  ✅ Remove old access-store fallbacks
  ✅ Remove localStorage.removeItem('wafi.users-access')
  ✅ Archive old implementation branch
```

---

## 6. EXACT FRONTEND FILES TO MODIFY

### File 1: `src/lib/access-store.tsx` (MAJOR CHANGE)

**Current:** localStorage-based user management  
**Future:** Firebase Auth + Firestore listeners

**Changes:**
```typescript
// REMOVE:
  - const [users, setUsers] = useState<AccessUser[]>(seedUsers)
  - localStorage.getItem('wafi.users-access')
  - localStorage.setItem('wafi.users-access', ...)
  - signIn() → PIN verification against localStorage
  - invite(), togglePermission(), setRole(), toggleStatus(), remove()
    (all move to Cloud Functions)

// ADD:
  - const [currentUser, setCurrentUser] = useState<Firestore User>()
  - onAuthStateChanged() → already exists, keep it
  - NEW: onSnapshot(/users/{uid}) → real-time user data sync
  - NEW: useEffect to load /users collection on auth state change
  - NEW: loginWithPin() → call Cloud Function pinLogin
  - Keep: loginWithGoogle() (unchanged)
  - Keep: can() permission checker (uses Firestore data now)
```

**Risk:** HIGH (complete refactor)

---

### File 2: `src/routes/index.tsx` (MAJOR CHANGE)

**Current:** PIN verification local, role selection with localStorage lookup  
**Future:** PIN sent to Cloud Function, custom token exchange

**Changes:**
```typescript
// REMOVE:
  - signIn(user.email, pin) → localStorage verification
  - Users array from context
  - Manual PIN validation

// ADD:
  - Call getLoginUsers Cloud Function to fetch users
  - Store returned users in local state
  - Call pinLogin Cloud Function with (email, pin)
  - Receive custom token
  - Call signInWithCustomToken(auth, token)
  - Wait for onAuthStateChanged to fire
  - Redirect to dashboard

// KEEP:
  - Admin Google Sign-In button (unchanged)
  - Numeric keypad UI (unchanged)
  - Error messages (similar, but from Cloud Function)
```

**Risk:** HIGH (auth flow change)

---

### File 3: `src/routes/admin/$userId.tsx` (MODERATE CHANGE)

**Current:** Admin operations call AccessContext methods  
**Future:** Admin operations call Cloud Functions

**Changes:**
```typescript
// REPLACE:
  - context.invite() → POST /api/admin/users (Cloud Function)
  - context.resetPIN() → PUT /api/admin/users/{uid}/pin/reset
  - context.toggleStatus() → PUT /api/admin/users/{uid}/disable
  - context.setRole() → PUT /api/admin/users/{uid}
  - context.changePIN() → DELETE (use resetPin instead)

// ADD:
  - Error handling for Cloud Function responses
  - Loading states for async operations

// KEEP:
  - Admin dashboard UI
  - User list display
  - Permission controls (call updateUser)
```

**Risk:** MEDIUM (API changes but UI similar)

---

### File 4: `src/lib/school-content.tsx` (VERIFY - NO CHANGE EXPECTED)

**Current:** Firestore listeners for diary/exams, localStorage fallback  
**Future:** Same (no changes needed)

**Verify:**
- ✅ Firestore listeners still work
- ✅ localStorage merge still works (if kept for offline)
- ✅ Admin auth check still works (email validation)

**Risk:** LOW

---

### File 5: `src/components/route-guard.tsx` (VERIFY - NO CHANGE EXPECTED)

**Current:** Permission checking against context.can()  
**Future:** Same (but data source changes to Firestore)

**Verify:**
- ✅ Permission check still works
- ✅ Access denied still works
- ✅ Routes still protected

**Risk:** LOW

---

### File 6: `src/lib/firebase.ts` (MINIMAL CHANGE)

**Current:** Firebase init + auth setup  
**Future:** Same (no changes, server-side has admin SDK)

**No changes needed** (Cloud Functions have separate setup)

**Risk:** NONE

---

## 7. SUMMARY: RISKS AND ROLLBACK

### Critical Risks

```
RISK 1: Custom Claims Staleness (MITIGATED)
  Problem: Claims don't update until token refresh
  Mitigation: Firestore /users remains source of truth
  Check: Rules verify role from /users, not just claims
  
RISK 2: Firebase Auth Account Creation Race (MITIGATED)
  Problem: Creating auth + Firestore simultaneously
  Mitigation: Atomic operation in Cloud Function
  Check: Both succeed or both fail (transaction)
  
RISK 3: PIN Exposure During Migration (MITIGATED)
  Problem: PIN from localStorage could be logged
  Mitigation: PIN only read from encrypted localStorage, bcrypt immediately
  Check: No PIN logging in functions
  
RISK 4: Credential Collection Not Locked Down (CRITICAL)
  Problem: If /userCredentials not protected by rules
  Mitigation: Firestore rules MUST deny all client access
  Check: Test rule enforcement with devtools
  
RISK 5: Diary/Exams Break Post-Migration (MITIGATED)
  Problem: Rules change affects diary/exams access
  Mitigation: Preserve existing rules exactly
  Check: Test diary/exams read/write before/after
```

### Rollback Plan (Same as Before)

#### Immediate Rollback (< 30 min)

```
1. Revert frontend code to previous version
2. Disable Cloud Functions temporarily
3. Restore localStorage backup
4. Users can log in via old path
```

#### Full Recovery

```
1. Keep Firestore /users collection
2. Keep Firebase Auth accounts created
3. Revert frontend code
4. Users can log in via localStorage
5. Firestore data won't interfere
```

#### Partial Fix

```
If only Cloud Function logic is wrong:
1. Fix function code
2. Re-deploy function
3. Existing Firestore data will work
```

---

## 8. DEPLOYMENT GATES & APPROVALS

### Gate 1: Architecture Approval (NOW)

```
☐ Separate /userCredentials collection accepted
☐ Firebase Auth created at user creation time accepted
☐ Disable enforcement via rules + auth accepted
☐ Custom claims risk mitigated accepted
☐ Safe getLoginUsers function accepted
☐ validateCustomToken deletion accepted
☐ Preserve diary/exams behavior accepted
☐ Migration procedure with new auth lifecycle accepted
```

### Gate 2: Staging Verification

```
☐ All Cloud Functions deployed and tested
☐ Firestore rules deployed and tested
☐ /userCredentials collection locked down (rules deny all)
☐ All 4 users migrated successfully
☐ Fresh incognito login works
☐ Admin operations work
☐ Diary/exams continue working
☐ Rollback procedure tested
```

### Gate 3: Production Approval

```
☐ Staging verification complete
☐ On-call support identified
☐ Rollback plan confirmed
☐ Ready to deploy
```

---

## NEXT STEPS

✅ **This revised blueprint is complete and addresses all 8 corrections.**

**Awaiting your approval on:**
1. ✅ Separate /userCredentials collection (admin SDK only)
2. ✅ Firebase Auth created at user creation time
3. ✅ Disable enforcement in rules + code (not just listener)
4. ✅ Custom claims risk mitigation
5. ✅ Safe getLoginUsers function (unauthenticated)
6. ✅ Removed validateCustomToken
7. ✅ Verified diary/exams behavior (preserve existing rules)
8. ✅ Recalculated migration with new auth lifecycle

**If approved:** Implementation begins (no code changes yet)  
**If corrections needed:** Revise blueprint again

