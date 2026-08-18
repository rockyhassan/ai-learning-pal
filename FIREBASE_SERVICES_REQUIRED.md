# Firebase Services Required - Serverless Architecture
**Status:** Planning phase  
**Approach:** Firebase-native services only (NO external backend)

---

## Exact Firebase Services Needed

### ✅ REQUIRED (Core System)

#### 1. **Firestore Database**
- **What:** Real-time document database
- **Why:** Persistent storage for users, audit logs, permissions
- **Collections:**
  - `/users` - User accounts (student, parent, teacher, admin)
  - `/audit` - Login attempts, permission changes (compliance logs)
  - `/archived_users` - Soft-deleted users (data retention)
- **Cost:** $0.06 per 100k reads/writes; 50k/day free tier
- **Features Needed:**
  - Real-time listeners (for multi-device sync)
  - Security rules (enforce access control)
  - Composite indexes (for querying by role + status)
  - Transactions (for atomic rate-limit checks)

#### 2. **Cloud Functions**
- **What:** Serverless compute (Node.js runtime)
- **Why:** Execute backend logic (PIN hashing, JWT generation, admin ops)
- **Functions:**
  - `login` (HTTP) - Verify PIN, generate JWT token
  - `users-list` (HTTP) - Query users by role
  - `create-user` (HTTP) - Admin: create new user + hash PIN
  - `reset-pin` (HTTP) - Admin: reset user PIN
  - `onUserCreated` (Firestore trigger) - Send welcome email
  - `onUserPermissionChange` (Firestore trigger) - Log permission changes
  - `onUserDeleted` (Firestore trigger) - Archive deleted users
- **Cost:** $0.40 per 1M invocations; 2M/month free tier
- **Features Needed:**
  - npm packages: bcryptjs, jsonwebtoken, firebase-admin, express (optional)
  - Environment config for JWT_SECRET
  - HTTP triggers for API endpoints
  - Firestore triggers for automation

#### 3. **Firebase Authentication** (Existing)
- **What:** Google OAuth for admin sign-in
- **Why:** Already set up; admin Google login
- **Status:** No changes needed; works as-is
- **Cost:** Free
- **Features Used:**
  - Google Sign-In with popup
  - Email whitelist verification (VITE_FIREBASE_ADMIN_EMAIL)
  - Firebase UID creation for admin linking

---

### ⚠️ OPTIONAL (But Recommended)

#### 4. **Cloud Storage** (If Supporting File Uploads)
- **What:** Store files (documents, diary images, homework)
- **Why:** App supports document/file uploads for learning materials
- **Cost:** 5GB free; $0.018/GB after
- **Features:**
  - Security rules (users only access own files)
  - Auto-expiring URLs (for signed download links)
  - Image optimization (thumbs, compression)

#### 5. **Cloud Scheduler** (Optional)
- **What:** Run periodic jobs (cron-like)
- **Why:** Cleanup old audit logs, generate reports
- **Cost:** Free for ≤3 jobs
- **Example Jobs:**
  - Archive audit logs > 90 days old
  - Send weekly admin reports
  - Reset failed login counters

#### 6. **Cloud Monitoring & Logging** (Included)
- **What:** Built-in logging, errors, performance metrics
- **Why:** Debug issues, monitor health
- **Cost:** Included with Cloud Functions
- **Dashboards:**
  - Function invocation rates
  - Error rates & stack traces
  - Firestore read/write throughput

#### 7. **Pub/Sub** (For Scaling Later)
- **What:** Message queue for async events
- **Why:** When you scale to 1000s of users, decouple login from email sending
- **Cost:** $0.40 per 1M publish requests; free tier sufficient
- **Optional for:** High-volume email notifications

---

### ❌ NOT NEEDED

#### ✗ Realtime Database
- **Why:** Firestore is better for this app (structured queries, security rules)

#### ✗ App Engine
- **Why:** Cloud Functions more efficient for APIs

#### ✗ Compute Engine / VPS
- **Why:** Cloud Functions handle all backend needs without VPS

#### ✗ Cloud SQL / PostgreSQL
- **Why:** Firestore NoSQL sufficient; no relational needs

#### ✗ Redis / Memcache
- **Why:** Firestore counters + rate limiting sufficient for school app

#### ✗ External Backend (Express, Django, etc.)
- **Why:** Cloud Functions replace all backend needs

---

## Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING BUDDY APP                       │
│              (TanStack Start + React Frontend)              │
│                                                             │
│  - Role selector (login page)                             │
│  - PIN keypad input                                       │
│  - JWT token stored in localStorage                       │
│  - Real-time sync via Firestore listeners                │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┬─────────────────┐
    │                │                │                 │
    │         Firestore         Cloud Functions   Firebase Auth
    │         Listeners         HTTP Calls        (Admin)
    │                │                │                 │
    ▼                ▼                ▼                 ▼

┌──────────────────────────────────────────────────────────────┐
│                  FIREBASE ECOSYSTEM                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FIRESTORE DATABASE (Real-time)                    │   │
│  │  ├─ /users (user accounts)                        │   │
│  │  ├─ /audit (login logs, compliance)              │   │
│  │  ├─ /archived_users (soft-delete)                │   │
│  │  ├─ Security Rules (enforce access)              │   │
│  │  └─ Composite Indexes (efficient queries)        │   │
│  │     Cost: ~$0/month (free tier)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CLOUD FUNCTIONS (Node.js Serverless)              │   │
│  │  ├─ login (HTTP) - PIN verification + JWT         │   │
│  │  ├─ users-list (HTTP) - Query by role             │   │
│  │  ├─ create-user (HTTP) - Admin operations         │   │
│  │  ├─ reset-pin (HTTP) - Reset PIN                  │   │
│  │  ├─ Firestore triggers (onCreate, onUpdate)       │   │
│  │  ├─ npm: bcryptjs, jsonwebtoken                   │   │
│  │  └─ Latency: ~100-200ms per function             │   │
│  │     Cost: ~$0/month (free tier)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FIREBASE AUTHENTICATION                            │   │
│  │  ├─ Google OAuth (admin sign-in)                  │   │
│  │  ├─ Email whitelist verification                 │   │
│  │  └─ Firebase UID for admin linking               │   │
│  │     Cost: Free                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ CLOUD STORAGE (Optional - for file uploads) ────────┐  │
│  │  ├─ Store documents, diary images, homework      │  │
│  │  └─ Cost: 5GB free; $0.018/GB after             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ CLOUD SCHEDULER (Optional - cleanup jobs) ───────────┐ │
│  │  ├─ Archive old audit logs                      │ │
│  │  └─ Cost: Free for ≤3 jobs                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ CLOUD MONITORING (Included - logging & metrics) ────┐ │
│  │  ├─ Error tracking, performance dashboards      │ │
│  │  └─ Cost: Included with Cloud Functions        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Service Setup Checklist

### Phase 1: Database & Auth (Already done or quick setup)

- [ ] **Firestore Database**
  - [ ] Create database (default/staging location)
  - [ ] Set up collections: /users, /audit, /archived_users
  - [ ] Create composite indexes (Firestore will prompt)
  - [ ] Enable real-time sync in client libraries

- [ ] **Firebase Authentication**
  - [ ] Verify Google OAuth is configured (already done)
  - [ ] Set VITE_FIREBASE_ADMIN_EMAIL in .env
  - [ ] Test admin Google sign-in still works

### Phase 2: Cloud Functions Deployment

- [ ] **Create Cloud Functions Project**
  - [ ] `firebase init functions`
  - [ ] Select Node.js runtime

- [ ] **Install Dependencies**
  ```bash
  npm install bcryptjs jsonwebtoken firebase-admin express cors dotenv
  ```

- [ ] **Create Functions**
  - [ ] `functions/src/login.ts` - PIN verification
  - [ ] `functions/src/users-list.ts` - Query users
  - [ ] `functions/src/admin.ts` - Create/reset user
  - [ ] `functions/src/triggers.ts` - Firestore triggers

- [ ] **Set Environment Variables**
  ```bash
  firebase functions:config:set auth.jwt_secret="YOUR_256_BIT_HEX_SECRET"
  ```

- [ ] **Deploy Functions**
  ```bash
  firebase deploy --only functions
  ```

- [ ] **Test Functions**
  - [ ] POST /login with valid email + pin
  - [ ] GET /users-list?role=student
  - [ ] POST /create-user (admin)
  - [ ] POST /reset-pin (admin)

### Phase 3: Firestore Security Rules

- [ ] **Write Security Rules**
  - [ ] Users can only read own document
  - [ ] Admin can read all users
  - [ ] PIN field never readable by client
  - [ ] No client direct writes (functions only)

- [ ] **Deploy Rules**
  ```bash
  firebase deploy --only firestore:rules
  ```

### Phase 4: Frontend Integration

- [ ] **Update Login Page**
  - [ ] Call Cloud Function instead of localStorage
  - [ ] Store JWT token in localStorage
  - [ ] Display error messages from function

- [ ] **Update Routes**
  - [ ] Use JWT token for authorization
  - [ ] Add real-time listener for Firestore sync

- [ ] **Testing**
  - [ ] Test all 4 auth flows
  - [ ] Test multi-device sync
  - [ ] Test rate limiting

---

## Cost Breakdown (Typical School App)

### Monthly Costs

**100 students + 50 parents + 5 teachers + 1 admin**

| Service | Reads | Writes | Cost |
|---------|-------|--------|------|
| **Firestore** | 500 logins | 600 operations | $0.13 |
| **Cloud Functions** | 650 invocations | - | $0.00 |
| **Firebase Auth** | N/A | N/A | Free |
| **Cloud Storage** | (optional) | (optional) | Free |
| **Cloud Scheduler** | (optional) | (optional) | Free |
| **Cloud Monitoring** | Included | - | Free |
| **TOTAL** | - | - | **$0.13/month** |

**Result:** ✅ **Completely FREE** (under free tier)

---

## Scaling Analysis

| Users | Daily Logins | Firestore Ops/day | Monthly Cost |
|-------|--------------|-------------------|--------------|
| 100 | 50 | 100 | Free |
| 500 | 250 | 500 | Free |
| 1,000 | 500 | 1,000 | Free |
| 5,000 | 2,500 | 5,000 | Free |
| 10,000 | 5,000 | 10,000 | ~$1.50 |
| 50,000 | 25,000 | 50,000 | ~$7.50 |
| 100,000 | 50,000 | 100,000 | ~$15 |

**Key:** Scales automatically; no code changes needed.

---

## Cloud Functions Specifications

### `login` Function

| Property | Value |
|----------|-------|
| **Trigger** | HTTPS POST |
| **Memory** | 256 MB (default) |
| **Timeout** | 60 seconds |
| **Runtime** | Node.js 18+ |
| **Latency** | 100-200ms (bcrypt + Firestore) |
| **Cost** | $0.40 per 1M calls |
| **Inputs** | `{ email, pin, role }` |
| **Outputs** | `{ token, user, expiresIn }` or error |
| **Dependencies** | bcryptjs, jsonwebtoken, firebase-admin |

### `users-list` Function

| Property | Value |
|----------|-------|
| **Trigger** | HTTPS GET |
| **Memory** | 128 MB |
| **Timeout** | 30 seconds |
| **Runtime** | Node.js 18+ |
| **Latency** | 50-150ms (Firestore query) |
| **Cost** | $0.40 per 1M calls |
| **Inputs** | Query: `role=student&status=active` |
| **Outputs** | `[{ email, name, createdAt }, ...]` |
| **Dependencies** | firebase-admin |

### `create-user` Function

| Property | Value |
|----------|-------|
| **Trigger** | HTTPS POST (admin-only) |
| **Memory** | 256 MB |
| **Timeout** | 60 seconds |
| **Runtime** | Node.js 18+ |
| **Latency** | 100-200ms |
| **Cost** | $0.40 per 1M calls |
| **Inputs** | `{ name, email, role }` + JWT token |
| **Outputs** | `{ pin, email }` (one-time) |
| **Dependencies** | bcryptjs, firebase-admin |

---

## Security Rules Summary

### What Gets Locked Down

```firestore
✅ PIN field:        Never readable by client
✅ User documents:   Only readable by user or admin
✅ Audit logs:       Only readable by admin
✅ All writes:       Only via Cloud Functions (admin SDK)
✅ Rate limiting:    Enforced server-side
```

### What Stays Open

```firestore
✅ Public user list: Readable on login page (role + name only)
✅ Firebase Auth:    Public Google OAuth flow
✅ Client reads:     Own user document (for profile)
```

---

## Deployment Command Checklist

```bash
# 1. Initialize Firestore (if not done)
firebase init firestore

# 2. Initialize Cloud Functions (if not done)
firebase init functions

# 3. Deploy Firestore rules
firebase deploy --only firestore:rules

# 4. Deploy Cloud Functions
firebase deploy --only functions

# 5. Deploy everything
firebase deploy

# 6. View logs
firebase functions:log

# 7. Test function locally
firebase emulators:start --only functions
```

---

## What's NOT Part of This Architecture

- ❌ Node.js backend server (Express, NestJS, etc.)
- ❌ PostgreSQL or any SQL database
- ❌ Redis or any cache layer
- ❌ Load balancer
- ❌ VPS or container orchestration
- ❌ Message queue (unless scaling to 10k+ users)
- ❌ Third-party auth provider (Firebase Auth enough)

**Advantage:** Zero infrastructure to manage. Firebase handles everything.

---

## Summary Table

| Component | Service | Purpose | Cost |
|-----------|---------|---------|------|
| **User Data** | Firestore | Persistent storage | Free (50k/day) |
| **Auth API** | Cloud Functions | Backend logic | Free (2M/mo) |
| **Admin Auth** | Firebase Auth | Google Sign-In | Free |
| **Logging** | Firestore | Audit trail | Free (included) |
| **Monitoring** | Cloud Monitoring | Error tracking | Free (included) |
| **Files** | Cloud Storage | Uploads | Free (5GB) |
| **Scheduled Jobs** | Cloud Scheduler | Cleanup | Free (≤3 jobs) |

**Total Monthly Cost:** $0-5 (free tier covers entire school app)

---

## Implementation Order

1. ✅ Create Firestore collections & indexes
2. ✅ Deploy Cloud Functions (login, users-list, admin ops)
3. ✅ Set up Firestore security rules
4. ✅ Migrate existing users from localStorage
5. ✅ Update frontend to call Cloud Functions
6. ✅ Enable real-time listeners for sync
7. ✅ Full end-to-end testing
8. ✅ Monitor & stabilize

**Total Time:** ~2-3 weeks (with thorough testing)

---

## Questions Before Starting

1. Should I generate a new JWT secret, or do you have one?
2. Want welcome emails on user creation? (Requires SendGrid/Gmail API setup)
3. Any compliance requirements (GDPR, COPPA)? (Affects audit logging)
4. Want to test on staging first, or straight to production?
5. Any existing custom features that need special handling?
