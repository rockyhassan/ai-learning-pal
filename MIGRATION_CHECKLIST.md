# Migration Checklist - Quick Reference
**Status:** Ready for implementation (awaiting approval)  
**Real Users:** Rocky Hassan, Afreen, Wafi, Tahsin  
**Target:** 3-week phased migration (reversible)

---

## ✅ 4 KEY REVISIONS APPROVED?

- [ ] **POINT 1:** JWT system (not Firebase custom tokens) - simpler architecture
- [ ] **POINT 2:** Real-time listeners ≠ session revocation (both layers needed)
- [ ] **POINT 3:** Progressive lockout 15-30min (not 24h) - practical for school
- [ ] **POINT 4:** 3-phase gradual migration - reversible at each phase

---

## 📋 WHAT HAPPENS IN FRESH INCOGNITO BROWSER

```
1. User opens InPrivate/Incognito window
   └─ localStorage empty (new session)

2. Visits /login
   └─ Sees 3 columns: Student, Parent, Teacher

3. Clicks "Student"
   └─ Cloud Function queries Firestore
   └─ Shows list: Rocky Hassan, Afreen

4. Clicks "Rocky Hassan"
   └─ PIN keypad appears

5. Enters PIN: 1234
   └─ Cloud Function: bcrypt.compare()
   └─ Generates JWT token (30-day expiry)
   └─ Stores in localStorage

6. Dashboard loads
   └─ Shows student permissions (15 features)
   └─ Real-time listener subscribed
   └─ Can navigate dashboard

7. Closes & reopens browser
   └─ Private window = new localStorage
   └─ Must re-enter PIN
   └─ (Expected behavior for private windows)

8. Page refresh (same window)
   └─ localStorage still has token
   └─ JWT still valid (< 30 days)
   └─ Logged in immediately (no re-login)
```

---

## 🔐 SECURITY LAYERS

**Layer 1: UI Responsiveness (Real-time Listener)**
```
When admin disables user:
  ├─ Firestore updates immediately
  ├─ Listener fires (~100-500ms)
  ├─ UI shows "Account Disabled"
  ├─ UX feedback only (not security)
```

**Layer 2: Session Revocation (Backend Validation)**
```
When admin disables user:
  ├─ sessionRevision incremented in Firestore
  ├─ On next API call, backend checks:
  │   └─ token.sessionRevision (old) ≠ user.sessionRevision (new)
  ├─ Backend returns 401 Unauthorized
  ├─ Frontend catches 401 → Logout
  └─ Actual security enforcement
```

**Both layers work together:**
- Listener = fast UX (shows disabled state)
- Backend validation = actual security (rejects API calls)

---

## 🔒 BRUTE-FORCE PROTECTION (Progressive)

```
Failed Attempt # 1-3  → No lockout (just count)
Failed Attempt # 4    → 30-second delay
Failed Attempt # 5    → 2-minute lockout
Failed Attempt # 6    → 10-minute lockout
Failed Attempt # 7+   → 1-hour lockout
10+ attempts in day   → Admin notification
```

**Why:** Stops attackers while not frustrating legitimate users

---

## 📦 REAL USERS TO MIGRATE

| Name | Email | Role | PIN | Status |
|------|-------|------|-----|--------|
| Rocky Hassan | rocky@example.com | student | 1234 | active |
| Afreen | afreen@example.com | student | 5678 | active |
| Wafi | wafi@example.com | admin | 9999 | active |
| Tahsin | tahsin@example.com | teacher | 1111 | active |

**Migration:** All 4 PINs will be hashed (bcrypt) and stored in Firestore

---

## 📅 3-WEEK MIGRATION TIMELINE

### WEEK 1: Preparation

**Day 1:** Export backup from localStorage
```
Browser console:
  copy(JSON.stringify(JSON.parse(localStorage.getItem('wafi.users-access')), null, 2))
Save to: users-backup-2024-08-17.json
```

**Days 2-5:** Cloud Functions & Firestore setup
```
- Write Cloud Functions (login, users-list, create-user, reset-pin)
- Create Firestore collections (/users, /audit, /archived_users)
- Write security rules (NOT deployed yet)
- Test on staging environment
```

**Days 6-7:** Staging verification
```
- All 4 users login successfully on staging
- Admin operations work
- No errors in logs
```

### WEEK 2: Phase 1 (Parallel)

**Deployment:** Cloud Functions + Firestore to production

**Code change:** access-store.tsx reads from Firestore (with fallback to localStorage)

**Testing:** All 4 users login on production

**Status:** Both systems active, can rollback

### WEEK 3: Phase 2-3 (Cutover)

**Phase 2:** Remove localStorage fallback, read Firestore only

**Phase 3:** After verification, delete localStorage users array

**Final:** Firestore is sole source of truth

---

## ✔️ VERIFICATION BEFORE DELETION

**Run before deleting localStorage users:**

```javascript
await verifyMigrationComplete()

Checks:
  ✅ Count match: 4 local = 4 Firestore
  ✅ All names present: Rocky, Afreen, Wafi, Tahsin
  ✅ All emails correct
  ✅ All roles correct
  ✅ Can login as Rocky (success)
  ✅ Can login as Afreen (success)
  ✅ Can login as Wafi (admin access works)
  ✅ Can login as Tahsin (teacher access works)
  ✅ Can create new user via admin
```

**Only if ALL pass → Safe to delete**

---

## 🔄 ROLLBACK PROCEDURE

### If Phase 1 fails (Week 2):
```
1. Switch reads back to localStorage
2. Keep Firestore data (no deletion)
3. No user impact (reversible)
4. Fix issues, try again later
```

### If Phase 2 fails (Week 3):
```
1. Restore code to Phase 1
2. Firestore data intact
3. Restart from Phase 2
4. No user data lost
```

### If Phase 3 goes wrong (rare):
```
1. Restore from Firestore export
2. Re-run verification script
3. Firestore has all data (safely recoverable)
```

---

## 🚀 NO CODE CHANGES YET

**What's NOT done:**
- ❌ No application code modified
- ❌ No Firestore rules deployed
- ❌ No users migrated
- ❌ No Cloud Functions deployed
- ❌ No production changes

**What IS ready:**
- ✅ Architecture designed
- ✅ Migration plan detailed
- ✅ 3-week timeline clear
- ✅ Rollback procedures defined
- ✅ All 4 users' backup plan ready

---

## 📝 NEXT STEP: APPROVAL

**Please confirm:**

1. ✅ JWT approach (not Firebase custom tokens)
2. ✅ Real-time listeners for UX + backend validation for security
3. ✅ Progressive 15-30min lockout (practical)
4. ✅ 3-week gradual migration (reversible)

**Once approved, I will:**
1. Write Cloud Functions code
2. Write migration script
3. Write Firestore security rules
4. Write testing procedures
5. Create deployment guide

**All still WITHOUT any actual changes or deployment.**

---

## 🎯 ARCHITECTURE SUMMARY

```
AUTHENTICATION:
  ├─ Admin Google Sign-In → Firebase Auth (unchanged)
  └─ Student PIN Login → Cloud Function + JWT (new)

STORAGE:
  ├─ Users → Firestore /users collection (new)
  ├─ Audit logs → Firestore /audit collection (new)
  └─ Session token → localStorage (unchanged)

VALIDATION:
  ├─ UI sync → Real-time listeners (responsive)
  └─ API security → Backend JWT validation (enforced)

RATE LIMITING:
  └─ Progressive lockout 15-30min (Firestore counter + Cloud Function logic)

MULTI-DEVICE:
  ├─ Sync → Real-time listeners
  └─ Logout → sessionRevision increment + backend check
```

---

## 📞 CONFIRMATION NEEDED

Ready for implementation once you confirm all 4 points.

**Contact:** [Awaiting approval]
