# Blueprint V5 - Corrected Firestore Rules Summary

**Issue:** V4 incorrectly assumed rules cannot access other documents  
**Correction:** Firestore rules support get() for authorization queries  
**Impact:** /users document is now source of truth in rules (not custom claims)  
**Result:** Zero stale-claim window, immediate disabled-user enforcement

---

## The V4 Mistake

### What V4 Got Wrong

```
CLAIM: "Firestore rules cannot query other collections"
RESULT: Relied on custom claims for authorization
CONSEQUENCE: Stale claims window (old token could read for 1 hour)
```

### What V4 Missed

```
FIRESTORE RULES ACTUALLY SUPPORT:
  ✓ get(path) - Fetch specific document by ID
  ✓ exists(path) - Check if document exists
  ✓ getAfter(path) - Check document state after write
  ✓ Document-level authorization queries

EXAMPLES:
  ✓ get(/databases/db/documents/users/$(request.auth.uid))
  ✓ get(/databases/db/documents/settings/config)
  ✓ access control: if get(/users/$(uid)).data.role == 'admin'

LIMITATION (still exists):
  ✗ Cannot do collection queries with WHERE
  ✗ Cannot loop through collections
  ✗ Must know document ID in advance
```

**V5 Decision:** Use get() to access /users document for authorization

---

## The Fix: Rules Now Query /users

### V5 Rules Implementation

**Before (V4):**
```
/diary/{diaryId} {
  allow read: if request.auth != null &&
              request.auth.token.status == 'active';  // From custom claims
}
```

**After (V5):**
```
/diary/{diaryId} {
  allow read: if isUserActive();  // Queries /users via get()
}

function isUserActive() {
  return request.auth != null &&
         get(/databases/$(database)/documents/users/$(request.auth.uid))
           .data.status == 'active';  // From /users document
}
```

**What Changed:**
- V4: Checked custom claims (cache, potentially stale)
- V5: Queries /users document directly (always current)

---

## Security Improvement

### Before (V4 - Stale Claims Problem)

```
Timeline: Admin disables Wafi at T=0

T=0: Firestore status='disabled', Auth disabled=true
     Custom claims NOT automatically updated
     Refresh tokens revoked

T=5min: Wafi has old token with claims.status='active'
  Read /diary:
    Rules check: request.auth.token.status == 'active' ✓
    Result: ✓ READ ALLOWED ❌ (But Wafi is disabled!)

T=60min: Token expires
```

### After (V5 - Immediate Enforcement)

```
Timeline: Admin disables Wafi at T=0

T=0: Firestore status='disabled', Auth disabled=true

T=0+: Wafi tries to read /diary
  Rules check: isUserActive()
    get(/users/wafi).data.status == 'active' ?
    Result: ❌ 'disabled' != 'active'
  Result: ❌ READ BLOCKED (immediately!)

T=0+500ms: Listener fires, UI detects disabled
```

**Improvement:** From 1-hour stale window → zero window

---

## Query Compatibility with get()

### How get() Works in Rules During Queries

**Scenario: Frontend calls db.collection('diary').get()**

```
Firestore Process:
  1. Fetches all diary documents
  2. For each document:
     - Evaluates: allow read: if isUserActive()
     - Calls: get(/users/{uid})
     - Returns user document
     - Checks: status == 'active'
     - If status active: include in results
     - If status not active: filter out
  3. Returns filtered results to frontend

Result:
  - Active user: gets all diary documents
  - Disabled user: empty results (no documents)
  - Permissions enforced transparently
```

**Performance Note:**
```
Each get() call is a Firestore read (billable).
But: Results cached within a request context.
So: 100 diary docs for same user = 1 get(/users) call + caching
Result: Minimal overhead
```

---

## Custom Claims Simplified (V5)

### What Happened to Status in Claims

**V4 Added:** `{ role, status, email }` to custom claims

**V5 Removes:** Status from custom claims

**Why Removed:**
```
V4 Reason for status: Rules could check it
V5 Reason against: Rules now query /users directly

No longer needed because:
  - Rules don't use claims for authorization
  - Rules use get(/users) for authorization
  - Status claim would just be redundant/stale

Kept in claims:
  - role: For frontend UI (display user role)
  - email: For admin email verification
```

---

## Token TTL Clarification (V5)

### V4 Misunderstood: Firebase TTL

**V4 Claimed:**
```
return { token, expiresIn: 900 }
This creates 15-minute Firebase token TTL
```

**V5 Corrects:**
```
Two separate token systems:

1. Custom Token (issued by Cloud Function)
   - Firebase creates it with 1-hour TTL
   - Cannot be changed by expiresIn response field
   - Fixed 3600 seconds

2. ID Token (created by signInWithCustomToken)
   - Session token for user
   - Also 1-hour default TTL
   - Auto-refreshes via refresh token
   - Can be manually refreshed by frontend

expiresIn: 900 in response:
   - Informational only ("token expires in 900 seconds")
   - Does NOT change Firebase TTL
   - Frontend can use for UI ("Session expires in 15 min")
   - Does NOT shorten actual session
```

**Implication for Security:**
```
V4 Thought: expiresIn: 900 reduces stale claim window
V5 Truth: expiresIn doesn't affect TTL, only informs frontend

V5 Doesn't Need Short TTL Because:
  - Rules check /users directly (always current)
  - No stale claims in rules (queries live document)
  - Old token still subject to rule evaluation
  - get(/users) sees current status
  - No stale window for rule evaluation

Optional Future: Frontend early refresh
  - Frontend could refresh token at 15-min mark
  - Would get new session automatically
  - Out of scope for V5 blueprint
```

---

## Authorization Source: /users Document

### Complete Authorization Matrix (V5)

| Check | Implementation | Source | When |
|-------|---|---|---|
| User active read | `get(/users).status == 'active'` | Rules | Every read |
| Admin can write | `get(/users).role == 'admin'` | Rules | Every write |
| User active in function | `user.status == 'active'` | Functions | Every operation |
| Admin in function | `user.role == 'admin'` | Functions | Every operation |
| User disabled block | Auth.disabled=true | Firebase Auth | Login attempt |

**Single Source of Truth:** `/users/{uid}` document

```
Firestore Rules:
  load /users/{uid} via get()
  check status, role

Cloud Functions:
  load /users/{uid} via SDK
  check status, role

Both access same document
Both consistent
No stale window
```

---

## Disabled User Flow (V5 - Complete)

### Step-by-Step Enforcement

```
ADMIN DISABLES USER

1. Update Firestore /users: status = 'disabled'
   Firestore rules now see 'disabled'

2. Update Firebase Auth: disabled = true
   signInWithCustomToken will reject

3. Revoke refresh tokens
   Existing sessions end

WHEN DISABLED USER ACTS

Read /diary attempt:
  Firestore rules trigger: allow read: if isUserActive()
  isUserActive(): get(/users/{uid}).data.status == 'active'
  Firestore: status = 'disabled'
  Result: ❌ Permission denied (IMMEDIATE)

Write /diary attempt (if via function):
  Function loads /users/{uid}
  Checks: status == 'active'
  Firestore: status = 'disabled'
  Result: ❌ Account disabled error (IMMEDIATE)

New login attempt:
  Firebase Auth rejects: account disabled
  Result: ❌ Cannot log in (IMMEDIATE)

UI Listener:
  /users/{uid} listener fires
  Detects: status = 'disabled'
  UI: Shows "Account disabled"
  UI: Redirects to login
  Latency: < 500ms (fast UX)
```

**All layers independent:**
- ✅ Auth blocks login
- ✅ Rules block reads (via get())
- ✅ Functions block writes
- ✅ Listener provides fast UI response

---

## What Stays the Same (V5)

```
✅ Cloud Functions verifying /users (same as V4)
✅ Custom credentials collection locked (same as V4)
✅ PIN storage in /userCredentials (same as V4)
✅ Migration procedure (same as V4)
✅ Frontend files to modify (same as V4)
✅ Diary/exams collections (same as V4)
```

---

## What Changed (V5)

| Component | V4 | V5 | Change |
|-----------|----|----|--------|
| Firestore Rules | Check claims.status | Query /users via get() | MAJOR |
| Custom Claims | Include status | Remove status | SIMPLIFY |
| Token TTL | Confused | Clarified | DOCUMENTAL |
| Authorization Source | Dual (claims + /users) | Single (/users only) | CONSISTENCY |
| Stale Window | ~1 hour | None | SECURITY |

---

## Performance Impact (V5)

### get() Cost

```
Each rule evaluation calls: get(/databases/.../users/$(uid))

Scenarios:

1. Single user reading diary:
   - 1 rule evaluation = 1 get(/users/{uid})
   - Cost: 1 read

2. 100 users each reading 1 diary:
   - 100 rule evaluations (possibly 100 gets)
   - BUT: get() cached within request
   - If same user reads multiple docs: 1 get, cached
   - Cost: Variable (1-100 reads depending on unique users)

3. List query: db.collection('diary').get()
   - All documents fetched
   - For each: allow read rule evaluated
   - get(/users) called per document
   - Results: Cached within request
   - Cost: 1 get per unique user

Assessment:
  - Acceptable cost for security
  - Firestore read pricing: standard rates apply
  - get() results cached (reduces cost)
  - For typical school app: minimal overhead
```

---

## V5 Approval Checklist

```
Firestore Rules:
  ☐ Rules can access other documents via get()
  ☐ Using get() to query /users for authorization
  ☐ Helper functions (isUserActive, isAdmin)
  ☐ /diary and /exams rules check status

Authorization Consistency:
  ☐ /users is source of truth in rules
  ☐ /users is source of truth in functions
  ☐ Single consistent source
  ☐ No stale claims

Disabled User Enforcement:
  ☐ Immediate block (no stale window)
  ☐ Blocked at auth layer
  ☐ Blocked at rules layer (via get())
  ☐ Blocked at function layer
  ☐ UI notified fast (< 500ms)

Custom Claims:
  ☐ Role and email (cache for UI)
  ☐ No status (rules check /users)
  ☐ Simplified

Query Compatibility:
  ☐ get() works with .get()
  ☐ get() works with .where()
  ☐ Performance acceptable
  ☐ Results correctly filtered

Token TTL:
  ☐ Clarified expiresIn is informational
  ☐ Firebase TTL 3600s (standard)
  ☐ No misleading claims
  ☐ Optional future work: early refresh
```

---

## Summary: V4 → V5

**V4 Flaw:** Assumed rules cannot access /users, relied on stale claims  
**V5 Fix:** Rules use get() to access /users directly  
**Result:** Immediate disabled-user enforcement, zero stale window  
**Consistency:** Both rules and functions use /users as source of truth  
**Performance:** get() results cached, acceptable cost  

---

**V5 is ready for final approval.**

