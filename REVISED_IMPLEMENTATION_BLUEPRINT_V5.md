# Revised Implementation Blueprint - Version 5
## Correct Firestore Rules Authorization Using get()

**Status:** 🔴 FINAL DESIGN - CORRECTED ARCHITECTURE - AWAITING APPROVAL  
**Date:** August 17, 2026  
**Change Type:** Critical architecture correction (V4 → V5)

---

## CRITICAL CORRECTION: Firestore Rules CAN Access Other Documents

### V4 Incorrect Assumption

```
V4 Claimed: "Firestore rules cannot query other collections"
V4 Result: Relied on custom claims for authorization
V4 Problem: Status enforcement happened via claims, not Firestore
```

### V5 Correct Understanding

```
Firestore Security Rules SUPPORT:
  ✓ get(path) - Fetch a specific document
  ✓ exists(path) - Check if document exists
  ✓ getAfter(path) - Check document state after write
  ✓ Access control based on referenced documents

SUPPORTED USE CASES:
  ✓ allow read: if get(/databases/db/documents/users/$(request.auth.uid)).data.status == 'active'
  ✓ allow write: if get(/databases/db/documents/users/$(request.auth.uid)).data.role == 'admin'
  ✓ Cross-document authorization (exactly what we need!)

LIMITATION (still true):
  ✗ Cannot query collections (no WHERE filters in rules)
  ✗ Must use get() with specific document ID
  ✗ Cannot loop through results
```

**V5 Decision:** Use get() to query /users for authorization

---

## V5 ARCHITECTURE: /users as Source of Truth in Rules

### Authorization Pattern (V5)

```
/diary read authorization:

allow read: if 
  // User authenticated
  request.auth != null &&
  // User's /users document exists and status is "active"
  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
```

**Benefits:**
- ✅ /users is the actual source of truth (not claims)
- ✅ Rules directly check Firestore state
- ✅ No custom claims status needed
- ✅ Disabled user blocked immediately (no stale claims window)
- ✅ Status changes in Firestore reflected in rules instantly

---

## V5 FIRESTORE SECURITY RULES (CORRECTED)

### Complete Rules with get() Authorization

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isUserActive() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return isUserActive() && getUserRole() == 'admin';
    }
    
    // ========== USERS COLLECTION ==========
    // Account data: user can read own, admin can read all
    match /users/{uid} {
      // User can read own /users document regardless of status
      // (so listener can observe status changes)
      allow read: if request.auth != null &&
                   (request.auth.uid == uid || getUserRole() == 'admin');
      
      // Create/update/delete via Cloud Functions only
      allow create, update, delete: if false;
    }
    
    // ========== CREDENTIALS COLLECTION ==========
    // PIN hashes: completely locked down (admin SDK only)
    match /userCredentials/{uid} {
      allow read, write: if false;
    }
    
    // ========== DIARY COLLECTION ==========
    // School diary: active users can read, admin can write
    match /diary/{diaryId} {
      // READ: Only active users can read
      allow read: if isUserActive();
      
      // WRITE: Only active admin can write
      allow write: if isAdmin() &&
                   request.auth.token.email == 'rockyhsn9@gmail.com';
    }
    
    // ========== EXAMS COLLECTION ==========
    // School exams: active users can read, admin can write
    match /exams/{examId} {
      // READ: Only active users can read
      allow read: if isUserActive();
      
      // WRITE: Only active admin can write
      allow write: if isAdmin() &&
                   request.auth.token.email == 'rockyhsn9@gmail.com';
    }
    
    // ========== DEFAULT DENY ==========
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules Explanation (V5)

| Collection | Check | How | Source |
|-----------|-------|-----|--------|
| `/users/{uid}` | Can read own | `request.auth.uid == uid` | Rules |
| `/users/{uid}` | Can read others (admin) | `getUserRole() == 'admin'` | /users document |
| `/diary/{id}` | Can read | `isUserActive()` | /users document |
| `/diary/{id}` | Can write (admin) | `isAdmin()` | /users document |
| `/exams/{id}` | Can read | `isUserActive()` | /users document |
| `/exams/{id}` | Can write (admin) | `isAdmin()` | /users document |

**Key Change from V4:** Rules now query /users via get(), not custom claims

---

## V5 CUSTOM CLAIMS SIMPLIFIED

### What Custom Claims Are Now (V5)

**Purpose:** Session optimization and initial state, NOT authorization

```typescript
{
  role: 'admin' | 'student' | 'parent' | 'teacher',  // Cache for UI
  email: string,                                       // Cache for UI
  // NO status - rules will check /users directly
}
```

**When Set:**
- Created by pinLogin (optimization for frontend)
- Used by frontend to show user info before Firestore loads
- NOT used for authorization in rules

**When Checked:**
- Frontend displays user role/email
- Cloud Functions use only for email verification (admin check)
- Rules ignore custom claims completely

---

## V5 DISABLED USER ENFORCEMENT (CORRECTED)

### Three Layers - All Using /users Document

```
DISABLE OPERATION: Admin disables user Wafi

LAYER 1: Authentication (Firebase Auth)
  Action: auth.updateUser(uid, { disabled: true })
  Result: User cannot log in
  Enforcement: Hard block on signInWithCustomToken
  Duration: Until admin re-enables

LAYER 2: Authorization (Firestore Rules)
  Action: Firestore rules check get(/users/{uid}).data.status == 'active'
  Result: Any query/read to /diary or /exams fails
  Enforcement: "Permission denied" for all reads/writes
  Duration: Immediate (no stale claims, rules query live /users)
  
  Code:
    allow read: if isUserActive()  // checks status via get()
    isUserActive() queries /users/{uid} directly

LAYER 3: Authorization (Cloud Functions)
  Action: Functions load /users and verify status='active'
  Result: Any operation via function fails
  Enforcement: "Account disabled" error
  Duration: Immediate
  
  Code:
    const user = await db.collection('users').doc(uid).get()
    if (user.data().status !== 'active') throw error

LAYER 4: Real-time Listener (UI Response)
  Action: Firestore listener detects status='disabled'
  Result: UI notified < 500ms
  Enforcement: UI redirect to login
  Duration: Fast (< 500ms)

IMMEDIATE EFFECT:
  - Cannot log in (Layer 1)
  - Cannot read/write /diary or /exams (Layer 2 - rules)
  - Cannot use any function (Layer 3)
  - UI sees status change (Layer 4)
  
GUARANTEE: Disabled user blocked immediately (no stale window)
```

**Key Difference from V4:**
- V4: Rules checked custom claims status (stale window)
- V5: Rules check /users document directly (no stale window)

---

## V5 FIRESTORE QUERIES & LIST COMPATIBILITY

### Issue: get() in Rules vs list() Queries

**Problem:**
```
Rules with get() work for single-document access
But what about list queries from frontend?
  db.collection('diary').get()
  db.collection('diary').where(...).get()
```

**Solution (V5):**

```
Firestore Rules apply to individual document access.
When frontend calls .get() or .where().get():

For each document returned:
  1. Firestore evaluates read rule
  2. Rule calls isUserActive()
  3. isUserActive() calls get(/users/{uid})
  4. If status != 'active': document filtered out

BEHAVIOR:
  ✓ Frontend calls: db.collection('diary').get()
  ✓ Query returns all diary documents
  ✓ Firestore rules applied to each doc
  ✓ Disabled user: all documents filtered out
  ✓ Active user: all documents returned

PERFORMANCE:
  ⚠️  Rules evaluation happens per document
  ⚠️  Each document causes get(/users/{uid}) call
  ⚠️  1000 diary docs = 1000 user doc reads
  
OPTIMIZATION (V5):
  - Frontend caches user status in local state
  - Frontend pre-filters based on known status
  - Firestore rules provide security boundary
  - get() calls are cheap (seconds operation)
```

---

## V5 CLOUD FUNCTIONS: Consistent with Rules

### Authorization Pattern (V5)

```
Cloud Function: anyOperation(request)

STEP 1: Verify user is authenticated
  if (!request.auth.uid) throw error

STEP 2: Load /users/{uid} (authoritative source)
  const user = await db.collection('users').doc(request.auth.uid).get()
  
STEP 3: Verify status="active"
  if (user.data().status !== 'active') throw error
  
STEP 4: Verify role (if needed)
  if (user.data().role !== 'admin') throw error
  
STEP 5: Proceed with operation
  // Now safe to execute
```

**Comparison with Rules:**
```
Rules:
  isUserActive() = get(/users/{uid}).status == 'active'
  isAdmin() = isUserActive() && get(/users/{uid}).role == 'admin'

Functions:
  user = db.collection('users').doc(uid).get()
  status = user.data().status
  role = user.data().role
  
Both use exact same source: /users/{uid} document
```

---

## V5 TOKEN LIFECYCLE CLARIFICATION

### Corrected: Custom Token TTL vs ID Token TTL

**V4 Incorrect Claim:**
```
"return { token, expiresIn: 900 }"
This creates 15-minute Firebase ID-token TTL
```

**V5 Correct Understanding:**
```
Two separate token systems:

1. CUSTOM TOKEN (created by Cloud Function)
   - JWT signed by Firebase private key
   - TTL: 3600 seconds (1 hour) FIXED by Firebase
   - Used by: signInWithCustomToken()
   - Cannot be changed by expiresIn in response

2. FIREBASE ID TOKEN (created by signInWithCustomToken)
   - JWT representing Firebase Auth session
   - TTL: 3600 seconds (1 hour) FIXED by Firebase
   - Auto-refreshed via refresh tokens
   - Expires when custom token expires
   - Can be explicitly refreshed by frontend

expiresIn in API response:
   - Informational only
   - Tells frontend when token expires
   - Does NOT change actual Firebase TTL
   - Frontend should use this for UI ("Expires in 15 min")
```

**Implication for V5:**
```
ORIGINAL GOAL: Reduce stale claim window

V4 ATTEMPTED: expiresIn: 900 (doesn't work)

V5 CORRECT APPROACH:
  Option A: Use short TTL in frontend (refresh early)
    - Frontend calls refreshToken at 15-min mark
    - Gets new ID token (auto-refresh)
    - New token reflects current /users state
  
  Option B: Accept 1-hour TTL
    - Old tokens valid for 1 hour
    - But Firestore rules check /users (not claims!)
    - Rules immediately see disabled status
    - No stale window for rule evaluation
    - Only matters for Cloud Function calls

V5 DECISION:
  - Keep 3600-second Firebase default
  - Rules use get() to check /users (no stale window)
  - Functions check /users (no stale window)
  - Frontend may implement early refresh (optional future feature)
  - No stale claims issue because rules don't use claims
```

---

## V5 AUTHORIZATION MATRIX (CORRECTED)

### Who Can Do What (V5)

| Operation | Actor | Rules Check | Function Check | Source |
|-----------|-------|-------------|---|---|
| Read own /users | Any user | uid==self | n/a | Rules |
| Read other /users | Admin | get(/users).role=='admin' | check /users | /users doc |
| Read /diary | Active user | isUserActive() | n/a | Rules (get) |
| Write /diary | Admin | isAdmin() && email | check /users | Rules (get) |
| Create diary (func) | Admin | n/a | check /users | Function |
| Update diary (func) | Admin | n/a | check /users | Function |
| Delete diary (func) | Admin | n/a | check /users | Function |
| Disable user | Admin | n/a | check /users | Function |
| Create user | Admin | n/a | check /users | Function |
| Reset PIN | Admin | n/a | check /users | Function |

**Key Difference from V4:**
- V4: Rules checked custom claims
- V5: Rules use get() to check /users directly

---

## V5 AUTHORIZATION ARCHITECTURE (CORRECTED)

```
┌─────────────────────────────────────────────────────┐
│ AUTHENTICATION: Firebase Auth                       │
├─────────────────────────────────────────────────────┤
│ - User account enabled/disabled                     │
│ - Controls login ability                            │
│ - Prevents new signInWithCustomToken() if disabled  │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─→ Cloud Function: pinLogin
                 │   ├─ Verify PIN
                 │   ├─ Load /users (check status, role)
                 │   ├─ Create custom token
                 │   └─ Set custom claims: role, email (cache only)
                 │       NOTE: No status in claims
                 │
                 ├─→ Custom Token (JWT, 1 hour TTL)
                 │   ├─ role: 'admin|student|...'
                 │   └─ email: 'user@example.com'
                 │
                 ├─→ Frontend: signInWithCustomToken(token)
                 │   └─→ Firebase creates ID token (session)
                 │
                 ├─→ Firestore Rules (READ operations)
                 │   ├─ Helper: isUserActive() =
                 │   │     get(/users/{uid}).data.status == 'active'
                 │   ├─ Helper: isAdmin() =
                 │   │     isUserActive() && get(/users/{uid}).data.role == 'admin'
                 │   ├─ Apply isUserActive() to /diary & /exams reads
                 │   ├─ Apply isAdmin() to admin writes
                 │   └─ /users fetched live (NOT from claims)
                 │
                 ├─→ Firestore /users Listener (UI Response)
                 │   ├─ Load: /users/{uid} in real-time
                 │   ├─ Detect: status changes
                 │   ├─ Notify: UI < 500ms
                 │   └─ Fast UX response
                 │
                 └─→ Cloud Functions (WRITE operations)
                     ├─ Load: /users/{uid}
                     ├─ Verify: user.status == 'active'
                     ├─ Verify: user.role == 'admin' (if needed)
                     └─ Proceed or reject
```

**CONSISTENCY ACHIEVED (V5):**
- ✅ Rules use get() to query /users (source of truth)
- ✅ Functions use /users document (source of truth)
- ✅ Both use same document, no stale window
- ✅ Custom claims are cache only (optional)
- ✅ Disabled user blocked immediately at all layers

---

## V5 DISABLED USER FLOW (CORRECTED)

### Scenario: Disable User at T=0

```
T=0: Admin calls disableUser(wafi_uid)
  Step 1: Update Firestore /users: status='disabled'
  Step 2: Firebase Auth: disabled=true
  Step 3: Revoke refresh tokens

T=0+: Firestore rules evaluate for Wafi
  Rule: allow read: if isUserActive()
  isUserActive(): get(/users/wafi).data.status == 'active'
  Result: ❌ 'disabled' != 'active'
  Outcome: READ BLOCKED (no delay, no stale window)

T=0+100ms: Firestore listener fires
  Event: /users/wafi: status changed to 'disabled'
  UI: Detects status="disabled"
  UI: Shows "Account disabled"
  UI: Redirects to login

T=0+1min: Wafi tries to read /diary with old token
  Rules check: isUserActive()
  get(/users/wafi) in real-time
  Result: ❌ Status is 'disabled'
  Outcome: READ BLOCKED

T=3600s: Old token expires
  Wafi tries to log in: ❌ Auth account disabled
  Wafi obtains new token: ❌ signInWithCustomToken fails

GUARANTEE: Wafi blocked at T=0 (immediate)
```

---

## V5 PERFORMANCE CONSIDERATIONS

### get() Cost in Rules

**When Rules Call get():**
```
Each Firestore rule evaluation calls get(/users/{uid})
This is a Firestore read operation

Cost:
  - Each get() = 1 read operation (billable)
  - 100 diary reads = 100 get(/users) calls (if 100 different users)
  - 100 diary reads = 1 get(/users) call (if all same user)
  
Mitigation:
  - Firestore caches get() results within a transaction
  - If multiple docs accessed in transaction: get() cached
  - Frontend list queries: one get() per distinct user (usually 1)
  - Acceptable cost for security
```

### Optimization Strategies (V5)

```
Strategy 1: Frontend pre-filters
  - Frontend knows user status
  - Queries only while active
  - Reduces rule evaluations

Strategy 2: Firestore caching
  - get() results cached within request
  - Multiple diary docs for same user = 1 get() call
  - Transaction context helps

Strategy 3: Query restrictions
  - Limit list queries with .limit()
  - Fewer documents = fewer rule evaluations
  - Fewer get() calls
```

---

## V5 QUERY/LIST COMPATIBILITY

### Frontend Queries with Rules

**Query Type 1: Get all diary**
```
Frontend:
  db.collection('diary').get()

Firestore:
  1. Fetches all documents
  2. For each document:
     - Evaluates: allow read: if isUserActive()
     - Calls: get(/users/{uid})
     - Checks: status == 'active'
  3. Filters out documents where user not active

Result:
  - Active user: gets all diary
  - Disabled user: empty result set
  
Performance:
  - Single get(/users/{uid}) call (cached)
  - One per unique user accessing
```

**Query Type 2: Where clause**
```
Frontend:
  db.collection('diary')
    .where('date', '>=', startDate)
    .get()

Firestore:
  1. Applies WHERE filter
  2. For each matching document:
     - Evaluates: allow read: if isUserActive()
     - Calls: get(/users/{uid})
  3. Returns only documents user can read

Result:
  - Rules work with WHERE queries
  - Access control applied after WHERE filter
```

**Query Type 3: Pagination**
```
Frontend:
  db.collection('diary')
    .limit(10)
    .get()

Firestore:
  1. Fetches first 10 documents
  2. For each:
     - Evaluates: allow read: if isUserActive()
  3. Returns those user can read

Result:
  - Rules work with pagination
  - May return < 10 docs if user disabled
  - Clean behavior
```

---

## V5 WHAT CHANGED FROM V4

### Rules (MAJOR CHANGE)

**V4:**
```
allow read: if request.auth != null &&
            request.auth.token.status == 'active';
```

**V5:**
```
allow read: if isUserActive();
// where:
function isUserActive() {
  return request.auth != null &&
         get(/databases/$(database)/documents/users/$(request.auth.uid))
           .data.status == 'active';
}
```

### Custom Claims (SIGNIFICANT REDUCTION)

**V4:** Include status in claims
```typescript
{ role, status, email }
```

**V5:** Claims are cache only
```typescript
{ role, email }  // No status (checked via get() in rules)
```

### Token TTL (CLARIFICATION)

**V4:** Misleading claim about expiresIn controlling TTL

**V5:** Clarified:
```
- expiresIn: 900 is informational only
- Firebase TTL: 3600 seconds (cannot change)
- Optional future feature: frontend early refresh
- No impact on V5 design
```

### Removed Dependency

**V4:** Relied on stale claims for (limited) enforcement

**V5:** No stale claims issue (rules query /users directly)

---

## V5 SUMMARY TABLE

| Aspect | V4 | V5 | Improvement |
|--------|----|----|-------------|
| Rules check | Custom claims | get(/users) | Source of truth |
| Stale window | ~1 hour (with short TTL) | None | Immediate enforcement |
| /users lookup | Functions only | Rules + Functions | Consistent |
| Authorization source | Claims cache | /users document | Single source |
| Disabled user block | Delayed by claims | Immediate | No window |
| Query compatibility | Works | Works (with get()) | Same |
| Performance | Claims read | get() read | Acceptable |

---

## V5 APPROVALS CHECKLIST

```
Architecture Consistency:
  ☐ Rules use get() to query /users
  ☐ Functions use /users document
  ☐ Both check same source of truth
  ☐ No stale claims issue

Disabled User Enforcement:
  ☐ Rules block immediately via get(/users)
  ☐ Functions block on /users check
  ☐ No window where disabled user has access
  ☐ Listener provides fast UI response

Token Clarification:
  ☐ expiresIn is informational
  ☐ Firebase TTL 3600s (cannot change in blueprint)
  ☐ Optional early refresh is future work
  ☐ No impact on security

Query Compatibility:
  ☐ get() works with list queries
  ☐ Where clauses compatible
  ☐ Pagination works
  ☐ Performance acceptable

Custom Claims:
  ☐ Used for cache/UI only
  ☐ Not used for authorization
  ☐ Role and email only (no status)
  ☐ Optional in frontend
```

---

## NEXT STEPS

✅ **V5 Complete - Correct Firestore Rules Architecture**

**Your Review:**
1. ✅ **APPROVE V5** → Ready for implementation
2. 🔄 **REQUEST CHANGES** → Specify concerns
3. ❓ **ASK QUESTIONS** → Clarify any aspect

**If Approved:**
- No code changes yet
- No deployments
- No migrations
- Ready for implementation sprint

