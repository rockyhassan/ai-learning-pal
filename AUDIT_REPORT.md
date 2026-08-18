# Learning Buddy App - User/Auth Architecture Audit Report
**Date:** August 17, 2026  
**Status:** Current Production (localStorage-based)  
**Next Step:** Planned Firebase Migration

---

## Executive Summary

The Learning Buddy app currently uses a **lightweight localStorage-based authentication system** with Firebase available for admin Google Sign-In. The system supports 4 user roles (Student, Parent, Teacher, Admin), PIN-based login, and role-specific feature permissions.

**Current State:** ✅ Functional but not scalable for multi-device/real backend
**Data Loss Risk:** ⚠️ Data stored only in browser localStorage (lost on browser clear or new device)
**Security:** ⚠️ PINs are 4 random digits, no email verification, no password policy

---

## 1. Current Architecture Overview

### 1.1 Storage Layer
```
┌─────────────────────────────────────┐
│   localStorage (Browser-only)       │
├─────────────────────────────────────┤
│ wafi.users-access      → All users  │
│ wafi.session.email     → Current    │
│ wafi.lang              → Settings   │
│ wafi.dark              → Settings   │
└─────────────────────────────────────┘
```

**Key Points:**
- All data persisted via `access-store.tsx` when users array changes
- No server-side storage; data lost if user clears browser cache
- Email is the unique identifier across the system
- No database tables; pure in-memory JSON

### 1.2 User Data Model

```typescript
// Complete AccessUser schema
{
  id: string                    // Unique: "u-${timestamp}" or "u-firebase-admin"
  name: string                  // Display name (no length validation)
  email: string                 // Unique login identifier (case-insensitive comparison)
  role: "student" | "parent" | "teacher" | "admin"
  status: "active" | "invited" | "disabled"
  permissions: FeatureKey[]     // Array of 19 possible features
  pin: string                   // 4-digit numeric string (e.g., "1234")
}
```

**19 Available Features:**
- **Student (15):** dashboard, study, homework, ai-teacher, scan, vocabulary, pronunciation, question-bank, practice, games, progress, planner, notifications, documents, achievements
- **Parent (10):** dashboard, parent-mode, progress, homework, planner, notifications, documents, achievements, ai-memory, school-profile
- **Teacher (10):** dashboard, study, homework, question-bank, practice, progress, planner, notifications, documents, school-profile
- **Admin (19):** All features

---

## 2. Authentication Flows - Detailed Analysis

### 2.1 PIN-Based Login (Student/Parent/Teacher)
**File:** `src/lib/access-store.tsx` (lines 297-305)  
**UI File:** `src/routes/index.tsx`

```
User selects role
    ↓
UI displays available users for that role
    ↓
User enters 4-digit PIN via numeric keypad
    ↓
signIn(email, pin) called
    ↓
Access-store logic:
  1. Find user by email (case-insensitive)
  2. Verify status ≠ "disabled"
  3. Verify PIN matches exactly
  4. Set localStorage.wafi.session.email = email
  5. Trigger currentUser recompute
    ↓
Success → Auto-redirect to /dashboard
Failure → Show error message (not-found | disabled | invalid-pin)
```

**Risk Analysis:**
- ✅ Simple, works offline
- ⚠️ PIN stored in plain text in localStorage
- ⚠️ PIN is only 4 digits (10,000 possible combinations)
- ⚠️ No rate limiting on PIN attempts
- ⚠️ Users array visible to all users (via browser DevTools)

### 2.2 Google Admin Sign-In (Firebase)
**File:** `src/lib/access-store.tsx` (lines 380-412)  
**Firebase Setup:** `src/lib/firebase.ts`

```
Admin clicks lock icon on login
    ↓
signInAsAdmin() triggered
    ↓
Firebase Google OAuth popup shown
    ↓
After Google authentication:
  1. Verify email === VITE_FIREBASE_ADMIN_EMAIL (case-insensitive)
  2. If mismatch: Auto sign-out via Firebase
  3. If match: Set localStorage.wafi.session.email = email
    ↓
Firebase onAuthStateChanged listener fires:
  1. Detects authenticated user
  2. Creates admin user in localStorage if not exists
  3. Sets email to sync with currentUser
    ↓
Success → Auto-redirect to /dashboard
```

**Firebase Configuration Used:**
- `browserLocalPersistence` (stores in localStorage)
- Google Sign-In with popup (`prompt: "select_account"`)
- Email verification against `VITE_FIREBASE_ADMIN_EMAIL`

**Risk Analysis:**
- ✅ Leverages Firebase for auth validation
- ✅ Email whitelist protection
- ⚠️ Admin user still stored in localStorage
- ⚠️ Cross-tab sync only works via localStorage (Firebase sign-out not reflected instantly)

### 2.3 Session Management

**Session Lifecycle:**

```
App Load:
  1. useEffect reads localStorage.wafi.session.email
  2. Sets email state (line 220-226)
  3. Sets authReady = true
  4. currentUser useMemo finds user by email

Ongoing:
  1. currentUser always synced with email state
  2. RouteGuard checks currentUser for access
  3. changes to users array → localStorage persisted → other tabs see update (via storage event listener? No—only same tab)

Sign Out:
  1. Remove localStorage.wafi.session.email
  2. Set email state = null
  3. currentUser = null
  4. RouteGuard redirects to /login
  5. Firebase auth object remains (not cleared)
```

**Cross-Tab Behavior:**
- ⚠️ No cross-tab session sync currently implemented
- localStorage changes in one tab trigger `storage` event in other tabs, but not utilized
- Each tab has independent session email

---

## 3. Admin Invite System

**File:** `src/lib/access-store.tsx` (lines 315-328)  
**UI:** `src/routes/admin/index.tsx`

### 3.1 Invite Flow
```
Admin fills form:
  - Name (text input)
  - Email (text input, no validation)
  - Role (dropdown: student|parent|teacher)
    ↓
Admin clicks "Send invite"
    ↓
invite(input) function:
  1. Generate PIN: Math.floor(1000 + Math.random() * 8000).toString()
  2. Create AccessUser:
     - id: "u-${Date.now()}"
     - status: "active" (not "invited")
     - permissions: rolePresets[role]
     - pin: generated PIN
  3. Add to users array
  4. Persist to localStorage
    ↓
Success → Admin sees confirmation
         Admin manually communicates PIN to user
         (No email sending logic)
```

### 3.2 Invite System Issues
- ❌ **No actual email delivery:** PIN must be communicated manually
- ❌ **No uniqueness validation:** Can create multiple users with same email
- ❌ **Status inconsistency:** Users created with `status: "active"` despite naming suggestion of "invited"
- ❌ **PIN collision unlikely but not prevented:** 10,000 combinations, random generator
- ❌ **No expiration:** Invites never expire

---

## 4. Role & Permission System

**File:** `src/lib/access-store.tsx` (lines 83-102)

### 4.1 Permission Model

**Static Role Presets:**
```typescript
const rolePresets: Record<AccessUser['role'], FeatureKey[]> = {
  student: [19 features],
  parent: [10 features],
  teacher: [10 features],
  admin: [19 features - all]
}
```

**Permission Check:**
```typescript
function can(feature: FeatureKey): boolean {
  return currentUser?.permissions.includes(feature) && 
         currentUser?.status !== "disabled";
}
```

**Route-to-Feature Mapping** (`src/lib/route-access.ts`):
- `/admin/*` → `"admin"` feature
- `/homework/*` → `"homework"` feature
- `/ai-teacher/*` → `"ai-teacher"` feature
- etc. (19 total mappings)

### 4.2 Permission Enforcement Points

| Location | Check | Behavior |
|----------|-------|----------|
| RouteGuard (lines 28-51) | Feature access | Deny/redirect if feature ∉ permissions |
| Dashboard links (routes) | Feature access | Hide link if feature not in permissions |
| Admin edit page | Role change | Reset permissions to new role preset |
| Access-store | Status check | Block all access if status === "disabled" |

**Risk Analysis:**
- ✅ Consistent permission model across app
- ⚠️ Role can only be one of 4 presets; no custom granularity
- ⚠️ Changing role resets all custom permissions (if any were added)
- ⚠️ Permission array on client-side; can be modified via DevTools

---

## 5. User Management (Admin Dashboard)

**Files:**
- `src/routes/admin/index.tsx` - Invite UI
- `src/routes/admin/$userId.tsx` - User edit page

### 5.1 Available Admin Operations

| Operation | Function | Behavior |
|-----------|----------|----------|
| **Invite User** | `invite()` | Create new user with PIN, auto-active |
| **Edit User** | UI update → `updateUser()` | Change name, role, permissions |
| **Reset PIN** | `resetPIN(userId)` | Generate new 4-digit PIN, show for 5 sec |
| **Change PIN** | `updateUserPin(userId, newPin)` | Requires 2x entry for confirmation |
| **Disable User** | `updateUser()` + status="disabled" | Blocks all access |
| **Delete User** | Remove from array | Permanent deletion |

### 5.2 Edit User Page Details

**Available Changes:**
- Name ✏️
- Role (dropdown) → Resets permissions to new role preset
- Individual feature permissions (checkboxes for all 19 features)
- PIN reset / change
- Status (active/disabled)
- Delete user

**No Validation:**
- Empty name allowed
- Role can be changed at any time
- Custom permissions overridden on role change
- No audit log of changes

---

## 6. Firebase Integration (Current)

**File:** `src/lib/firebase.ts`

### 6.1 What's Using Firebase

```
✅ Firebase Auth (Admin Google Sign-In)
✅ Firebase Admin Verification (email whitelist check)
⚠️ Firestore (referenced in other modules, not for auth)
❌ Firebase Realtime Database (not used)
❌ Firebase Cloud Functions (not used)
❌ Firebase Rules (no custom security rules)
```

### 6.2 Firebase Configuration

```typescript
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialization
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
```

**Environment Variables Required:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_ADMIN_EMAIL` (for admin whitelist)

### 6.3 Current Firebase Usage Points

**Authentication:**
- `signInWithPopup()` - Google Sign-In for admin
- `onAuthStateChanged()` - Admin detection on app load
- `signOut()` - Sign-out user after email mismatch

**Firestore:**
- Used in other modules (not audit scope) for storing content, lessons, etc.

---

## 7. Security Analysis

### 7.1 Vulnerabilities & Risks

| Risk | Severity | Description | Impact |
|------|----------|-------------|--------|
| **PIN Exposure** | 🔴 High | 4-digit PINs in plain localStorage | Brute-force attacks possible |
| **Data Loss** | 🔴 High | No server backup; lost on browser clear | Complete data loss per device |
| **Client-Side Auth** | 🔴 High | All auth logic runs on client | Can be bypassed via DevTools |
| **No Email Verification** | 🟡 Medium | Admin invites don't verify email exists | Typos create orphaned users |
| **Cross-Tab Sync** | 🟡 Medium | No sync of sessions across tabs | Inconsistent state possible |
| **No Rate Limiting** | 🟡 Medium | Unlimited PIN attempts | Brute-force attacks |
| **No Audit Log** | 🟡 Medium | No record of auth events | Can't trace compromises |
| **Plaintext PIN Storage** | 🟡 Medium | localStorage readable by any JS | XSS can extract credentials |
| **No Session Timeout** | 🟢 Low | Sessions never expire | Compromised device stays active |
| **No 2FA** | 🟢 Low | No multi-factor authentication | Single point of failure |

### 7.2 Data Privacy Concerns

- ✅ User data stored locally only; no direct external transmission
- ⚠️ Firestore stores user data; requires security rules
- ⚠️ Google OAuth leaks email to admin email whitelist
- ⚠️ No encryption of localStorage data

### 7.3 Compliance & Standards

| Standard | Status |
|----------|--------|
| GDPR (Data Retention) | ❌ No deletion policy |
| COPPA (Student Privacy) | ⚠️ Minimal checks; PIN shared with parents |
| WCAG (Accessibility) | ✅ Uses Radix UI (accessible primitives) |
| SOC 2 | ⚠️ No audit logs, no encryption |

---

## 8. Route Protection & Access Control

**File:** `src/components/route-guard.tsx`

### 8.1 Protection Mechanism

```
PublicRoutes (no auth needed):
  /, /login, /signup, /student-setup

SessionRoutes (any logged-in user):
  /profile, /settings

FeatureGatedRoutes (login + specific feature):
  /admin, /homework, /ai-teacher, /study, etc.

Access Decision Flow:
  1. Is route public? → Allow
  2. Is user logged in? → Check features
  3. Does user have feature? → Check status
  4. Is status ≠ "disabled"? → Allow
  5. Otherwise → Deny (redirect to login or show error)
```

### 8.2 Route-to-Feature Mapping

```typescript
// From route-access.ts
const routeFeatureMap = {
  '/admin': 'admin',
  '/homework': 'homework',
  '/ai-teacher': 'ai-teacher',
  '/scan': 'scan',
  '/vocabulary': 'vocabulary',
  '/pronunciation': 'pronunciation',
  '/question-bank': 'question-bank',
  '/practice': 'practice',
  '/games': 'games',
  '/progress': 'progress',
  '/planner': 'planner',
  '/notifications': 'notifications',
  '/documents': 'documents',
  '/achievements': 'achievements',
  '/parent-mode': 'parent-mode',
  '/study': 'study',
  '/school-profile': 'school-profile',
  '/ai-memory': 'ai-memory',
};
```

### 8.3 Enforcement Points

| Location | Type | Effect |
|----------|------|--------|
| RouteGuard | Hard block | Prevents component render |
| Dashboard links | Soft hide | Hides UI but doesn't prevent direct nav |
| Admin pages | Hard block | Can't edit users of other roles unless admin |

**Gap:** Direct URL access (e.g., `/homework`) bypasses some checks if RouteGuard not fully enforced

---

## 9. Current Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client-Side                    │
│                                                              │
│  ┌─────────────────────┐      ┌──────────────────────┐     │
│  │  Login Page UI      │      │  Dashboard / Routes  │     │
│  │  (role selector)    │      │  (protected by       │     │
│  │  (PIN keypad)       │      │   RouteGuard)        │     │
│  │  (Google Admin)     │      │                      │     │
│  └─────────┬───────────┘      └──────────┬───────────┘     │
│            │                             │                 │
│            │ signIn(email, pin)          │ reads           │
│            │ signInAsAdmin()             │ currentUser     │
│            │                             │                 │
│            └──────────────┬──────────────┘                 │
│                           │                                │
│          ┌────────────────▼──────────────┐                │
│          │   access-store.tsx            │                │
│          │   (Auth Context Provider)     │                │
│          │                               │                │
│          │  - signIn()                   │                │
│          │  - signOut()                  │                │
│          │  - invite()                   │                │
│          │  - can(feature)               │                │
│          │  - currentUser getter         │                │
│          │  - users array state          │                │
│          │                               │                │
│          │  Firebase listener            │                │
│          │  onAuthStateChanged()         │                │
│          └────────────────┬──────────────┘                │
│                           │                                │
│          ┌────────────────▼──────────────┐                │
│          │   localStorage                 │                │
│          │   wafi.users-access           │                │
│          │   wafi.session.email          │                │
│          │   wafi.lang / wafi.dark       │                │
│          └────────────────┬──────────────┘                │
│                           │                                │
│                   (persisted in                            │
│                    browser cache)                          │
│                                                              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ (Firebase Auth calls)
                               │ (Google OAuth popup)
                               │
                    ┌──────────▼──────────┐
                    │  Firebase / Google  │
                    │  (Admin Only)       │
                    │                    │
                    │  - Google OAuth    │
                    │  - Email verify    │
                    │  - Auth state mgmt │
                    └────────────────────┘
```

---

## 10. Critical Files Reference

| File | Lines | Purpose | Type |
|------|-------|---------|------|
| `src/lib/access-store.tsx` | 1-412 | Main auth context, all logic | Core |
| `src/lib/admin-auth.ts` | 1-30 | Firebase admin helpers | Core |
| `src/lib/firebase.ts` | 1-30 | Firebase initialization | Core |
| `src/lib/route-access.ts` | 1-26 | Route-to-feature mapping | Config |
| `src/lib/app-state.tsx` | - | Language & dark mode | Secondary |
| `src/components/route-guard.tsx` | 1-80 | Route protection logic | Core |
| `src/routes/index.tsx` | - | Login page UI | UI |
| `src/routes/admin/index.tsx` | - | Admin invite panel | UI |
| `src/routes/admin/$userId.tsx` | - | Admin user edit | UI |
| `src/types/index.ts` | - | TypeScript types (AccessUser, FeatureKey) | Types |

---

## 11. Data Persistence & Sync

### 11.1 Current Persistence Strategy

```
Users Array → localStorage write
              └─→ JSON.stringify
                  └─→ "wafi.users-access"

Session Email → localStorage write
                 └─→ "wafi.session.email"

App Load → localStorage read
           └─→ JSON.parse
               └─→ Hydrate access-store
```

**Trigger Points:**
- New user created (via invite)
- User updates (name, role, permissions, status)
- User deleted
- PIN changed/reset
- Session email set (login)
- Session email cleared (logout)

### 11.2 Multi-Tab Behavior

- ✅ Same tab: All changes instant
- ❌ Other tabs: No automatic sync
  - localStorage changes DON'T trigger update in other tabs
  - Each tab has independent session state
  - If user logs out in Tab A, Tab B still shows as logged in

---

## 12. Summary of Existing Limitations

| Category | Limitation |
|----------|------------|
| **Scalability** | Cannot support users across multiple devices |
| **Data Durability** | Lost on browser cache clear |
| **Real-time Sync** | No multi-device or multi-tab synchronization |
| **Server Validation** | All logic client-side; can be bypassed |
| **Email Verification** | Invites never validated |
| **Rate Limiting** | No protection against brute-force attacks |
| **Audit Trail** | No logging of auth events |
| **Offline Support** | Only for already-logged-in users |
| **Password Recovery** | No recovery mechanism (PIN only) |
| **Session Management** | No expiration, no timeout |
| **2FA/MFA** | Not supported |
| **Device Fingerprinting** | Not implemented |
| **API Security** | No backend API; all operations client-side |

---

## Conclusion

**Current System Status:** ✅ Functional for single-device, demo/internal use only

**Production Readiness:** ❌ Not suitable for real, multi-user production deployment

**Key Blockers for Real Users:**
1. No data persistence across devices/browsers
2. No server-side auth validation (can be faked)
3. No recovery mechanism if PIN forgotten
4. No audit trail for compliance
5. No rate limiting or brute-force protection

---

**Next Step:** See `FIREBASE_MIGRATION_STRATEGY.md` for recommended architecture.
