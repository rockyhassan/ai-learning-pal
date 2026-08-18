# Implementation Blueprint - Quick Reference
## Firebase Custom Tokens + Firestore /users Collection

**Status:** ✅ DESIGN COMPLETE - READY FOR REVIEW  
**Date:** August 17, 2026

---

## Architecture At a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ADMIN (Rocky)              PIN USERS (Afreen, Wafi, Tahsin) │
│  ─────────────              ────────────────────────────────  │
│                                                               │
│  Google OAuth ──→  ┌─────────────────────────────────────┐  │
│                    │     Cloud Function: pinLogin         │  │
│                    │  ✓ Verify PIN (bcrypt)              │  │
│                    │  ✓ Check status                      │  │
│                    │  ✓ Brute-force protection           │  │
│                    │  ✓ Create custom token              │  │
│                    └─────────────────────────────────────┘  │
│                                  ↓                           │
│                    ┌─────────────────────────────────────┐  │
│                    │   Firebase Auth Custom Token        │  │
│                    │   (signed JWT with role + email)    │  │
│                    └─────────────────────────────────────┘  │
│                                  ↓                           │
│                    ┌─────────────────────────────────────┐  │
│                    │   Frontend: signInWithCustomToken   │  │
│                    │   → Firebase Auth Session           │  │
│                    │   → Firestore Listeners Attach      │  │
│                    └─────────────────────────────────────┘  │
│                                  ↓                           │
│                    ┌─────────────────────────────────────┐  │
│                    │   Firestore /users/{uid}           │  │
│                    │   ✓ User data (name, role)         │  │
│                    │   ✓ Permissions (features)         │  │
│                    │   ✓ Status (active/disabled)       │  │
│                    │   ✓ Real-time sync to all clients  │  │
│                    └─────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Cloud Functions (Serverless Backend)

| Function | Purpose | Trigger |
|----------|---------|---------|
| `pinLogin` | Verify PIN + issue custom token | HTTP POST |
| `resetPin` | Generate new PIN | HTTP PUT |
| `createUser` | Admin creates user | HTTP POST |
| `updateUser` | Admin updates user | HTTP PUT |
| `disableUser` | Admin disable/enable | HTTP PUT |

### 2. Firestore Schema

**Collection:** `/users/{firebaseUid}`

```
{
  uid: string                    // Primary key
  email: string                  // Login field
  name: string                   // Display name
  role: "admin"|"student"|...    // Authorization
  status: "active"|"disabled"    // Account state
  pinHash: string                // bcrypt (admin-only read)
  permissions: [string]          // Features array
  authMethod: "google"|"pin"     // How they auth
  createdAt: timestamp           // Audit
  updatedAt: timestamp           // Audit
}
```

### 3. Security Rules

```
/users/{uid}:
  ✓ User can read own document
  ✓ Admin can read all
  ✓ Only admin can write
  ✓ Never delete (soft delete only)

/diary & /exams:
  ✓ Admin can read/write all
  ✓ Students can read own
  ✓ Teachers can read own
```

### 4. Migration Path

```
localStorage             →        Firestore
────────────────────────────────────────────
wafi.users-access        →        /users/{uid}
  [4 users with PIN]                [same 4 users]
                                    pinHash: bcrypt
                                    
wafi.session.email       →        Firebase Auth
  (single email)                   (session state)
```

---

## Changes Summary

### ✅ WHAT CHANGES

| What | From | To |
|------|------|-----|
| **User Storage** | localStorage JSON | Firestore documents |
| **PIN Storage** | plaintext | bcrypt hash |
| **Auth System** | Firebase Auth (admin only) | Firebase Auth (everyone) |
| **Session** | localStorage email string | Firebase Auth object |
| **PIN Verification** | Client-side comparison | Server-side bcrypt |
| **Account Revocation** | Client status check | Firebase Auth disable |

### ✅ WHAT STAYS

| What | Why |
|------|-----|
| **Admin Google Login** | Unchanged OAuth flow |
| **4 Existing Users** | Migrate with same roles |
| **Diary & Exams** | Continue working, no changes |
| **Login UI/UX** | Role cards → keypad → auto-submit |
| **Feature Access** | Role-based permissions (now from Firestore) |
| **Offline Support** | Cache + sync pattern continues |

---

## Critical Verification Checklist

```
BEFORE PRODUCTION DEPLOYMENT:

Cloud Functions:
  ☐ pinLogin returns token for correct PIN
  ☐ pinLogin returns 401 for incorrect PIN
  ☐ Brute-force lock after 5 failed attempts
  ☐ resetPin creates new PIN hash
  ☐ createUser stores bcrypt hash correctly
  ☐ disableUser revokes session immediately

Migration:
  ☐ All 4 users in Firestore /users/{uid}
  ☐ PIN hashes created from existing PINs
  ☐ Permissions match original (Rocky=20, Afreen=10, Wafi=15, Tahsin=10)
  ☐ Emails match original exactly

Authentication:
  ☐ Admin (Rocky) Google login works
  ☐ New user PIN login works from incognito
  ☐ Existing users (Afreen, Wafi, Tahsin) PIN login works
  ☐ Auth persists across page reload

Authorization:
  ☐ Student sees 15 features only
  ☐ Parent sees 10 features only
  ☐ Teacher sees 10 features only
  ☐ Admin sees 20 features
  ☐ Firestore rules enforce access

Real-time Sync:
  ☐ Admin updates user, other devices see immediately
  ☐ Admin disables user, user's session revoked immediately
  ☐ Firestore listeners working correctly

Firestore Rules:
  ☐ Deploy without errors
  ☐ Admin can read all users
  ☐ User can read own user only
  ☐ Non-admin cannot read others

Diary & Exams:
  ☐ Admin can add diary entries
  ☐ Students can view diary
  ☐ Firestore sync working
  ☐ localStorage fallback working

Offline & Persistence:
  ☐ App works offline with cached data
  ☐ User remains logged in after reload
  ☐ Listeners re-attach on connectivity
```

---

## Files to Modify

### Frontend (5 files)

| File | Change | Lines |
|------|--------|-------|
| `access-store.tsx` | Complete restructure | ~400 |
| `index.tsx` | PIN flow to Cloud Function | ~50 |
| `admin/$userId.tsx` | Admin ops to Cloud Functions | ~100 |
| `school-content.tsx` | Verify (no change expected) | 0 |
| `route-guard.tsx` | Verify (no change expected) | 0 |

### Cloud Functions (4 files - NEW)

| File | Purpose |
|------|---------|
| `functions/src/auth.ts` | pinLogin, resetPin |
| `functions/src/users.ts` | createUser, updateUser, disableUser |
| `functions/src/index.ts` | Export functions |
| `functions/package.json` | Dependencies |

### Config (1 file)

| File | Change |
|------|--------|
| `firestore.rules` | Add /users collection rules |

---

## Rollback Plan

```
IF Critical Issue Found:

IMMEDIATE (< 30 min):
  1. Revert frontend code
  2. Disable Cloud Functions
  3. Restore localStorage backup
  4. Users can log in via old path

FULL RECOVERY:
  1. Delete /users collection
  2. Delete new Firebase Auth accounts
  3. Restore localStorage completely
  4. Restart deployment when ready
```

---

## Key Decisions Explained

### Why Cloud Functions?

```
PIN verification MUST be server-side because:
  ✗ Never expose PIN to client
  ✗ Never send PIN over network
  ✗ Brute-force protection must be server-side
  ✗ bcrypt verification cannot be client-side
  ✓ Cloud Function = serverless backend (no extra infra)
```

### Why Custom Tokens?

```
Firebase Auth custom tokens provide:
  ✓ Familiar Firebase Auth API for frontend
  ✓ Built-in session management
  ✓ Real-time listener integration
  ✓ No separate JWT system needed
  ✓ Automatic token refresh
  ✓ No additional complexity
```

### Why Firestore /users Collection?

```
Single source of truth for user data:
  ✓ Persistence (no local storage dependency)
  ✓ Real-time sync (changes propagate immediately)
  ✓ Access control (Firestore rules)
  ✓ Audit trail (timestamps, createdBy)
  ✓ Scalability (no localStorage limits)
  ✓ Admin management (easy to create/modify users)
```

### Why Firestore Listeners for Revocation?

```
Two independent layers:
  
  1. Firebase Auth Disable (hard limit)
     - Backend enforces account is disabled
     - Session cannot be obtained
     - Immediate effect for new logins
  
  2. Firestore Listener (fast UI response)
     - Monitors /users.status in real-time
     - Revokes UI immediately on change
     - < 500ms latency for user experience
     - Redundant: auth disable is the actual security
```

---

## Deployment Checklist

```
BEFORE GOING LIVE:

Staging Environment:
  ☐ Deploy Cloud Functions to staging
  ☐ Run all tests in staging
  ☐ Test incognito verification procedure
  ☐ Test rollback procedure
  ☐ Verify 4 existing users work
  ☐ Create test user, verify fresh login
  ☐ Monitor logs for 24 hours

Production Deployment:
  ☐ Backup all data (Firestore, localStorage)
  ☐ Notify users (maintenance window if needed)
  ☐ Deploy Cloud Functions (production)
  ☐ Deploy Firestore rules
  ☐ Deploy frontend code
  ☐ Verify logins work
  ☐ Monitor errors for 24 hours
  ☐ Keep rollback plan active for 48 hours
  ☐ Gradual disable of localStorage backup code

Post-Deployment:
  ☐ Delete localStorage user data (after 1 week)
  ☐ Archive old code branch
  ☐ Update documentation
  ☐ Record lessons learned
```

---

## Timeline Estimate

```
If approved today (Aug 17, 2026):

Phase 1: Implementation (3-4 days)
  Day 1: Cloud Functions development + testing
  Day 2: Frontend code changes
  Day 3: Integration testing
  Day 4: Staging verification

Phase 2: Deployment (1 day)
  Day 5: Production deployment
  Day 5: Monitoring

Phase 3: Cleanup (1 week)
  Week 2: Delete old localStorage code
  Week 2: Archive old implementation
  Week 2: Documentation

Total: ~1 week implementation + monitoring
```

---

## Approval Gates

```
✅ GATE 1: This Blueprint Review
   - Stakeholder approval of architecture
   - Confirmation of approach (custom tokens)
   - Sign-off on timeline

✅ GATE 2: Staging Verification
   - All verifications pass in staging
   - Rollback procedure tested and working
   - No critical issues found

✅ GATE 3: Production Approval
   - Ready for production deployment
   - On-call support identified
   - Rollback plan confirmed
```

---

**Status:** 🟡 AWAITING FINAL APPROVAL  
**Action:** Review blueprint, request changes, or approve  
**Next:** Implementation begins after approval

