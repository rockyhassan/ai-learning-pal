# FINAL MIGRATION PLAN - WAFI LEARNING BUDDY

**Objective:** Remove PIN authentication. Implement Google-only auth with simple admin-authorization onboarding.  
**Architecture:** Single school, 4 roles (admin/teacher/parent/student), no workspace model.  
**Status:** Ready for implementation approval

---

## A. FINAL WAFI ARCHITECTURE

### Data Model

```
Firestore Collections:

/users/{uid}
  uid: string              (Firebase UID)
  email: string            (Google email)
  name: string             (Display name)
  role: "admin" | "teacher" | "parent" | "student"
  status: "active" | "disabled"
  photoURL?: string        (From Google)
  createdAt: timestamp
  updatedAt: timestamp

/diary/{diaryId}
  id: string
  date: string             (YYYY-MM-DD)
  subject: string
  cw: string               (Classwork)
  hw: string               (Homework)
  answer: string
  ... (other fields)

/exams/{examId}
  id: string
  name: string
  date: string
  chapter: string
  description?: string

Admin Authorization Store (separate from Firestore):
  Email-to-role mapping stored in Firestore admin collection OR env config
  (To be decided in implementation)
```

### Authentication State

```typescript
User State:
  - user: Firebase User object
  - uid: string (Firebase UID)
  - email: string (Google email)
  - role: "admin" | "teacher" | "parent" | "student" | null
  - status: "active" | "disabled"
  - isAuthenticated: boolean
  - currentUser: Firestore /users document
```

---

## B. FINAL AUTHENTICATION/ONBOARDING FLOW

### Step 1: Admin Pre-Authorization (One-time setup)

```
Admin (Rocky) creates authorized user profile:
  
  Interface: Admin panel (future feature)
  Data stored: Firestore /authorizedEmails or /config
  
  {
    email: "teacher@school.com",
    name: "Teacher Name",
    role: "teacher",
    status: "active"
  }
```

### Step 2: First-Time User Google Login

```
1. User visits app

2. Clicks "Sign In with Google"

3. Google OAuth popup

4. User signs in with Google (e.g., "teacher@school.com")

5. Firebase Auth confirms authentication

6. Backend logic:

   a. Extract Google email
   
   b. Query /authorizedEmails or check config
      → Find matching email + role + status
   
   c. If found:
      - Create /users/{uid} document with fetched role/status
      - Set isAuthenticated = true
      - Sync photoURL from Google
   
   d. If not found:
      - Show error: "Email not authorized"
      - signOut()
      - Return to login
   
   e. If found but status="disabled":
      - Reject login
      - Show error: "Account disabled"

7. onAuthStateChanged fires

8. Determine role from /users/{uid}.role

9. Set currentWorkspaceId = "default" (single school)

10. Auto-navigate to /{role}/dashboard

11. Dashboard renders permitted features based on role + permissions
```

### Step 3: Returning User Login

```
1. User clicks "Sign In with Google"

2. Firebase Auth recognizes existing account

3. onAuthStateChanged fires immediately

4. Load /users/{uid} from Firestore

5. Check status:
   - "active" → route to dashboard
   - "disabled" → logout, show error

6. Done
```

### Key Security Points

- ✅ Email whitelist checked server-side before user creation
- ✅ /users is source of truth for role/status
- ✅ Firestore Rules enforce read/write permissions
- ✅ Disabled users cannot access protected data
- ✅ No PIN, no invite code, no custom token
- ✅ Google OAuth handles authentication
- ✅ Firebase Auth handles session

---

## C. FINAL ROLE/PERMISSION MODEL

### 4 Roles (Wafi-specific)

```typescript
type Role = "admin" | "teacher" | "parent" | "student";

Role Capabilities:

ADMIN (Rocky):
  - Dashboard
  - View all diary entries
  - CREATE/EDIT/DELETE diary entries
  - View all exams
  - CREATE/EDIT/DELETE exam entries
  - Admin panel (user management, future)
  - All features

TEACHER:
  - Dashboard
  - View all diary entries (read-only)
  - View all exams (read-only)
  - Assign homework
  - View student progress
  - View curriculum features
  - No admin panel

PARENT:
  - Dashboard
  - View own child's progress
  - View assigned homework
  - View planner
  - View documents
  - LIMITED features (per design)

STUDENT:
  - Dashboard
  - View diary (read-only)
  - View exams (read-only)
  - View homework
  - Practice/study features
  - View personal progress
  - LIMITED features (per design)
```

### Permission Matrix (Keep Existing 19-Feature System)

```
Current Wafi features: dashboard, study, homework, ai-teacher, scan, 
vocabulary, pronunciation, question-bank, practice, games, progress, 
parent-mode, planner, notifications, documents, achievements, ai-memory, 
school-profile, admin

Permission enforcement:
  - Store rolePresets in code (existing model)
  - Check ROLE_PERMISSIONS in frontend
  - Firestore Rules enforce server-side
  - UI hides unauthorized features
```

---

## D. FILES TO REMOVE

### Delete Entirely (PIN infrastructure)

```
❌ functions/src/auth.ts
   - Contains: pinLogin(), resetPin(), getLoginUsers()
   - Replace with: None (all auth via Google + Firestore)

❌ functions/src/test-fixtures.ts
   - Contains: Synthetic test users with PINs
   - No longer needed

❌ functions/src/createUser.test.ts
   - Contains: PIN rollback tests
   - No longer needed

❌ PHASE_2A_IMPLEMENTATION_REPORT.md
❌ PHASE_2A_VERIFICATION_REPORT.md
❌ PHASE_2A_QUICK_START.md
   - Archive these but don't deploy

Optional:
⚠️  functions/src/emulator.test.ts (Can keep for Firestore Rules testing)
⚠️  functions/ directory (If only used for PIN auth, delete entire dir)
```

---

## E. FILES TO MODIFY

### High Priority

**1. src/routes/index.tsx** (Login page)

```
REMOVE:
  ❌ Role selection cards (Student, Teacher, Parent visibility)
  ❌ PIN numeric keypad (all UI)
  ❌ PIN input field
  ❌ PIN validation logic
  ❌ signIn(email, pin) calls
  ❌ Profile open/close for PIN entry

KEEP:
  ✅ Logo, tagline, theme toggle
  ✅ Language toggle (English/Bangla)
  ✅ Google Sign-In button
  ✅ Ambient background design

MODIFY:
  ⚠️  Add onAuthStateChanged listener
  ⚠️  Auto-redirect to dashboard after Google login
  ⚠️  Show loading state while checking authorization
  ⚠️  Handle "Email not authorized" error
  ⚠️  Handle "Account disabled" error
```

**2. src/lib/access-store.tsx** (Auth store)

```
REMOVE:
  ❌ const seedUsers = []
  ❌ signIn(email: string, pin: string) function
  ❌ changePIN() function
  ❌ resetPIN() function
  ❌ PIN generation (generatePIN())
  ❌ localStorage["wafi.users-access"] persistence
  ❌ All PIN-related state

KEEP:
  ✅ signInAsAdmin() (Google OAuth - refactor as generic Google login)
  ✅ signOut()
  ✅ useAccess() hook
  ✅ rolePresets, roleLabels, features (19-feature system)
  ✅ can(featureKey) permission checker
  ✅ WHITELISTED_EMAILS or similar mechanism

ADD:
  ✅ Firestore listener to /users/{uid}
  ✅ Role detection from /users document
  ✅ Status checking (active vs disabled)
  ✅ Real-time role/status sync

MODIFY:
  ⚠️  Replace localStorage user array with /users Firestore listener
  ⚠️  Refactor onAuthStateChanged to check /users authorization
```

**3. firestore.rules**

```
REMOVE:
  ❌ match /userCredentials/{uid} { ... }  (entire block)

KEEP:
  ✅ Helper functions: isAuth(), isUserActive(), isAdmin()
  ✅ match /users/{uid} { ... }
  ✅ match /diary/{diaryId} { ... }
  ✅ match /exams/{examId} { ... }
  ✅ Default deny

SIMPLIFY (optional):
  ⚠️  isUserActive() can be simplified to check /users.status only
      (No need for complex V5.1 checks without PIN/custom tokens)
```

### Medium Priority

**4. functions/src/users.ts** (User management)

```
KEEP:
  ✅ updateUser() function
  ✅ disableUser() function

REMOVE:
  ❌ createUser() (with PIN hash logic)
  ❌ resetPin() references

MODIFY:
  ⚠️  createUser() → Simplify or mark as deprecated
      (Admin will authorize emails in /authorizedEmails, no PIN)

ADD:
  ✅ syncUserToFirestore(user: FirebaseUser)
     - Creates /users/{uid} on first Google login
     - Syncs name, email, photoURL
```

**5. functions/src/index.ts** (Exports)

```
REMOVE:
  ❌ export { pinLogin, resetPin, getLoginUsers } from "./auth"

KEEP:
  ✅ export { updateUser, disableUser } from "./users"
  ✅ export { syncUserToFirestore } from "./users"

MODIFY:
  ⚠️  Update exports to reflect new function set
```

### Low Priority

**6. firebase.json**

```
KEEP:
  ✅ Existing Firebase config

CONSIDER:
  ⚠️  If functions/ directory is only for PIN auth, can delete entire dir
  ⚠️  If functions/ has other uses, keep it
```

---

## F. FILES TO KEEP (NO CHANGES)

```
✅ src/lib/firebase.ts
   (Firebase/Auth initialization - already correct)

✅ src/lib/school-content.tsx
   (Diary/exams sync to Firestore - working as-is)

✅ src/routes/admin/diary.tsx
   (Admin diary editor - compatible)

✅ src/routes/admin/exams.tsx
   (Admin exams editor - compatible)

✅ src/components/route-guard.tsx
   (Feature permission guard - compatible)

✅ src/lib/mock-data.ts
   (Test/demo data)

✅ .env.local
   (Firebase config)

✅ .firebaserc
   (Firebase project config)

✅ Existing CSS, components, utils
```

---

## G. EXACT IMPLEMENTATION ORDER

### Phase 1: Infrastructure Cleanup (2-3 hours)

1. Delete `functions/src/auth.ts`
2. Delete `functions/src/test-fixtures.ts`
3. Delete `functions/src/createUser.test.ts`
4. Update `functions/src/index.ts` (remove PIN exports)
5. Archive Phase 2A documentation files
6. Git commit: "Remove PIN infrastructure"

### Phase 2: Firestore Preparation (1-2 hours)

1. Create `/authorizedEmails` collection in Firestore (or use env config)
   ```
   Doc structure:
   {
     email: "teacher@school.com",
     name: "Teacher Name",
     role: "teacher",
     status: "active"
   }
   ```
   
2. Update `firestore.rules`:
   - Remove /userCredentials block
   - Simplify isUserActive() if needed
   - Add Rules for /authorizedEmails (admin-only read/write)
   
3. Deploy rules to staging (NOT production yet)

### Phase 3: Backend Function Update (1-2 hours)

1. Update `functions/src/users.ts`:
   - Create `syncUserToFirestore(user, authorizedRole, status)`
   - Check /authorizedEmails on first login
   - Create /users/{uid} if authorized
   
2. Add to `functions/src/index.ts` or keep in users.ts

### Phase 4: Frontend Login Refactor (3-4 hours)

1. Refactor `src/routes/index.tsx`:
   - Remove role selection cards
   - Remove PIN keypad
   - Keep Google button
   - Add loading state
   - Add error handling
   
2. Test login flow with staging Firestore

### Phase 5: Auth Store Refactor (3-4 hours)

1. Refactor `src/lib/access-store.tsx`:
   - Replace localStorage user array with Firestore listener
   - Remove PIN functions
   - Add /users document listener
   - Keep 19-feature permission system
   - Test role detection
   
2. Update `signInAsAdmin()` → Generic Google login

### Phase 6: Testing (2-3 hours)

1. **Local Testing:**
   - Google OAuth login with authorized email
   - Dashboard loads with correct role
   - Unauthorized email rejected
   - Disabled user rejected
   - Permission features show/hide correctly
   
2. **Staging Testing:**
   - All above + Firestore Rules enforcement
   - Diary read/write permissions
   - Admin panel access
   - Real-time role/status sync
   
3. **Fresh Incognito Test:**
   - Simulate new authorized user
   - Verify full flow works

### Phase 7: Production Deployment (1 hour)

1. Deploy Firestore Rules
2. Deploy Cloud Functions
3. Deploy frontend
4. Monitor for errors

---

## ADMIN AUTHORIZATION SETUP

### Option A: Firestore /authorizedEmails Collection

```
Pros: Flexible, real-time, admin can self-manage
Cons: Requires admin UI

Implementation:
  1. Create /authorizedEmails collection
  2. Add Firestore Rules (Admin only)
  3. Create admin UI to manage authorized users
  4. Check collection on user first login
```

### Option B: Environment Config (.env)

```
Pros: Simple, no DB overhead
Cons: Requires code change to add new authorized users

Implementation:
  1. Store in VITE_AUTHORIZED_USERS env var
  2. Parse on app init
  3. Check during login
  4. Can also check Firestore as fallback
```

### Option C: Hybrid (Recommended)

```
1. Initialize from .env (default)
2. Also check /authorizedEmails Firestore
3. Allows flexibility without code changes
4. Can migrate to self-serve admin UI later
```

---

## SECURITY ENFORCEMENT LAYERS

### Layer 1: Authorization Check (Google Login)

```
✅ User signs in with Google
✅ Check if email is in authorized list
✅ If not → Reject login
✅ If yes → Create /users/{uid}
```

### Layer 2: Firestore Rules (Read/Write)

```
✅ /users:{uid}.status must be "active" to read diary/exams
✅ Only admin can write diary/exams
✅ Only admin can modify /users documents
```

### Layer 3: Frontend Guards

```
✅ Can() helper checks permissions
✅ Route guards check role
✅ UI hides unauthorized features
```

### Layer 4: Backend Enforcement (Cloud Functions)

```
✅ Cloud Functions verify role before write
✅ Disabled users blocked at function entry
```

---

## NO WORKSPACE COMPLEXITY

- ❌ No /workspace_members collection
- ❌ No workspace invitations
- ❌ No currentWorkspaceId switching
- ❌ No multi-workspace logic

Single school assumption:
- All users are part of one school
- Admin authorizes users for that school
- Diary/exams are school-wide, not class-specific
- Future: Can add class/section scoping if needed

---

## SUMMARY

✅ **Architecture:** Single school, 4 roles, Google-only auth  
✅ **Onboarding:** Admin pre-authorizes email → User Google login → Auto-matched to role/status  
✅ **Permissions:** Keep Wafi's existing 19-feature system  
✅ **Security:** Firestore /users as source of truth, Rules enforce, no UI-only security  
✅ **Simplicity:** No workspace model, no invite system, no custom tokens  

---

**Status: READY FOR IMPLEMENTATION APPROVAL**

Next: User confirms plan → Begin Phase 1 (cleanup) → Proceed through Phases 2-7

