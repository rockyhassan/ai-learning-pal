# Complete User/Auth Architecture Audit

**Status:** Investigation Complete (No Code Changes)  
**Date:** August 17, 2026  
**Scope:** User management, authentication, roles, permissions, PIN system, admin login, data persistence

---

## EXECUTIVE SUMMARY

The app uses a **fully client-side authentication system** with:
- **localStorage** as the primary user database (email-based)
- **4-digit numeric PINs** for student/parent/teacher login
- **Google Sign-In** for admin (via Firebase Auth)
- **Role-based access control** (student, parent, teacher, admin)
- **Feature-level permissions** (19 features with per-role presets)
- **Zero backend persistence** for users (Firestore only used for diary/exams/routine)

**Current Data Persistence:**
- Users: localStorage only (`"wafi.users-access"`)
- Session: localStorage only (`"wafi.session.email"`)
- School content: localStorage + Firestore (diary, exams, routine)

---

## 1. ADMIN INVITE FLOW

### Entry Point
- **Component:** `src/routes/admin/index.tsx` (lines 77-107)
- **Route:** `/admin/` (Admin Dashboard)

### Form Capture
```
Input fields:
- name (text, optional)
- email (text, required, must contain "@")
- role (dropdown: student | parent | teacher | admin)
Submit: "Send invite" button
```

### Processing on Submit
1. **Validation:** Email must contain "@" (line 82)
2. **Callback:** `invite({ name, email, role })` (line 93)
3. **Location:** `src/lib/access-store.tsx` lines 312-326

### PIN Generation
- **Function:** `generatePIN()` (lines 146-148)
- **Logic:** `Math.floor(1000 + Math.random() * 8000).toString()`
- **Range:** 1000-8999 (4 digits, numeric only)
- **Generated:** Fresh for every new user invite
- **Uniqueness:** Not enforced (collision possible but unlikely)

### User Creation
```typescript
// Created user object
{
  id: `u-${Date.now()}`,           // Timestamp-based, unique
  name: name || email.split("@")[0] || email,  // Defaults to email prefix
  email: email,
  role: role,                       // student|parent|teacher|admin
  status: "active",                 // Always active on creation
  permissions: rolePresets[role],   // Preset permissions for role
  pin: generatePIN(),               // 4-digit PIN
}
```

### Persistence
1. **In-memory:** `setUsers((prev) => [...prev, newUser])` (line 319)
2. **Storage:** useEffect watches `users` array (lines 262-267)
3. **localStorage:** `localStorage.setItem("wafi.users-access", JSON.stringify(users))`
4. **Immediate:** Persisted every time users array changes

### Post-Invite
- User appears in Admin Dashboard's user list
- User is immediately "active" and can log in
- Admin can edit user: change role, modify permissions, reset PIN, disable, or delete

---

## 2. STUDENT/PARENT/TEACHER LOGIN FLOW

### Entry Point
- **Component:** `src/routes/index.tsx` (Login Page)
- **Route:** `/` (root)

### Step 1: Role Selection (Lines 179-270)
```
Display: 3 cards (Student, Teacher, Parent)
- Only shows roles that have users in users array
- Each card shows: user avatar, user name, role badge
- Click action: setSelectedRole(role), enter PIN mode
```

### Step 2: PIN Entry (Lines 271-350)
```
Display: User info + 4x4 numeric keypad
- User name displayed
- Keypad shows numbers 0-9 + backspace + submit
- On keypad input: appends to pin state (line 161)
- Auto-submit: when pin.length === 4 (lines 112-119)
```

### Step 3: Credential Validation
**Function:** `signIn(email, pin)` in `src/lib/access-store.tsx` (lines 288-299)

```typescript
// Validation sequence
1. Find user by email (case-insensitive):
   const found = users.find(u => u.email.toLowerCase() === email.toLowerCase())
   
2. If not found:
   return { ok: false, reason: "not-found" }
   
3. If found but disabled:
   if (found.status === "disabled")
   return { ok: false, reason: "disabled" }
   
4. If PIN mismatch:
   if (found.pin !== inputPin)
   return { ok: false, reason: "invalid-pin" }
   
5. If all valid:
   - localStorage.setItem("wafi.session.email", found.email)
   - setEmail(found.email)  // Triggers currentUser update
   - return { ok: true }
```

### Step 4: Session Establishment
- **Email stored:** `"wafi.session.email"` in localStorage
- **currentUser resolved:** Via useMemo (lines 285-292)
  ```typescript
  users.find(u => u.email.toLowerCase() === email.toLowerCase())
  ```
- **Redirect:** To dashboard or query param `redirect` (line 70 in index.tsx)

### Session Persistence
- **On reload:** SessionLoad effect (lines 272-276) restores email from localStorage
- **Users restored:** UsersLoad effect (lines 219-259) restores users array
- **currentUser auto-resolves:** Once both email and users loaded

### Switching Accounts
- **Back button:** Returns to role selection (line 300-302)
- **Sign out:** Clears session (line 305) via settings page
- **Multiple accounts:** Supported (different emails)
- **Role switching:** Must sign out and back in as different role

---

## 3. ROLE & PERMISSION SYSTEM

### Roles Defined
- **File:** `src/lib/access-store.tsx` line 14
- **Values:** "student" | "parent" | "teacher" | "admin"
- **Storage:** In AccessUser.role field

### Role Labels (Lines 59-63)
```
- student: 👨‍🎓 Student / শিক্ষার্থী
- parent: 👨‍👩‍👧‍👦 Parent / অভিভাবক
- teacher: 👨‍🏫 Teacher / শিক্ষক
- admin: ⚙️ Admin / অ্যাডমিন
```

### Default Permissions Per Role (Lines 66-105)

**Student (15 features):**
dashboard, study, homework, ai-teacher, scan, vocabulary, pronunciation, question-bank, practice, games, progress, planner, notifications, documents, achievements

**Parent (10 features):**
dashboard, parent-mode, progress, homework, planner, notifications, documents, achievements, ai-memory, school-profile

**Teacher (10 features):**
dashboard, study, homework, question-bank, practice, progress, planner, notifications, documents, school-profile

**Admin (19 features - all):**
All features including admin panel access

### Permission Modification

**After user creation, admin can:**
1. **Change role:** `setRole(userId, newRole)` (lines 346-349)
   - Automatically resets permissions to role defaults
   - Example: Change parent → teacher = permissions reset to teacher defaults

2. **Toggle individual permissions:** `togglePermission(userId, feature)` (lines 336-343)
   - Add/remove specific features
   - Can mix and match (e.g., teacher with student's "scan" feature)

3. **Disable account:** `toggleStatus(userId)` (lines 351-356)
   - Cannot log in if disabled
   - Existing session blocked at route guard

4. **Delete user:** `remove(userId)` (lines 357-359)
   - Removed from users array
   - If logged in, redirected to login on next route

All changes auto-persisted to localStorage immediately.

### Permission Checking

**Route-level (route-access.ts):**
```typescript
// featureForRoute(pathname) maps route to feature:
"/admin" → "admin"
"/dashboard" → "dashboard"
"/homework" → "homework"
etc.

// isPublicRoute(pathname) skips check for:
"/", "/signup", "/login", "/student-setup"

// isSessionOnlyRoute(pathname) allows any logged-in user:
"/profile", "/settings"
```

**Route Guard enforcement (in root layout):**
```
For every route:
1. If public route → allow
2. If session-only → allow if logged in
3. If feature route → check currentUser.permissions.includes(feature)
4. If permission missing → show shield page (access denied)
```

**Component-level:**
```typescript
// Components can check permission:
const { can } = useAccess()
if (!can("homework")) return null  // Hide component
```

**Function:** `can(featureKey)` (lines 300-303)
```typescript
currentUser && 
currentUser.status !== "disabled" && 
currentUser.permissions.includes(featureKey)
```

---

## 4. PIN SYSTEM

### PIN Characteristics
- **Length:** Exactly 4 digits
- **Format:** Numeric only (0-9)
- **Range:** 1000-8999 (generated by `Math.floor(1000 + Math.random() * 8000)`)
- **Storage:** Plain text in localStorage JSON
- **Encryption:** NONE (security vulnerability)
- **Uniqueness:** Not enforced (technically could duplicate)

### PIN Generation (Lines 146-148)
```typescript
function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 8000).toString();
}
```

### PIN Assignment
- **On invite:** Generated fresh via `generatePIN()`
- **On reset:** New random PIN generated by `resetPIN(userId)`
- **On change:** Admin provides custom PIN via `changePIN(userId, pin)`

### PIN Management (Admin Panel)

**File:** `src/routes/admin/$userId.tsx`

**1. Change PIN (lines 60-81):**
- Dialog prompts for new PIN
- Requires confirmation (both fields must match)
- Validation: exactly 4 digits
- Calls: `changePIN(userId, newPin)`
- Result: Persisted to localStorage

**2. Reset PIN (lines 83-99):**
- Generates new random PIN via `resetPIN(userId)`
- Displays PIN for 5 seconds (temporary tooltip)
- Admin must manually share with user
- No PIN recovery email/SMS system

### PIN Login Validation
- **During login:** `signIn(email, pin)` checks `found.pin !== inputPin` (line 297)
- **Exact match:** String comparison (case-sensitive, but PINs are numeric)
- **No rate limiting:** Unlimited attempts possible
- **No lockout:** No account lockout after N failed attempts
- **No logging:** No record of failed PIN attempts

### Security Issues with Current PIN System
1. **Plaintext storage:** All PINs readable in localStorage
2. **No encryption:** No hashing, salting, or obfuscation
3. **Short length:** 4 digits = 10,000 possible combinations
4. **Brute force:** No protection against brute force attacks
5. **No rate limiting:** Attacker could try all 10,000 combinations
6. **No audit trail:** No tracking of who logged in or failed attempts

---

## 5. GOOGLE ADMIN LOGIN

### Configuration Requirements

**Environment Variables (.env.local):**
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_FIREBASE_ADMIN_EMAIL=your-email@gmail.com  # CRITICAL
```

### Firebase Setup (src/lib/firebase.ts)
```typescript
// Initialize app
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth with local persistence
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)
```

### Admin Sign-In Flow

**Entry point:** Lock icon button on login page (lines 405-410 in index.tsx)

**Handler:** `handleAdminSignIn()` (lines 73-82)
```typescript
1. setIsAdminSigningIn(true)
2. Call signInAsAdmin()
3. Wait for result
4. If error: show error message, stay on login
5. If success: redirect to /admin
```

**Core function:** `signInAsAdmin()` (lines 378-404 in access-store.tsx)
```typescript
1. Check VITE_FIREBASE_ADMIN_EMAIL configured
   if (!adminEmail) return error

2. Create Google provider with profile + email scopes
   const provider = new GoogleAuthProvider()
   provider.addScope('profile')
   provider.addScope('email')

3. Open Google Sign-In popup
   const result = await signInWithPopup(auth, provider)

4. Validate email matches admin email
   if (result.user.email?.toLowerCase() !== adminEmail.toLowerCase())
     - signOut(auth)  // Sign out the non-admin user
     - return error

5. If email matches:
   - localStorage.setItem("wafi.session.email", result.user.email)
   - setEmail(result.user.email)
   - return { ok: true }
```

### Firebase Auth State Listener (Lines 172-208)

**Trigger:** `onAuthStateChanged(auth, callback)` fires automatically

**Listener logic:**
```typescript
1. Check if Firebase user authenticated
2. Get firebaseUser.email and compare to adminEmail
3. If email matches:
   - Create admin user in users array if doesn't exist:
     {
       id: "u-firebase-admin",
       name: firebaseUser.displayName || "Admin",
       email: firebaseUser.email,
       role: "admin",
       status: "active",
       permissions: rolePresets.admin,
       pin: ""  // No PIN for Firebase auth
     }
   - Set localStorage.setItem("wafi.session.email", email)
   - setEmail(result.user.email)
4. If email doesn't match or no user:
   - Do nothing (stay logged out)
```

### What Happens After Admin Authenticates

1. **User created in users array** (if not exists)
2. **Session email set** in localStorage
3. **Firebase session established** (persistent across page reloads)
4. **Firestore write access granted** (security rules check Firebase UID + email)
5. **Redirected to /admin dashboard**
6. **Can access:**
   - User management (invite, edit roles/permissions, disable/delete)
   - Diary management (create, edit, delete entries)
   - Routine management (class schedule)
   - Exams management (create exam dates)

### Multi-Admin Support

**Current design:**
- **Single admin account:** Only VITE_FIREBASE_ADMIN_EMAIL can use Google Sign-In
- **Firestore rules:** Hardcoded to check against configured admin email
- **Multiple local admins:** Technically possible via PIN-based admin role, but:
  - No Firestore write access (Firestore rules deny)
  - Can invite/manage users but can't sync to backend
  - Not recommended; defeats purpose of Firebase integration

**To support multiple admins:**
- Need to redesign Firestore security rules
- Allow multiple admin emails
- Create admin user list in Firestore
- Each admin authenticates with Firebase
- Firestore rules check if user has admin role in Firestore

**Current limitation:** Single admin by design

### Session Persistence

**On page reload:**
1. **Firebase session check:** `onAuthStateChanged` fires
2. **If Firebase session active:** Admin user auto-loaded in users array
3. **localStorage SESSION_KEY:** Already has admin email
4. **Result:** Admin stays logged in without re-authenticating

**On sign-out:**
```typescript
// Via settings page, admin clicks "Sign out"
1. localStorage.removeItem("wafi.session.email")
2. setEmail(null)
3. currentUser becomes null
4. Redirected to login page
5. Firebase session NOT cleared (Firebase keeps it)
6. If admin clicks lock button again, can log back in immediately
```

**To fully sign out:**
```typescript
// Admin would need to sign out of Firebase too:
import { signOut as firebaseSignOut } from "firebase/auth"
await firebaseSignOut(auth)
```
This is NOT currently implemented in the app.

---

## 6. DATA PERSISTENCE

### localStorage Keys

**1. "wafi.session.email"**
- **Content:** Current logged-in user's email
- **Type:** String
- **Set on:**
  - PIN login: `localStorage.setItem(SESSION_KEY, found.email)` (line 297)
  - Admin Google login: `localStorage.setItem(SESSION_KEY, firebaseUser.email)` (line 401)
- **Cleared on:**
  - Sign out: `localStorage.removeItem(SESSION_KEY)` (line 305)
- **Used for:**
  - Session restoration on page reload (line 273)
  - currentUser lookup by email

**2. "wafi.users-access"**
- **Content:** Entire users array as JSON string
- **Type:** JSON array of AccessUser objects
- **Set on:** Every users state change (lines 262-267)
  ```typescript
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  ```
- **Loaded on:** App mount (lines 219-259)
  ```typescript
  const raw = localStorage.getItem(USERS_KEY)
  setUsers(JSON.parse(raw))
  ```
- **Contains:**
  - id, name, email, role, status, permissions, pin
  - Example size: ~300 bytes per user
- **Capacity:** localStorage has ~5-10MB limit

**3. "wafi.lang"**
- **Content:** Language preference
- **Type:** String ("en" or "bn")
- **Set on:** Language change

**4. "wafi.dark"**
- **Content:** Dark mode preference
- **Type:** String ("0" or "1")
- **Set on:** Theme toggle

**5. "wafi.school-content"**
- **Content:** School diary, routine, exams
- **Type:** JSON object `{ diary, routine, exams }`
- **Set on:** Any admin change to diary/routine/exams
- **Used by:** SchoolContentProvider for initial state

### Firestore Collections (Currently Used)

**Only admin-accessible when authenticated:**

1. **`/diary`**
   - Documents: One per diary entry
   - Fields: date, title, content, author, etc.
   - Read access: All users (via security rules)
   - Write access: Admin only

2. **`/exams`**
   - Documents: One per exam
   - Fields: name, date, subject, chapter, etc.
   - Read access: All users
   - Write access: Admin only

3. **`/routine`**
   - Document: Single document with class routine
   - Fields: Array of class periods with time/subject/teacher
   - Read access: All users
   - Write access: Admin only (or localStorage only?)

### NOT on Firestore (Email-Based Only)

- **User list:** No Firestore collection
- **PINs:** Not persisted to Firestore
- **Permissions:** Not persisted to Firestore
- **Roles:** Not persisted to Firestore
- **Session state:** Not persisted to Firestore
- **Profile info:** Not persisted to Firestore

### Data Flow on App Reload

```
1. AccessProvider mounts
   ├─ Initialize: users = seedUsers (empty)
   ├─ Effect: onAuthStateChanged fires
   │  └─ If Firebase session active: create admin user
   ├─ Effect: Load from localStorage USERS_KEY
   │  ├─ Read "wafi.users-access"
   │  ├─ Parse JSON
   │  └─ setUsers(validatedUsers)
   ├─ Effect: Load session from localStorage
   │  ├─ Read "wafi.session.email"
   │  └─ setEmail(storedEmail)
   └─ useEffect: Whenever users changes, persist to localStorage

2. App renders
   ├─ currentUser resolved via useMemo
   ├─ if currentUser exists: user is logged in
   └─ if null: user is logged out → redirect to login

3. If admin: SchoolContentProvider
   ├─ Load from localStorage "wafi.school-content"
   ├─ Subscribe to Firestore /diary listener
   ├─ Subscribe to Firestore /exams listener
   └─ Merge remote data with local (Firestore wins on conflict)
```

### What Happens if localStorage is Cleared

**Scenario: User clears browser data while logged in**

```
1. Session lost:
   - "wafi.session.email" cleared
   - setEmail(null)
   - currentUser = null
   - User redirected to login page

2. Users list lost:
   - "wafi.users-access" cleared
   - users = []
   - All user data gone
   - Admin must re-invite all users

3. School content lost (if not admin):
   - "wafi.school-content" cleared
   - Diary entries disappear
   - Class routine disappears
   - Exam dates disappear
   - DATA LOSS: No backup unless admin has Firestore access

4. Admin case:
   - If admin authenticated with Firebase:
     - Firebase session persists (separate from localStorage)
     - Can re-authenticate via lock button
     - Firestore data (diary/exams) restored from backend
   - If admin NOT authenticated:
     - Same as non-admin: complete data loss

PREVENTION: Users should NOT manually clear browser data
RECOVERY: Manual export/import or Firestore backup
```

---

## 7. CURRENT LIMITATIONS & RISKS

### Data Loss Risks
1. **No automatic backup:** localStorage cleared = permanent data loss
2. **Single point of failure:** All user data in browser localStorage
3. **No versioning:** No way to restore previous state
4. **Manual recovery required:** Admin must remember users and re-invite

### Security Risks
1. **PINs plaintext:** Anyone with localStorage access reads all PINs
2. **No rate limiting:** Unlimited login attempts (brute force 10,000 combos in seconds)
3. **No lockout:** No account lockout after failed attempts
4. **No audit log:** No tracking of login attempts or failures
5. **No encryption:** All data unencrypted in localStorage
6. **Single admin:** Only one Google account can be admin
7. **No session timeout:** Sessions persist indefinitely
8. **No password strength:** 4-digit PINs inadequate for security

### User Experience Issues
1. **Not shared across devices:** Users must log in separately on each device
2. **No PIN recovery:** If user forgets PIN, admin must reset (no self-service)
3. **No email verification:** Typo in email = user can't log in
4. **No account recovery:** No "forgot PIN" flow
5. **Manual user management:** All users created by admin (no self-signup)

### Architectural Limitations
1. **No real-time sync:** Only admin can sync to Firestore (diary/exams)
2. **No offline support:** Works without internet but no sync
3. **No multi-device sync:** Changes on Device A don't sync to Device B
4. **No activity logging:** No record of who did what and when

---

## 8. COMPLETE USER LIFECYCLE

### Scenario: New Student Login

```
1. Admin invites student:
   ├─ Visits /admin
   ├─ Fills form: name="Ahmed", email="ahmed@school.com", role="student"
   ├─ Clicks "Send invite"
   └─ Student created with PIN (e.g., "4829")

2. Student storage:
   ├─ In-memory: added to users array
   ├─ localStorage: persisted to "wafi.users-access"
   └─ Admin can see in user list

3. Student logs in:
   ├─ Opens app
   ├─ Clicks "Student" role card
   ├─ Sees "Ahmed" (student name)
   ├─ Enters PIN: 4-8-2-9
   ├─ signIn(ahmed@school.com, "4829") validates
   ├─ Session saved: localStorage.setItem("wafi.session.email", "ahmed@school.com")
   └─ Redirected to /dashboard

4. Student session:
   ├─ currentUser resolved
   ├─ Permissions checked: student has 15 features
   ├─ Routes accessible: /dashboard, /study, /homework, etc.
   ├─ Routes blocked: /admin (no "admin" permission)
   └─ Can access school content (diary, routine, exams)

5. Student logs out:
   ├─ Clicks settings page → sign out
   ├─ localStorage.removeItem("wafi.session.email")
   ├─ setEmail(null)
   ├─ Redirected to login page
   ├─ Users list persists (users still in "wafi.users-access")
   └─ Can log back in with same PIN

6. Student on new device:
   ├─ Opens app on Device B
   ├─ localStorage is empty on Device B
   ├─ Sees no role cards (no users in users array)
   ├─ DATA ISOLATION: Can't log in because users not shared
   └─ Must wait for admin to invite on Device B (manual sync)
```

### Scenario: Admin Manages Permissions

```
1. Admin at /admin/$userId (Ahmed's profile)

2. Change role:
   ├─ Click role dropdown: change "student" → "teacher"
   ├─ setRole("ahmed-id", "teacher") called
   ├─ Ahmed's role changed to "teacher"
   ├─ Ahmed's permissions RESET to teacher defaults (10 features)
   ├─ localStorage persisted
   ├─ If Ahmed logged in: permissions change takes effect immediately
   └─ Routes accessible: /dashboard, /study, /homework, /question-bank, etc.

3. Disable account:
   ├─ Click "Disable" button
   ├─ toggleStatus("ahmed-id") called
   ├─ Ahmed's status: "active" → "disabled"
   ├─ If Ahmed currently logged in:
   │  ├─ can() returns false for all features
   │  ├─ RouteGuard detects: currentUser.status === "disabled"
   │  ├─ Shows lock page: "This account has been disabled"
   │  └─ Must be re-enabled to continue
   └─ If Ahmed tries to log in: signIn returns { ok: false, reason: "disabled" }

4. Reset PIN:
   ├─ Click "Reset PIN" button
   ├─ resetPIN("ahmed-id") generates new PIN (e.g., "7392")
   ├─ Shows PIN for 5 seconds in tooltip
   ├─ Admin must manually tell Ahmed: "Your new PIN is 7392"
   ├─ Ahmed logs out and logs back in with new PIN
   └─ No email/SMS notification to Ahmed
```

### Scenario: localStorage Cleared

```
1. User manually clears browser data (Ctrl+Shift+Delete)

2. Immediate effects:
   ├─ "wafi.session.email" cleared
   ├─ "wafi.users-access" cleared
   ├─ "wafi.school-content" cleared
   ├─ setEmail(null)
   ├─ setUsers([])
   ├─ currentUser = null
   └─ Redirected to login page

3. Login page:
   ├─ const user = users.find(u => u.role === "student")
   ├─ users array is empty: returns null
   ├─ Role card not rendered (if (!user) return null)
   ├─ No role cards visible
   ├─ Shows "No account found for this role"
   ├─ User cannot log in

4. Recovery:
   ├─ OPTION A: Admin visits /admin
   │  ├─ Admin also lost users list
   │  ├─ No users to invite again (didn't persist to Firestore)
   │  ├─ Manual recreate: admin re-invites all users
   │  └─ Takes time, error-prone
   ├─ OPTION B: Backup exists
   │  ├─ If data exported, can import users back
   │  └─ Manual process, no built-in import feature
   └─ OPTION C: Firestore backup (only for school content, not users)
      ├─ Admin authenticated: diary/exams data recoverable
      ├─ Users list: NOT on Firestore, NOT recoverable
      └─ User list still must be re-created
```

---

## 9. ENVIRONMENT VARIABLES REQUIRED

```bash
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Admin Configuration (CRITICAL)
VITE_FIREBASE_ADMIN_EMAIL=your-email@gmail.com
```

**How to find Firebase credentials:**
1. Go to Firebase Console → Project Settings
2. Copy Web App config
3. Add your Google account email for VITE_FIREBASE_ADMIN_EMAIL

