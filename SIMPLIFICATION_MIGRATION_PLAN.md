# SIMPLIFICATION MIGRATION PLAN

**Objective:** Remove PIN authentication, keep Google OAuth, adopt reference project's Firestore architecture  
**Duration:** Estimated 2-3 implementation phases  
**Status:** Awaiting final user approval + clarifications

---

## QUICK SUMMARY

**FROM:** Google OAuth + PIN-based (hybrid, complex)  
**TO:** Google OAuth only + Firestore /users (simple, reference-aligned)

**Key Changes:**
- ❌ Remove PIN login, PIN keypad, PIN hashing, /userCredentials
- ✅ Keep Google OAuth (Rocky's existing flow works)
- ✅ Keep diary/exams functionality
- ✅ Adopt reference project's role + workspace pattern
- ✅ Keep Wafi's detailed feature-based permissions

---

## A. FILES TO KEEP

**No changes needed:**

```
✅ src/lib/firebase.ts                  (Firebase config)
✅ src/lib/school-content.tsx           (Diary/exams sync)
✅ src/routes/admin/diary.tsx           (Admin diary)
✅ src/routes/admin/exams.tsx           (Admin exams)
✅ src/components/route-guard.tsx       (Feature guard)
✅ src/lib/mock-data.ts                 (Test data)
✅ firebaserc, .env.local               (Config)
```

---

## B. FILES TO REMOVE/DEPRECATE

**Delete entirely:**

```
❌ functions/src/auth.ts                (All PIN auth functions)
❌ functions/src/test-fixtures.ts       (PIN test users)
❌ functions/src/createUser.test.ts     (PIN rollback tests)
```

**Optionally keep:**

```
⚠️  functions/src/emulator.test.ts      (Can keep for Firestore Rules testing)
⚠️  PHASE_2A_*.md files                 (Archive/reference only)
```

---

## C. FILES TO MODIFY

### C.1 Highest Priority

**1. src/routes/index.tsx** (Login UI)

```
REMOVE:
  ❌ Role selection cards (Student, Teacher, Parent)
  ❌ PIN keypad numeric buttons
  ❌ PIN input validation
  ❌ signIn(email, pin) call
  
KEEP:
  ✅ Google Sign-In button (Rocky's existing flow)
  ✅ Logo, tagline, theme toggle
  ✅ LangToggle (English/Bangla)

ADD:
  ✅ onAuthStateChanged listener
  ✅ Auto-redirect to dashboard after Google login
  ✅ Error handling for non-whitelisted/non-member emails
```

**2. src/lib/access-store.tsx** (Auth store)

```
REMOVE:
  ❌ const seedUsers = [] (PIN-based)
  ❌ signIn(email, pin) function
  ❌ changePIN() function
  ❌ resetPIN() function
  ❌ PIN generation logic
  ❌ localStorage["wafi.users-access"] persistence

KEEP:
  ✅ signInAsAdmin() (Google OAuth)
  ✅ signOut()
  ✅ Feature permission checking (rolePresets, can() helper)
  ✅ Role labels + emojis

ADD:
  ✅ Firestore real-time listener for /workspace_members
  ✅ Role determination from /users + /workspace_members (like reference)
  ✅ currentWorkspaceId state
  ✅ workspaceMembers state
```

**3. firestore.rules**

```
REMOVE:
  ❌ match /userCredentials/{uid} { allow read, write: if false; }

ADD:
  ✅ match /workspace_members/{memberId}
  ✅ match /workspaces/{workspaceId}

KEEP:
  ✅ match /users/{uid}
  ✅ match /diary/{diaryId}
  ✅ match /exams/{examId}
  ✅ isUserActive() helper function (V5.1)
```

### C.2 Medium Priority

**4. functions/src/users.ts** (User management)

```
MODIFY:
  ⚠️  createUser() → Remove PIN hash creation
              → Maybe mark as deprecated (use inviteUserToWorkspace instead)

ADD:
  ✅ inviteUserToWorkspace(email, role, workspaceId)
  ✅ acceptInvitation(uid, email)
  ✅ removeWorkspaceMember(uid, email, workspaceId)
```

**5. functions/src/index.ts** (Exports)

```
REMOVE:
  ❌ export { pinLogin, resetPin, getLoginUsers } from "./auth"
  ❌ export { pinLogin as default } (any PIN references)

UPDATE:
  ✅ export { inviteUserToWorkspace, acceptInvitation } from "./users"
```

### C.3 Low Priority

**6. src/routes/admin/$userId.tsx**

```
MODIFY:
  ⚠️  If exists: Update to use /users + /workspace_members pattern
      (May not exist yet - check before modifying)
```

**7. firebase.json**

```
KEEP:
  ✅ Existing config
  
REMOVE:
  ❌ Remove Cloud Functions if only used for PIN auth
      (Keep if using for other purposes)
```

---

## D. FINAL AUTHENTICATION FLOW

```
1. User visits app
   ↓
2. Display login page
   ↓
3. Click "Google Sign-In" button
   ↓
4. Google OAuth popup
   ↓
5. Google authenticates user
   ↓
6. Firebase Auth confirms sign-in
   ↓
7. syncUserToFirestore() → Creates /users/{uid}
   ↓
8. checkWorkspaceMembership() → Queries /workspace_members by email
   ↓
9. onAuthStateChanged fires
   ↓
10. Determine role:
    - Is /users/{uid}.role = "admin"? → Admin
    - Is member of /workspace_members? → Use assigned role
    - Otherwise → Blocked
   ↓
11. Set currentWorkspaceId
   ↓
12. Auto-navigate to /dashboard
   ↓
13. Dashboard renders based on user.role + ROLE_PERMISSIONS
```

---

## E. FINAL ROLE/PERMISSION MATRIX

**Wafi Roles (keep 4):**

| Feature | admin | teacher | parent | student |
|---------|-------|---------|--------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Diary (read) | ✅ | ✅ | ✅ | ✅ |
| Diary (write) | ✅ | ❌ | ❌ | ❌ |
| Exams (read) | ✅ | ✅ | ✅ | ✅ |
| Exams (write) | ✅ | ❌ | ❌ | ❌ |
| Homework (view) | ✅ | ✅ | ✅ | ✅ |
| Homework (assign) | ✅ | ✅ | ❌ | ❌ |
| Progress (view) | ✅ | ✅ | ✅ | ✅ |
| Progress (all students) | ✅ | ❌ | ❌ | ❌ |
| Admin panel | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ |

*(Clarify actual permissions with user - this is template)*

---

## F. FIRESTORE RULES STRATEGY

**Keep V5.1 Rules as-is?**

**Current V5.1:**
```
/users: Read by owner+admin, write: Cloud Functions only
/userCredentials: Deny all (remove entirely)
/diary: Read by active users, write by admin
/exams: Read by active users, write by admin
```

**Recommended Simplification:**
```
/users: Read by owner+admin, write: Cloud Functions only
/workspace_members: Read by workspace members, write: Cloud Functions only
/workspaces: Read by workspace members, write: admin only
/diary: Read by workspace members, write: admin only
/exams: Read by workspace members, write: admin only
```

*(Firestore Rules can be simplified if all users are part of single workspace)*

---

## G. IMPLEMENTATION SEQUENCE (7 Steps)

### Step 1: Backup & Prepare
- [ ] Backup current code (git commit "Pre-simplification backup")
- [ ] Archive Phase 2A files
- [ ] Document current state

### Step 2: Delete PIN Infrastructure
- [ ] Delete `functions/src/auth.ts`
- [ ] Delete `functions/src/test-fixtures.ts`
- [ ] Delete `functions/src/createUser.test.ts`
- [ ] Update `functions/src/index.ts` (remove exports)

### Step 3: Update Firestore Rules
- [ ] Remove /userCredentials rules
- [ ] Add /workspace_members rules
- [ ] Add /workspaces rules
- [ ] Deploy to staging

### Step 4: Refactor Login UI
- [ ] Remove role selection cards
- [ ] Remove PIN keypad
- [ ] Keep Google Sign-In button
- [ ] Test with Rocky's existing Google account

### Step 5: Refactor Auth Store
- [ ] Replace localStorage with Firestore listeners
- [ ] Add role detection from /users + /workspace_members
- [ ] Keep feature permission checks
- [ ] Test login → role assignment → dashboard navigation

### Step 6: Update Admin Functions (if needed)
- [ ] Simplify or deprecate createUser()
- [ ] Add inviteUserToWorkspace()
- [ ] Update /users Firestore sync

### Step 7: Testing & Verification
- [ ] Google OAuth login works
- [ ] Role auto-assigned correctly
- [ ] Dashboard shows correct features per role
- [ ] Diary/exams access unchanged
- [ ] Admin controls work
- [ ] Fresh incognito test
- [ ] Existing data preserved

---

## BEFORE STARTING - USER MUST CLARIFY

1. **Roles:** Keep 4 (admin, teacher, parent, student) or change?
   - If 4: What exact permissions for student vs parent?
   - If 3: Map to Admin/Developer/Client?

2. **Workspace Model:** Single or multiple?
   - Single: All users in one workspace (school)
   - Multiple: Each class is separate workspace

3. **Admin Assignment:** Rocky only, or can others be admin?

4. **Diary/Exams:** Continue current rules (admin-write only)?

5. **Feature List:** Keep all current features, or simplify?

---

## NO CODE CHANGES YET

✅ Audit complete  
✅ Comparison done  
✅ Migration plan created  

⏳ Awaiting user approval to proceed

---

**Status: READY FOR APPROVAL**

Next: User confirms clarifications → Begin implementation

