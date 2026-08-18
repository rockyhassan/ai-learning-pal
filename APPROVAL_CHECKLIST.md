# FINAL MIGRATION PLAN - APPROVAL CHECKLIST

**Project:** Wafi Learning Buddy  
**Objective:** Remove PIN auth, simplify to Google-only  
**Status:** ✅ Ready for implementation approval

---

## CONFIRMED REQUIREMENTS

- [x] Keep 4 roles: admin, teacher, parent, student (NOT 3)
- [x] Single school, NO multi-workspace model
- [x] Rocky (rockyhsn9@gmail.com) is sole admin
- [x] Diary/exams: read by active users, write by admin only
- [x] Keep 19-feature permission system
- [x] Google OAuth for everyone
- [x] Remove all PIN infrastructure
- [x] Design simple admin-authorization onboarding

---

## PLAN DOCUMENTS CREATED

✅ **ARCHITECTURE_COMPARISON_AUDIT.md**
   - Reference project analysis
   - Current Wafi analysis
   - Differences identified

✅ **SIMPLIFICATION_MIGRATION_PLAN.md** (Initial draft)
   - Earlier version with clarifications needed

✅ **FINAL_MIGRATION_PLAN.md** (APPROVED VERSION)
   - Final architecture
   - Final authentication flow
   - Final role/permission model
   - Files: remove/modify/keep
   - 7-phase implementation order
   - Security enforcement layers

---

## A. FINAL WAFI ARCHITECTURE

### Components:

```
✅ /users/{uid}              (Source of truth for role/status)
✅ /authorizedEmails         (Admin pre-authorization)
✅ /diary/{diaryId}          (Read: active users, Write: admin)
✅ /exams/{examId}           (Read: active users, Write: admin)
✅ Role-based permissions    (4 roles, 19 features)
✅ Google OAuth              (Single auth method)
✅ No workspace model        (Single school)
✅ No /userCredentials       (PIN removed)
```

---

## B. FINAL AUTHENTICATION FLOW

### 3 Steps:

1. **Admin Pre-Authorization**
   - Rocky authorizes email → role → status in /authorizedEmails or env

2. **User Google Login**
   - Google OAuth → Check authorized email → Create /users/{uid} → Route to dashboard

3. **Returning User**
   - Google OAuth → Load /users/{uid} → Check status → Route to dashboard

---

## C. FINAL ROLE/PERMISSION MODEL

### 4 Wafi Roles

```
admin     → All features, create/edit/delete content
teacher   → View content, assign homework, view progress
parent    → View child progress, homework, limited features
student   → View diary/exams, do practice, view progress
```

### 19 Features (Existing System)

```
dashboard, study, homework, ai-teacher, scan, vocabulary, 
pronunciation, question-bank, practice, games, progress, 
parent-mode, planner, notifications, documents, achievements, 
ai-memory, school-profile, admin
```

---

## D. FILES TO REMOVE

```
❌ functions/src/auth.ts              (PIN login functions)
❌ functions/src/test-fixtures.ts     (PIN test data)
❌ functions/src/createUser.test.ts   (PIN rollback tests)
```

---

## E. FILES TO MODIFY

```
⚠️  src/routes/index.tsx              (Remove PIN UI, keep Google button)
⚠️  src/lib/access-store.tsx          (Remove PIN funcs, add Firestore listener)
⚠️  firestore.rules                   (Remove /userCredentials)
⚠️  functions/src/users.ts            (Simplify createUser)
⚠️  functions/src/index.ts            (Remove PIN exports)
```

---

## F. FILES TO KEEP

```
✅ src/lib/firebase.ts
✅ src/lib/school-content.tsx
✅ src/routes/admin/diary.tsx
✅ src/routes/admin/exams.tsx
✅ src/components/route-guard.tsx
✅ All other existing code
```

---

## G. 7-PHASE IMPLEMENTATION ORDER

```
Phase 1: Cleanup (2-3h)          → Delete PIN infrastructure
Phase 2: Firestore (1-2h)        → Update rules, create /authorizedEmails
Phase 3: Backend (1-2h)          → Update Cloud Functions
Phase 4: Login UI (3-4h)         → Remove PIN keypad, keep Google
Phase 5: Auth Store (3-4h)       → Firestore listeners, role detection
Phase 6: Testing (2-3h)          → Local, staging, incognito
Phase 7: Deployment (1h)         → Production push
```

---

## DEPLOYMENT CHECKLIST

### Pre-Implementation

- [ ] Read and approve FINAL_MIGRATION_PLAN.md
- [ ] Confirm 4 roles, single school, Rocky-only admin
- [ ] Decide: /authorizedEmails vs .env vs hybrid
- [ ] Backup current code (git commit)
- [ ] Create staging branch

### After Each Phase

- [ ] Phase 1: Git commit "Remove PIN infrastructure"
- [ ] Phase 2: Test rules in staging
- [ ] Phase 3: Test functions in staging
- [ ] Phase 4: Test login UI
- [ ] Phase 5: Test auth store + role detection
- [ ] Phase 6: Pass all tests
- [ ] Phase 7: Deploy to production

### Post-Deployment

- [ ] Verify Rocky can log in
- [ ] Verify authorized teacher can log in
- [ ] Verify unauthorized email is rejected
- [ ] Verify diary/exams access is correct
- [ ] Verify admin panel works
- [ ] Monitor for errors

---

## KEY DECISIONS MADE

✅ **Auth Method:** Google OAuth only (no PIN, no custom tokens)  
✅ **User Storage:** Firestore /users as authoritative source  
✅ **Role Determination:** From /users document (set during first login)  
✅ **Admin Authorization:** Pre-authorize in /authorizedEmails or env  
✅ **Permissions:** Keep existing 19-feature system (not reference's 3-role matrix)  
✅ **Workspace:** Single school (no multi-workspace complexity)  
✅ **Security:** Firestore Rules enforce (not UI-only)  

---

## WHAT DOES NOT CHANGE

✅ Diary functionality (read-only for active users, write by admin)  
✅ Exams functionality (same as diary)  
✅ Feature permission system (19 features, per-role)  
✅ Existing Firebase config  
✅ Existing student/teacher/parent/admin dashboards  
✅ Existing UI components, styling, localization  
✅ Rocky's Google OAuth login (already working)  

---

## WHAT GETS REMOVED

❌ PIN login (entire system)  
❌ PIN keypad UI  
❌ PIN hashing (bcrypt)  
❌ /userCredentials collection  
❌ getLoginUsers(), pinLogin(), resetPin() functions  
❌ PIN custom-token authentication  
❌ PIN lockout logic  
❌ PIN-based user creation  

---

## SECURITY MODEL

### Authentication (Google + Firebase)
```
✅ Google Sign-In → Firebase Auth → Firebase UID
```

### Authorization (Firestore + Rules)
```
✅ /users:{uid}.role → Determine permissions
✅ /users:{uid}.status → Check if active/disabled
✅ Firestore Rules enforce read/write access
✅ Cloud Functions verify role before mutations
```

### Data Protection
```
✅ /users is source of truth
✅ Only admin can write diary/exams
✅ Disabled users cannot read/write
✅ Firestore Rules block unauthorized access
```

---

## ADMIN ONBOARDING PROCESS (FUTURE PHASE)

```
Current (Phase 7):
  1. Rocky manually adds authorized emails to /authorizedEmails

Future (Admin UI):
  1. Admin dashboard shows user management
  2. Admin can add/remove/disable users
  3. Admin can assign roles
  4. User email → role → status → permissions → features
```

---

## APPROVAL REQUIRED

**Before starting implementation, confirm:**

- [ ] Approve FINAL_MIGRATION_PLAN.md
- [ ] Confirm all 5 original requirements met
- [ ] Confirm 4 roles, single school, Google-only
- [ ] Confirm simple onboarding (email → Google → dashboard)
- [ ] Ready to proceed with Phase 1

---

## STATUS

✅ **Audit complete**  
✅ **Reference project analyzed**  
✅ **Current Wafi analyzed**  
✅ **Architecture simplified**  
✅ **Migration plan created**  
✅ **Requirements confirmed**  

⏳ **Awaiting approval to implement**

---

**Next:** User approves plan → Begin Phase 1 implementation

