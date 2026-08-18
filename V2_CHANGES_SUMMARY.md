# Blueprint V2 - Summary of Major Changes

**Date:** August 17, 2026  
**From:** IMPLEMENTATION_BLUEPRINT.md  
**To:** REVISED_IMPLEMENTATION_BLUEPRINT_V2.md

---

## The 8 Corrections Applied

### ✅ Correction 1: Separate /userCredentials Collection

**BEFORE:** pinHash stored in `/users/{uid}` (client-readable via Firestore rules)
```json
/users/{uid}: {
  pinHash: "$2b$12$...",  // Exposed to client!
  pinFailedAttempts: 0,
  pinLockedUntil: null
}
```

**AFTER:** pinHash stored in separate `/userCredentials/{uid}` (admin SDK only)
```json
/users/{uid}: {
  // NO pinHash, NO pinFailedAttempts, NO pinLockedUntil
  // Only: uid, email, name, role, status, permissions, etc.
}

/userCredentials/{uid}: {  // Client cannot read this
  pinHash: "$2b$12$...",
  pinFailedAttempts: 0,
  pinLockedUntil: null
}
```

**Firestore Rules:**
```
/userCredentials/{uid}: allow read, write: if false;  // DENY ALL clients
```

**Why:** PIN hash must NEVER reach client browser, even for admins.

---

### ✅ Correction 2: Firebase Auth Created at User Creation

**BEFORE:** Firebase Auth account created on FIRST LOGIN
```
Timeline:
  1. Admin creates user (Firestore /users only)
  2. User logs in
  3. Cloud Function creates Firebase Auth account (late!)
```

**AFTER:** Firebase Auth account created IMMEDIATELY during createUser
```
Timeline:
  1. Admin creates user
  2. Cloud Function createUser:
     - Creates Firebase Auth account immediately
     - Creates /users/{uid} document
     - Creates /userCredentials/{uid} document
  3. User logs in (account already exists)
```

**Benefits:**
- ✅ Admin can disable user BEFORE first login
- ✅ Admin can reset PIN BEFORE first login
- ✅ Every user has stable Firebase UID from creation
- ✅ Simpler pinLogin flow (no need to create auth)

---

### ✅ Correction 3: Disable Enforcement in Rules + Code

**BEFORE:** Relied on Firestore realtime listener for security
```
If admin disables user:
  1. Update /users/{uid}: status = "disabled"
  2. Firestore listener fires (up to 500ms delay)
  3. UI detects disabled status
  4. But user could still use old token!
```

**AFTER:** Two independent enforcement layers
```
If admin disables user:
  1. Update /users/{uid}: status = "disabled"
  2. Update Firebase Auth: auth.updateUser(uid, { disabled: true })
  3. Firestore rules check status="active"
  4. Firebase Auth rejects authentication

Multiple protections:
  ✅ Authentication layer: Firebase Auth.disabled (hard stop)
  ✅ Authorization layer: Firestore rules check status="active"
  ✅ UI layer: Realtime listener notifies immediately
  ✅ No single point of failure
```

---

### ✅ Correction 4: Custom Claims Staleness Risk

**BEFORE:** Relied on Firebase Auth custom claims for role/permissions
```typescript
// Custom token issued with role
{
  role: "student",
  email: "wafi@..."
}

// Problem: Claims don't update until token refresh
// If admin changes role, user won't see it until new token
```

**AFTER:** Firestore /users remains source of truth
```typescript
// Custom token has minimal claims (just role for initial check)
{
  role: "student"
}

// Real source of truth: /users/{uid} document
{
  role: "student",
  permissions: ["dashboard", "study", ...],
  status: "active"
}

// Firestore listener keeps in sync (real-time)
// If admin changes role, UI updates < 500ms
```

---

### ✅ Correction 5: Safe Unauthenticated Login Screen Function

**BEFORE:** Login screen had to know which users exist but no safe way

**AFTER:** New Cloud Function `getLoginUsers` (unauthenticated)
```
GET /api/auth/login-users

Response:
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

NEVER returns:
  ✗ pinHash
  ✗ pinFailedAttempts
  ✗ createdBy
  ✗ permissions
  ✗ Any sensitive data
```

**Why:** Login screen is public, but returned data is safe (non-sensitive)

---

### ✅ Correction 6: Removed Unused Function

**BEFORE:** `validateCustomToken` endpoint included

**AFTER:** Deleted because:
- ❌ No concrete production use case
- ❌ Client can detect expired token directly
- ❌ Unnecessary attack surface
- ❌ Reduces complexity

---

### ✅ Correction 7: Verify Diary/Exams Rules

**BEFORE:** Proposed to change diary/exams rules

**CURRENT BEHAVIOR (verified):**
```
/diary: 
  - allow read: if true  (EVERYONE can read)
  - allow write: if email == "rockyhsn9@gmail.com" (admin only)

/exams:
  - (Same pattern as diary)
```

**AFTER:** PRESERVE existing rules exactly
```
/diary:
  - allow read: if request.auth != null  (authenticated users only)
  - allow write: if email == "rockyhsn9@gmail.com"

/exams:
  - (Same)
```

**Change:** Add `request.auth != null` to preserve security but require auth.

---

### ✅ Correction 8: Recalculated Migration with New Auth Lifecycle

**BEFORE:** Migration waited until first login to create Firebase Auth

**AFTER (Revised Steps):**

```
Step 1: Deploy Cloud Functions
Step 2: Create Rocky's /users document (already has Google auth)
Step 3: For each PIN user (Afreen, Wafi, Tahsin):
  - Call Cloud Function createUser
  - Function creates Firebase Auth immediately
  - Function creates /users/{uid}
  - Function creates /userCredentials/{uid}
  - All 3 complete before user logs in
Step 4: Deploy Firestore rules
Step 5: Deploy frontend code
Step 6: Test & verify all 4 users can log in
```

---

## Architecture Comparison: V1 → V2

### Firestore Collections

| Collection | V1 | V2 | Change |
|-----------|----|----|--------|
| `/users/{uid}` | Includes pinHash | No pinHash | SECURE |
| `/userCredentials/{uid}` | N/A | Includes pinHash | NEW (locked down) |
| `/diary/{id}` | Preserve | Preserve | SAME |
| `/exams/{id}` | Preserve | Preserve | SAME |

### Cloud Functions

| Function | V1 | V2 | Change |
|----------|----|----|--------|
| createUser | Create /users only | Create Auth + /users + /credentials | EXPANDED |
| pinLogin | Create auth + token | Just verify + token | SIMPLIFIED |
| getLoginUsers | N/A | NEW (unauthenticated) | NEW |
| validateCustomToken | Included | DELETED | REMOVED |
| disableUser | Yes | Yes (now enforces via Auth + rules) | ENHANCED |

### Auth Lifecycle

| Stage | V1 | V2 | Change |
|-------|----|----|--------|
| User Creation | Firestore only | Firestore + Firebase Auth | EARLIER |
| First Login | Auth created | Auth already exists | SIMPLER |
| Account Disable | Listener only | Auth + rules + listener | STRONGER |
| PIN Change | Update /users | Update /userCredentials | SECURE |

### Security

| Aspect | V1 | V2 | Change |
|--------|----|----|--------|
| PIN Storage | /users doc | /userCredentials (locked) | MORE SECURE |
| PIN Access | Client can read | Client cannot read | MORE SECURE |
| Account Disable | UI listener | Auth + rules + listener | MORE SECURE |
| Brute-force State | /users doc | /userCredentials (locked) | MORE SECURE |
| Source of Truth | Mixed | Firestore (clear) | CLEARER |

---

## Files Affected

### Frontend Changes

| File | V1 Change | V2 Change | Impact |
|------|-----------|-----------|--------|
| access-store.tsx | Major | SAME | HIGH |
| index.tsx | Major | SAME (+ getLoginUsers) | HIGH |
| admin/$userId.tsx | Moderate | SAME | MEDIUM |
| school-content.tsx | Verify only | SAME | LOW |
| route-guard.tsx | Verify only | SAME | LOW |

### Cloud Functions

| Function | V1 | V2 | Impact |
|----------|----|----|--------|
| Count | 6 | 6 | SAME |
| Complexity | Medium | Medium-High | +1 (separate credentials) |
| Security | Good | Better | Improved |

### Configuration

| File | V1 | V2 | Impact |
|------|----|----|--------|
| firestore.rules | Add 4 collections | Add 5 collections (+ credentials) | +1 |
| .env.local | N/A | SAME | NONE |

---

## Timeline Impact

```
V1 Estimate: 3-4 days implementation
V2 Estimate: 4-5 days implementation

Additional time needed for:
  + Separate /userCredentials collection (+ 8 hours)
  + Dual enforcement layer testing (+ 4 hours)
  + Firestore rules validation (+ 2 hours)
  
Total: +14 hours (~2 days)
```

---

## Rollback Complexity

```
V1 Rollback: Simple (3 steps)
  1. Revert code
  2. Disable functions
  3. Restore localStorage

V2 Rollback: Slightly more complex (4 steps)
  1. Revert code
  2. Disable functions
  3. Delete /userCredentials collection
  4. Restore localStorage

Still < 30 minutes total
```

---

## Approval Checklist

### Architecture (Gate 1)

```
[ ] Separate /userCredentials collection is secure
[ ] Firebase Auth creation at user-create time makes sense
[ ] Dual enforcement (rules + auth) is better than listener only
[ ] Custom claims risk mitigation is acceptable
[ ] Safe getLoginUsers function is appropriate
[ ] Removing validateCustomToken is acceptable
[ ] Preserving diary/exams behavior is correct
[ ] Revised migration procedure is clear
```

### If any "No"
Please specify which correction needs revision.

---

## Next Action

📋 **Review this V2 summary**

Then either:
1. ✅ **Approve** → Proceed to implementation
2. 🔄 **Request changes** → Specify which corrections need adjustment
3. ❓ **Ask questions** → About any aspect

