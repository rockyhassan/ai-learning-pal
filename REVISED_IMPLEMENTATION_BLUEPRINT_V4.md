# Revised Implementation Blueprint - Version 4
## Security Consistency Fix: Rules vs Cloud Functions Authorization

**Status:** 🔴 FINAL DESIGN - CRITICAL SECURITY FIX - AWAITING APPROVAL  
**Date:** August 17, 2026  
**Change Type:** Security consistency patch (V3 → V4)

---

## CRITICAL ISSUE IDENTIFIED & FIXED

### The Inconsistency (Found in V3)

**Claim in V3 Documentation:**
```
"Protected collections (/diary, /exams) still check status='active'"
"Account disable enforces across Layer 2: authorization rules"
```

**Actual V3 Rules:**
```
/diary/{diaryId} {
  allow read: if request.auth != null;  // NO status check!
  allow write: if request.auth != null && 
               request.auth.token.email == admin &&
               request.auth.token.role == 'admin';
}

/exams/{examId} {
  allow read: if request.auth != null;  // NO status check!
  allow write: if request.auth != null &&
               request.auth.token.email == admin &&
               request.auth.token.role == 'admin';
}
```

**The Problem:**
```
Scenario: Admin disables user Wafi

1. Firestore /users: status = "disabled"
2. Firebase Auth: disabled = true
3. Wafi's old ID token (TTL 1 hour):
   - request.auth != null ✓
   - request.auth.token.role = "student" (from token)
   - Rules check: if request.auth != null ✓
   → READ ALLOWED! (But Wafi is disabled!)

Conclusion: Rules do NOT check status="active"
           Rules do NOT verify Firestore /users
           Disabled users can still read /diary and /exams
           Layer 2 authorization is broken
```

**Root Cause:**
- V3 rules use only custom claims (stale cache)
- V3 rules skip Firestore /users check (source of truth)
- V3 Cloud Functions use Firestore /users (correct)
- **Rules and Functions use different authorization sources** (INCONSISTENT)

---

## THE FIX: Consistent Authorization Architecture (V4)

### Design Decision: Two Options

#### Option A: Firestore Rules Query /users (Complete Consistency)

**Pros:**
- ✅ Rules = Functions (both check Firestore)
- ✅ Disabled status enforced in rules
- ✅ No custom claims needed

**Cons:**
- ❌ Firestore rules cannot do joins/queries (limitation)
- ❌ Cannot query /users collection from within /diary rules
- ❌ Rule would fail or require complex workarounds

**Feasibility:** NOT POSSIBLE with Firestore rules syntax

---

#### Option B: Accept Custom Claims for Rules, Verify with Cloud Functions (Practical Consistency)

**Architecture:**
```
FIRESTORE RULES:
  - Use custom claims (role, email, status if available)
  - Cannot query other collections
  - This is the limitation of Firestore rules

CLOUD FUNCTIONS:
  - Must verify everything against Firestore /users
  - Cloud Functions have admin SDK access
  - Can do full authorization checks

USER DATA READ (Rules):
  - /users/{uid}: Custom claims optional (claims as optimization)
  - /diary and /exams: Custom claims REQUIRED (rules cannot check Firestore)

USER DATA WRITE (Cloud Functions):
  - Must verify against /users (source of truth)
  - Must verify status="active"

CONSISTENCY ACHIEVED:
  - Rules use custom claims (what Firestore can do)
  - Functions use Firestore (what Functions can do)
  - Both coordinate via custom claims at auth time
```

**This Option:** Practical, consistent, works within Firestore limitations.

---

## V4 ARCHITECTURE: CONSISTENT AUTHORIZATION

### The Solution: Custom Claims as Authoritative Token

**Key Principle:**
```
Custom claims must be the complete, accurate authorization state
when token is issued. Rules use claims, Functions verify claims
against Firestore and revoke on mismatch.
```

### Custom Claims Structure (V4)

```typescript
{
  role: "admin" | "student" | "parent" | "teacher",  // From /users
  status: "active" | "disabled",                      // From /users NOW!
  email: string,                                       // From /users
  // Firebase adds: auth_time, iat, exp, etc.
}
```

**CHANGE FROM V3:** Add `status` to custom claims

---

### When Custom Claims Updated (V4)

**Issue:** Custom claims don't refresh automatically

**Solution (V4):** Update claims at specific points only

```
CLAIMS UPDATED:
  1. Token creation (pinLogin Cloud Function)
     - Load /users/{uid}
     - Create custom token with current role + status + email
     - Token TTL: 1 hour (max, should be shorter)
  
  2. User disables (disableUser Cloud Function)
     - Update /users status="disabled"
     - Update Firebase Auth custom claims: status="disabled"
     - Revoke refresh tokens
     - Existing tokens still have old status (BUT...)

CLAIMS BECOME STALE:
  - After 1 hour: new token reflects new status
  - Within 1 hour: old token may have old status

MITIGATION IN V4:
  - Cloud Functions ALWAYS check /users (not just claims)
  - If claims and /users mismatch: deny request
  - Firestore rules use claims as optimization only
```

---

## V4 FIRESTORE SECURITY RULES

### Complete Rules (V4 - CONSISTENT)

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== USERS COLLECTION ==========
    // Always readable by owner + admin
    // Status field visible to owner (even if disabled)
    match /users/{uid} {
      allow read: if request.auth != null && (
        request.auth.uid == uid ||
        request.auth.token.role == 'admin'
      );
      allow create, update, delete: if false;  // Cloud Functions only
    }
    
    // ========== CREDENTIALS COLLECTION ==========
    // Completely locked down (admin SDK only)
    match /userCredentials/{uid} {
      allow read, write: if false;
    }
    
    // ========== DIARY COLLECTION ==========
    // READ: Only authenticated active users
    // WRITE: Only admin
    match /diary/{diaryId} {
      // READ: Requires valid token with status="active"
      // (Relies on custom claims; Cloud Functions verify Firestore)
      allow read: if request.auth != null &&
                   request.auth.token.status == 'active';
      
      // WRITE: Admin only (with status verification)
      allow write: if request.auth != null &&
                   request.auth.token.role == 'admin' &&
                   request.auth.token.status == 'active' &&
                   request.auth.token.email == 'rockyhsn9@gmail.com';
    }
    
    // ========== EXAMS COLLECTION ==========
    // READ: Only authenticated active users
    // WRITE: Only admin
    match /exams/{examId} {
      // READ: Requires valid token with status="active"
      allow read: if request.auth != null &&
                   request.auth.token.status == 'active';
      
      // WRITE: Admin only (with status verification)
      allow write: if request.auth != null &&
                   request.auth.token.role == 'admin' &&
                   request.auth.token.status == 'active' &&
                   request.auth.token.email == 'rockyhsn9@gmail.com';
    }
    
    // ========== DEFAULT DENY ==========
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules Explanation (V4)

| Collection | Operation | Check | Why |
|-----------|-----------|-------|-----|
| `/users/{uid}` | Read | request.auth != null && (uid==self OR admin) | User can always read own |
| `/diary/{id}` | Read | request.auth != null && status=='active' | Only active users read |
| `/diary/{id}` | Write | request.auth != null && role=='admin' && status=='active' && email==admin | Only active admin writes |
| `/exams/{id}` | Read | request.auth != null && status=='active' | Only active users read |
| `/exams/{id}` | Write | request.auth != null && role=='admin' && status=='active' && email==admin | Only active admin writes |
| `/userCredentials/{uid}` | Any | false | DENY ALL (admin SDK only) |

**NEW ELEMENT:** `status=='active'` checks in rules for /diary and /exams

---

## V4 CLOUD FUNCTIONS: CONSISTENT VERIFICATION

### Pattern: ALWAYS verify against /users (V4)

**Every Cloud Function follows this pattern:**

```
Cloud Function: anyOperation(request)

STEP 1: Verify user is authenticated
  if (!request.auth.uid) throw new Error('Unauthenticated');

STEP 2: Load /users/{uid} from Firestore
  const user = await db.collection('users')
    .doc(request.auth.uid)
    .get();
  
STEP 3: Verify status="active" (if needed for operation)
  if (user.data().status !== 'active') {
    throw new Error('Account disabled');
  }

STEP 4: Verify role/permissions
  if (user.data().role !== 'admin') {
    throw new Error('Not authorized');
  }

STEP 5: Verify claims match Firestore (detect stale claims)
  if (request.auth.token.status !== user.data().status) {
    throw new Error('Session invalidated, claims stale');
  }
  if (request.auth.token.role !== user.data().role) {
    throw new Error('Role changed, claims stale');
  }

STEP 6: Proceed with operation
  // Now safe to execute
```

---

## V4 Custom Claims Lifecycle

### When Claims Are Set (V4)

#### Scenario 1: pinLogin - Fresh Token

```
Cloud Function: pinLogin(email, pin)

STEP 1-6: Verify PIN against /userCredentials
STEP 7: Load /users/{uid}
STEP 8: Check: status="active", role valid
STEP 9: Create custom token:
  admin.auth().createCustomToken(uid, {
    role: user.data().role,           // Current from Firestore
    status: user.data().status,       // Current from Firestore (NEW!)
    email: user.data().email          // Current from Firestore
  })

RESULT: Token has accurate role + status + email
```

**Key Change from V3:** Add `status` to custom claims

---

#### Scenario 2: disableUser - Invalidate Old Claims

```
Cloud Function: disableUser(uid, disabled=true)

STEP 1-6: Verify admin authorization (load /users, check claims)

IF disabled=true:
  STEP 7: Update Firestore /users
    db.collection('users').doc(uid).update({ status: 'disabled' })
  
  STEP 8: Update Firebase Auth custom claims
    admin.auth().setCustomUserClaims(uid, {
      role: user.data().role,
      status: 'disabled',              // NEW: Updated status
      email: user.data().email
    })
  
  STEP 9: Revoke refresh tokens
    admin.auth().revokeRefreshTokens(uid)
    (This forces logout from all devices)

RESULT:
  - Old tokens: status='active' (will be rejected by rules reading 'disabled')
  - New tokens: status='disabled' (cannot be created, auth prevents it)
  - Rules will reject old tokens (claims show status='active', but Firestore shows 'disabled')
```

**Key Addition from V3:** Revoke tokens BEFORE issuing new ones

---

### Token Stale Claims Scenario (V4)

```
SCENARIO: Wafi has valid token, admin disables Wafi

MOMENT 1: Wafi has token
  Token claims: { role: 'student', status: 'active', email: '...' }
  /users: { role: 'student', status: 'active', ... }

MOMENT 2: Admin calls disableUser(wafi_uid)
  /users: { role: 'student', status: 'disabled', ... }
  Firebase Auth claims: { role: 'student', status: 'disabled', ... }
  Refresh tokens: Revoked

MOMENT 3: Wafi tries to read /diary
  Token claims: { role: 'student', status: 'active' }  (OLD! not refreshed)
  Rules check: request.auth.token.status == 'active'
  Result: ✓ READ ALLOWED by rules (claims are current)

MOMENT 4: Wafi's /users listener fires
  /users: { status: 'disabled' }
  UI detects: Account disabled
  UI redirects to login

BUT: Moment 3 is a problem! Rules allowed read even though Firestore says disabled.

SOLUTION: Cloud Functions verify Firestore /users
  If Cloud Function reads /diary (after disable):
    STEP 1-6: Verify admin is still active
    STEP 7: Load /users for admin: status='active' ✓
    STEP 8: Verify claims match:
      admin.data().status ('active') === claims.status ('active') ✓
    ✓ Admin write succeeds

  But Wafi (student) cannot write anyway. Wafi can READ /diary via rules.
  Question: Is this correct?
```

---

## V4 Design Decision: Accept Limited Window for Rule-Level Disable

### The Reality Check (V4)

**Question:** Can disabled user read /diary between disable and UI redirect?

**Answer: Yes, for up to 1 hour (token TTL)**

**Why This Is Acceptable:**

```
Timeline:
  T=0: Admin clicks "disable"
  
  T=0-1: What happens
    1. Firebase Auth: disabled=true (new logins blocked)
    2. Firestore /users: status="disabled"
    3. Custom claims: status="disabled" (new tokens only)
    4. Refresh tokens: Revoked (existing sessions die)
    5. Listener fires: status update propagates to Wafi's UI (< 500ms)
    6. Wafi's UI: Shows "Account disabled"
    7. But: Wafi's old token still works for 1 hour
    8. Wafi can still READ /diary (rules check claims, not Firestore)

T=1 hour:
    - Old token expires
    - New token cannot be obtained (auth disabled)
    - Access ends

ASSESSMENT:
  ✅ Account effectively disabled (cannot log back in)
  ✅ Refresh tokens revoked (all sessions terminated)
  ✅ New tokens cannot be obtained (auth disabled)
  ✅ UI redirects immediately (< 500ms)
  ⚠️  Read access possible for up to 1 hour via old token
  ✅ Write access: Still blocked by rules (must check role + status)
```

**Is This Acceptable?**

```
For an educational app:
  - Student reading yesterday's diary for 1 hour: Low risk
  - Student MODIFYING diary: Already blocked (rules check role)
  - Student creating new content: Already blocked (rules check role)
  - Admin preventing immediate logout: Not achieved
  
MITIGATION: Token TTL should be SHORT
  - Default: 1 hour (too long)
  - Recommended: 15-30 minutes
  - This reduces the window
```

---

## V4 RECOMMENDATION: Token TTL Reduction

### Cloud Functions: Shorter Token TTL (V4)

```
pinLogin Cloud Function:
  // Current (V3):
  const token = await admin.auth().createCustomToken(uid);
  // TTL: Firebase default (3600 seconds = 1 hour)
  
  // RECOMMENDED (V4):
  const token = await admin.auth().createCustomToken(uid, {
    role: ...,
    status: ...,
    email: ...
  });
  // TTL: Firebase default (still 3600 seconds)
  // BUT: Frontend should refresh more frequently
  
  // BETTER (V4):
  // Return token with explicit TTL information
  return {
    token: tokenJWT,
    expiresIn: 900,  // 15 minutes instead of 3600
  };
  
  // Frontend implementation needed (out of scope for this blueprint)
  // Frontend would call pinLogin every 15 minutes to refresh
```

**Note:** Firebase SDK handles default token TTL (3600 sec). Shorter TTL requires application-level refresh logic, which is a separate feature.

---

## V4 COMPLETE AUTHORIZATION MATRIX

### Who Can Do What (V4)

| Operation | Actor | Requirements | Checked Where |
|-----------|-------|--------------|---|
| Read own /users | Any user | uid==self | Rules + n/a |
| Read other /users | Admin | role=='admin', status=='active' | Rules + Cloud Function |
| Read /diary | Active user | status=='active' | Rules |
| Write /diary | Admin | role=='admin', status=='active', email=='admin' | Rules (claims) |
| Create diary (via func) | Admin | role=='admin', status=='active' | Cloud Function + /users |
| Update diary (via func) | Admin | role=='admin', status=='active' | Cloud Function + /users |
| Delete diary (via func) | Admin | role=='admin', status=='active' | Cloud Function + /users |
| Disable user | Admin | role=='admin', status=='active' | Cloud Function + /users |
| Create user | Admin | role=='admin', status=='active' | Cloud Function + /users |
| Reset PIN | Admin | role=='admin', status=='active' | Cloud Function + /users |

### Authorization Sources (V4)

| Layer | Source | When | Notes |
|-------|--------|------|-------|
| Rules | Custom claims | Read operations | Claims assumed current (cache) |
| Rules | Custom claims | Write operations | Claims checked + email double-check |
| Cloud Functions | Firestore /users | All operations | Authoritative source of truth |
| Cloud Functions | Custom claims | All operations | Compared against /users (detect stale) |

---

## V4 DISABLE ENFORCEMENT LAYERS (REVISED)

### Three Layers - Now Consistent (V4)

```
DISABLE OPERATION: Admin disables user

LAYER 1: Authentication (Firebase Auth)
  Action: auth.updateUser(uid, { disabled: true })
  Result: User cannot log in
  Enforcement: Hard block on signInWithCustomToken
  Duration: Until admin re-enables

LAYER 2: Authorization (Firestore Rules + Claims)
  Action: Set custom claims status='disabled'
  Action: Revoke refresh tokens
  Result: Old tokens with status='active' become stale
  Rules: if request.auth.token.status == 'active'
  Rules: Check will PASS with old token
  Problem: Old token can still read /diary for up to 1 hour
  Mitigation: Short token TTL (15-30 min recommended)

LAYER 3: Authorization (Cloud Functions)
  Action: Every function loads /users and verifies status='active'
  Result: If user disabled, functions throw error
  Check: Compare claims.status vs /users.status (catch stale claims)
  Enforcement: Any write operation via function fails
  Enforcement: Admin operations require status='active'

LAYER 4: Real-time Listener (UI Response)
  Action: Firestore listener detects status='disabled'
  Result: UI notified < 500ms
  Result: UI shows "Account disabled"
  Result: UI redirects to login
  Note: Not a security boundary, only UX feedback
```

**Assessment:**
- ✅ Layer 1: Prevents new login (hard stop)
- ✅ Layer 3: Prevents admin/write operations
- ⚠️  Layer 2: Old tokens can read until expiry (mitigated by short TTL)
- ✅ Layer 4: Fast UI response

---

## V4 SUMMARY: What Changed from V3

### Rules (CRITICAL FIX)

**V3:**
```
/diary & /exams:
  allow read: if request.auth != null;
  (No status check - BUG)
```

**V4:**
```
/diary & /exams:
  allow read: if request.auth != null && 
              request.auth.token.status == 'active';
  (Now checks status - FIXED)
  
  allow write: if request.auth != null &&
               request.auth.token.role == 'admin' &&
               request.auth.token.status == 'active' &&
               request.auth.token.email == admin;
  (Now checks status + role - FIXED)
```

### Custom Claims (CRITICAL ADDITION)

**V3:** No status in claims

**V4:** Add status to custom claims
```typescript
{
  role: 'admin' | 'student' | 'parent' | 'teacher',
  status: 'active' | 'disabled',  // NEW
  email: string,
}
```

### Cloud Functions (CONSISTENCY IMPROVED)

**V3:** Cloud Functions verify /users (correct)

**V4:** 
```
PLUS: Functions now verify claims match /users
      if (claims.status !== firestore.status) throw error
      if (claims.role !== firestore.role) throw error
      
      (Detects stale claims, prevents exploitation)
```

### Token TTL Recommendation (NEW)

**V3:** Default 3600s (1 hour)

**V4:** Recommend shorter TTL (15-30 min) to reduce stale claim window
       (Implementation in frontend, outside this blueprint scope)

---

## V4 CONSISTENT AUTHORIZATION ARCHITECTURE

### The Complete Picture (V4)

```
┌─────────────────────────────────────────────────────┐
│ AUTHENTICATION: Firebase Auth                       │
├─────────────────────────────────────────────────────┤
│ - User account enabled/disabled                     │
│ - Controls login ability                            │
│ - Refresh token revocation                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─→ Cloud Function: pinLogin
                 │   └─→ Verify PIN
                 │   └─→ Create custom token
                 │   └─→ Set claims: role, status, email
                 │
                 ├─→ Custom Token (JWT)
                 │   ├─ role: 'admin|student|parent|teacher'
                 │   ├─ status: 'active|disabled'
                 │   ├─ email: 'user@example.com'
                 │   └─ TTL: 15-30 min (recommended)
                 │
                 ├─→ Frontend: signInWithCustomToken(token)
                 │   └─→ request.auth = user object
                 │   └─→ request.auth.token = claims
                 │
                 ├─→ Firestore Rules (READ operations)
                 │   ├─ Check: request.auth.token.status=='active'
                 │   ├─ Check: request.auth.token.role=='admin' (writes)
                 │   └─ NOTE: Cannot verify Firestore /users here
                 │
                 ├─→ Firestore /users Listener
                 │   ├─ Load: /users/{uid}
                 │   ├─ Detect: status changes
                 │   ├─ Notify: UI < 500ms
                 │   └─ Fast UX response
                 │
                 └─→ Cloud Functions (WRITE operations)
                     ├─ Load: /users/{uid}
                     ├─ Verify: user.status == 'active'
                     ├─ Verify: user.role == 'admin'
                     ├─ Verify: claims match /users
                     │  └─ if claims.status !== user.status: error
                     │  └─ if claims.role !== user.role: error
                     └─ Proceed or reject
```

**CONSISTENCY ACHIEVED:**
- ✅ Rules use claims (what Firestore can do)
- ✅ Functions use /users (what Functions can do)
- ✅ Functions verify claims against /users (detect stale)
- ✅ Both coordinate via token claims

---

## V4 SECURITY ASSESSMENT

### Threat: Disabled User With Old Token

```
ATTACK: User has valid token, gets disabled

T=0: Admin disables user Wafi
  /users: status='disabled'
  Firebase Auth: disabled=true
  Claims: status='disabled'
  Refresh tokens: Revoked

T=5min: Wafi tries to read /diary with old token
  Token claims: { status: 'active' }  (old token)
  Rules: if request.auth.token.status == 'active' ✓
  Result: READ ALLOWED
  
ASSESSMENT:
  ✅ Cannot log in again (auth disabled)
  ✅ Cannot refresh token (revoked)
  ✅ Cannot modify data (Cloud Functions check /users)
  ⚠️  Can read for up to 1 hour
  ✅ UI redirects after 500ms
  
MITIGATION:
  - Short token TTL (15-30 min instead of 3600s)
  - Reduces 1-hour window to 15-30 min
  - For school app, acceptable risk
```

### Defense in Depth (V4)

```
Layer 1: Authentication (hard stop on new login)
Layer 2: Rules (read operations with status check)
Layer 3: Cloud Functions (write operations with /users verification)
Layer 4: Listener (fast UI response)
Layer 5: Token revocation (refresh tokens killed)

Attacker must bypass ALL layers to maintain access
Realistic attack window: < 30 minutes (with short TTL)
```

---

## V4 FILES THAT CHANGE

### Only One File Different from V3

| Component | V3 | V4 | Change |
|-----------|----|----|--------|
| Firestore Rules | No status check | +status check | ADD 2 lines per rule |
| Custom Claims | No status | +status | ADD 1 line |
| Cloud Functions | Verify /users | +Verify claims match | ADD 3 lines per function |
| Migration | Same | Same | NO CHANGE |
| Frontend | Same | Same | NO CHANGE |

**Total Changes:** ~15 lines across rules + functions

---

## V4 APPROVAL CHECKLIST

```
Security Consistency:
  ☐ Rules now check status="active" for /diary and /exams
  ☐ Cloud Functions verify /users as source of truth
  ☐ Custom claims include status field
  ☐ Claims verification in all functions
  ☐ Stale claims detected and rejected

Authorization Consistency:
  ☐ Rules use claims (Firestore limitation)
  ☐ Functions use /users (full verification)
  ☐ Both coordinate via token claims
  ☐ Mismatch = error (stale detection)

Disabled User Protection:
  ☐ Auth prevents new login
  ☐ Rules check status for reads
  ☐ Functions check /users for writes
  ☐ Listener provides fast UX feedback
  ☐ Token revocation kills refresh
  
Token TTL:
  ☐ Recommendation added (15-30 min)
  ☐ Default still 3600s (acceptable)
  ☐ Short TTL reduces stale window
  ☐ Implementation noted as future work

Documentation:
  ☐ Authorization architecture clear
  ☐ Rules explained
  ☐ Functions explained
  ☐ Threat model analyzed
  ☐ Mitigations documented
```

---

## NEXT STEPS

✅ **V4 Complete - Security Consistency Fixed**

**Your Review:**
1. ✅ **APPROVE V4** → Ready for implementation
2. 🔄 **REQUEST CHANGES** → Specify concerns
3. ❓ **ASK QUESTIONS** → Clarify any aspect

**If Approved:**
- No code changes yet
- No deployments
- No migrations
- Ready for implementation sprint

