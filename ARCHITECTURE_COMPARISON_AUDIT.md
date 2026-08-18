# ARCHITECTURE COMPARISON AUDIT

**Reference Project:** D:\stack-tracker (Complete role/workspace architecture)  
**Target Project:** D:\wafi-learning-buddy-new (Current: Google + PIN hybrid, needs simplification)  
**Date:** August 18, 2026  
**Status:** Audit complete - Ready for implementation plan approval

---

## A. REFERENCE PROJECT EXACT ARCHITECTURE

### A.1 Google Authentication Flow (stack-tracker)

**File:** `src/routes/index.tsx`

```typescript
// 1. Google sign-in handler
const handleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const signedInUser = result.user;
  
  // 2. Check email whitelist
  const isWhitelisted = WHITELISTED_EMAILS.includes(signedInUser.email);
  
  // 3. Check workspace membership (even if not whitelisted)
  const workspaceMembership = await checkWorkspaceMembership(signedInUser);
  
  // 4. Allow if whitelisted OR workspace member
  if (!isWhitelisted && !workspaceMembership) {
    await signOut(auth);
    toast.error("Access Denied");
    return;
  }
  
  // 5. Sync user to Firestore /users collection
  await syncUserToFirestore(signedInUser);
  
  // 6. Set workspace
  if (workspaceMembership && !isWhitelisted) {
    setCurrentWorkspaceId(workspaceMembership.workspaceId);
  } else {
    await checkAndCreateDefaultWorkspace(signedInUser);
  }
  
  // 7. Update state
  setUser(signedInUser);
  setIsAuthenticated(true);
};
```

**Whitelist:** `WHITELISTED_EMAILS = ["rocky.hsn@gmail.com", "munatahsin92@gmail.com"]`

**Summary:**
- ✅ Google OAuth only
- ✅ Whitelist + workspace membership dual access
- ✅ User synced to Firestore /users on first login
- ✅ Default workspace auto-created for whitelisted users
- ✅ Session persisted via Firebase Auth browserLocalPersistence

---

### A.2 User/Role Data Structure (stack-tracker)

**Firestore Collections:**

```typescript
// 1. /users/{uid}
{
  uid: string;                 // Firebase UID
  name: string;                // From displayName
  email: string;               // From Google
  photoURL: string;            // From Google
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

// 2. /workspaces/{workspaceId}
{
  id: string;
  name: string;
  ownerId: string;             // user.uid of workspace owner
  createdAt: string;
}

// 3. /workspace_members/{invitationId}
{
  id: string;                  // "{workspaceId}_{email}"
  workspaceId: string;
  email: string;               // Invited email (normalized lowercase)
  role: "Admin" | "Developer" | "Client";
  status: "pending" | "accepted";
  uid?: string;                // Firebase UID (populated on acceptance)
  name?: string;
  invitedAt: string;
  updatedAt?: string;
}

// 4. /projects, /tasks, /logs, etc. (workspace-scoped)
// Each has workspaceId field for multi-tenancy
```

**Role Determination Logic:**

```typescript
useEffect(() => {
  if (!user || !currentWorkspaceId) {
    setUserRole(null);
    return;
  }

  // 1. Is workspace owner? → Admin
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  if (currentWorkspace?.ownerId === user.uid) {
    setUserRole("Admin");
    return;
  }

  // 2. Is invited member? → Use workspace_members role
  const memberEntry = workspaceMembers.find(
    m => m.email === user.email?.toLowerCase().trim()
  );
  if (memberEntry) {
    setUserRole(memberEntry.role);
  } else {
    setUserRole(null);
  }
}, [user, currentWorkspaceId, workspaces, workspaceMembers]);
```

---

### A.3 Exact Role Names & Permissions (stack-tracker)

**Role Constants:**

```typescript
const ROLE_PERMISSIONS = {
  Admin: [
    "dashboard",
    "projects",
    "tasks",
    "calendar",
    "chat",
    "technical",
    "ai_assistant",
    "team",        // Can manage team members
    "settings"     // Can manage workspace settings
  ],
  Developer: [
    "dashboard",
    "projects",
    "tasks",
    "calendar",
    "chat",
    "technical",
    "ai_assistant"
  ],
  Client: [
    "dashboard",
    "projects",
    "tasks",
    "calendar"
  ]
} as const;
```

**Permission Helpers:**

```typescript
const isAdmin = useMemo(() => userRole === "Admin", [userRole]);
const isDeveloper = useMemo(() => userRole === "Developer", [userRole]);
const isClient = useMemo(() => userRole === "Client", [userRole]);
const canEdit = useMemo(() => userRole === "Admin" || userRole === "Developer", [userRole]);
const canDelete = useMemo(() => userRole === "Admin", [userRole]);
const canInvite = useMemo(() => userRole === "Admin", [userRole]);

const isViewAllowed = (viewId: string) => {
  const currentRole = userRole || "Developer";
  const allowed = ROLE_PERMISSIONS[currentRole];
  return allowed.includes(viewId);
};
```

**Permission Matrix:**

| Feature | Admin | Developer | Client |
|---------|-------|-----------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Projects (view) | ✅ | ✅ | ✅ |
| Projects (create) | ✅ | ✅ | ❌ |
| Tasks (view) | ✅ | ✅ | ✅ |
| Tasks (edit) | ✅ | ✅ | ❌ |
| Calendar | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ❌ |
| Technical Planning | ✅ | ✅ | ❌ |
| AI Assistant | ✅ | ✅ | ❌ |
| Team Management | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

---

### A.4 Role Determination After Google Login (stack-tracker)

**Sequence:**

1. **Google OAuth successful** → User authenticated in Firebase Auth
2. **onAuthStateChanged** fires → Retrieves user.uid, user.email, user.displayName
3. **syncUserToFirestore()** → Writes/updates /users/{uid}
4. **checkWorkspaceMembership()** → Query /workspace_members by email
5. **setCurrentWorkspaceId()** → Set first available workspace
6. **Determine role in useEffect:**
   - Is owner? → "Admin"
   - Is member? → Use role from /workspace_members
   - Otherwise → null (blocked)

---

### A.5 Dashboard Routing by Role (stack-tracker)

**Implementation:**

```typescript
// Tab-based view routing
const [activeView, setActiveView] = useState<
  | "dashboard"
  | "projects"
  | "tasks"
  | "calendar"
  | "content"
  | "technical"
  | "chat"
  | "settings"
  | "ai_assistant"
  | "team"
>("dashboard");

// Guard: Fall back to dashboard if view not allowed
useEffect(() => {
  const currentRole = userRole || "Developer";
  const allowedViews = ROLE_PERMISSIONS[currentRole];
  if (!allowedViews.includes(activeView)) {
    setActiveView("dashboard");
  }
}, [userRole, activeView]);

// UI: Render only allowed tabs
const isViewAllowed = (viewId: string) => {
  const currentRole = userRole || "Developer";
  return (ROLE_PERMISSIONS[currentRole] as readonly string[]).includes(viewId);
};

// Nav buttons conditionally show
{isViewAllowed("projects") && <button onClick={() => setActiveView("projects")}>Projects</button>}
{isViewAllowed("team") && <button onClick={() => setActiveView("team")}>Team</button>}
{isViewAllowed("settings") && <button onClick={() => setActiveView("settings")}>Settings</button>}
```

---

### A.6 Admin Controls (stack-tracker)

**Admin Capabilities:**

```typescript
// 1. Create workspace
const createWorkspace = async () => {
  const workspaceId = crypto.randomUUID();
  await setDoc(doc(db, "workspaces", workspaceId), {
    id: workspaceId,
    name: newWorkspaceName,
    ownerId: user.uid,        // Admin is owner
    createdAt: now
  });
};

// 2. Invite members
const sendInvitation = async () => {
  const email = inviteEmail.toLowerCase().trim();
  const invitationId = `${currentWorkspaceId}_${email}`;
  await setDoc(doc(db, "workspace_members", invitationId), {
    workspaceId: currentWorkspaceId,
    email,
    role: inviteRole,         // Admin assigns role
    status: "pending"
  });
};

// 3. Revoke invitation
const revokeInvitation = async (invitationId: string) => {
  await deleteDoc(doc(db, "workspace_members", invitationId));
};

// 4. Create/edit/delete projects (via Firestore)
// 5. Create/edit/delete tasks
// 6. Manage workspace settings

// Permission: Only if userRole === "Admin"
{userRole === "Admin" && <button onClick={onOpenInviteDialog}>Invite Member</button>}
```

---

### A.7 Firestore Security (stack-tracker)

**NO Firestore Rules File in project** - Uses default deny + client-side permission checks

**Data Protection Method:**
- Client-side role checking (ROLE_PERMISSIONS)
- Firestore write guards before mutations
- Admin SDK for sensitive operations (if backend exists)
- Real-time Firestore listeners load data based on user role

**Protection Layers:**
```typescript
// Before any write operation:
if (!canEdit) {
  toast.error("You don't have permission to edit");
  return;
}

// Workspace scoping: only show/return data for currentWorkspaceId
const tasksRef = collection(db, "tasks");
const q = query(
  tasksRef,
  where("workspaceId", "==", currentWorkspaceId)
);
```

---

### A.8 Admin-Only Mutations (stack-tracker)

**Enforced by:**

1. **Client-side guard:**
   ```typescript
   if (userRole !== "Admin") {
     toast.error("Admin only");
     return;
   }
   ```

2. **Permission checks:**
   ```typescript
   const canDelete = useMemo(() => userRole === "Admin", [userRole]);
   
   if (!canDelete) return null;
   ```

3. **No Firestore Rules** - Application relies on client-side enforcement

---

### A.9 Developer vs Client Permissions (stack-tracker)

**Developer:**
- Can view: projects, tasks, calendar, chat, technical planning, AI
- Cannot: manage team, manage settings, create projects/tasks as editor

**Client:**
- Can view: projects, tasks, calendar only
- Cannot: edit, delete, chat, technical planning, team, settings

**Key Difference:**
- Developer: Full feature access but cannot manage workspace
- Client: Limited to viewing shared content

---

### A.10 Reusable Authorization Patterns (stack-tracker)

**1. Role Determination from Firestore:**
```typescript
// Check if owner
if (workspace.ownerId === user.uid) → Admin

// Check workspace_members collection
// Member role from record
```

**2. Permission Check Pattern:**
```typescript
const userRole = "Admin" | "Developer" | "Client" | null;

const isViewAllowed = (view: string) => {
  const allowed = ROLE_PERMISSIONS[userRole || "Developer"];
  return allowed.includes(view);
};

// Use everywhere view/feature is rendered
{isViewAllowed("team") && <TeamMembersView />}
```

**3. Workspace Scoping:**
```typescript
where("workspaceId", "==", currentWorkspaceId)
// Apply to every collection query
```

**4. Invitation/Membership Model:**
```typescript
// Invite by email (email is key)
// Accept when user first logs in
// Role assigned at invitation, not at login
```

---

## B. WAFI CURRENT EQUIVALENT

### B.1 Current Authentication (Wafi)

**File:** `src/lib/access-store.tsx`

```typescript
export type Role = "student" | "parent" | "teacher" | "admin";

// Google OAuth (admin only)
const signInAsAdmin = async () => {
  const result = await signInWithPopup(auth, provider);
  if (result.user.email === VITE_FIREBASE_ADMIN_EMAIL) {
    // Create admin user entry
    setUsers([...prev, { id: "u-firebase-admin", role: "admin", ... }]);
  }
};

// PIN-based login (all others)
const signIn = (email: string, pin: string) => {
  const found = users.find(u => u.email === email);
  if (found && found.pin === inputPin) {
    setEmail(found.email);
    return { ok: true };
  }
  return { ok: false };
};
```

**Status:**
- ✅ Google OAuth for admin working
- ❌ PIN login for student/teacher/parent (TO BE REMOVED)
- ❌ localStorage users array (TO BE REPLACED with /users Firestore)
- ❌ No workspace model

---

### B.2 Current User Data Structure (Wafi)

**localStorage:**
```typescript
localStorage["wafi.users-access"] = [
  {
    id: "u-1700000000",
    name: "Wafi Rahman",
    email: "wafi@example.com",
    role: "student",
    status: "active" | "disabled",
    permissions: FeatureKey[],
    pin: "1234"  // ❌ TO REMOVE
  }
]

localStorage["wafi.session.email"] = "user@example.com"
```

**No Firestore /users collection yet**

---

### B.3 Current Role Names (Wafi)

```typescript
type Role = "student" | "parent" | "teacher" | "admin";

// Feature matrix (very detailed)
rolePresets: Record<Role, FeatureKey[]> = {
  student: [dashboard, study, homework, ai-teacher, scan, vocabulary, ...],
  parent: [dashboard, parent-mode, progress, homework, ...],
  teacher: [dashboard, study, homework, question-bank, ...],
  admin: [all features]
}
```

**Difference from Reference:**
- Reference has 3 roles (Admin, Developer, Client)
- Wafi has 4 roles (admin, teacher, parent, student)
- **Need to clarify:** Should Wafi keep 4 roles or simplify to 3?

---

### B.4 Current Frontend Files (Wafi)

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/access-store.tsx` | User auth + roles | ⚠️ Needs major refactor |
| `src/routes/index.tsx` | Login page | ✅ Works for Google, needs PIN removal |
| `src/lib/firebase.ts` | Firebase init | ✅ Ready |
| `src/routes/admin/$userId.tsx` | Admin user management | ⚠️ Needs /users Firestore sync |
| `src/components/route-guard.tsx` | Feature access control | ✅ Can reuse pattern |

---

## C. EXACT DIFFERENCES

| Aspect | Reference (stack-tracker) | Wafi Current | Wafi After Simplification |
|--------|---|---|---|
| Auth Method | Google OAuth only | Google + PIN | **Google OAuth only** |
| User Storage | Firestore /users | localStorage | **Firestore /users** |
| Roles | 3 (Admin, Dev, Client) | 4 (admin, teacher, parent, student) | **Keep 4 (clarify needed)** |
| Workspace Model | Multi-workspace | N/A | **Single workspace? Or keep multi?** |
| Admin Control | Invite + role assign | Manual creation + PIN | **Invite by email** |
| Permission Check | Role-based PERMISSION matrix | Feature-based (fine-grained) | **Keep feature-based** |
| Firestore Rules | None (client-side) | V5.1 Rules (get() checks) | **Keep V5.1 Rules or simplify?** |
| Content (diary/exams) | Per-project | Shared classroom | **Keep shared** |

---

## D. WHAT WAFI NEEDS TO CHANGE TO MATCH REFERENCE

### D.1 Remove PIN Infrastructure (Phase 2A Cleanup)

**Files/Code to DELETE or DEPRECATE:**

1. **functions/src/auth.ts** - PIN login functions
   - ❌ pinLogin()
   - ❌ resetPin()
   - ❌ getLoginUsers()

2. **functions/src/users.ts** - PIN-based createUser
   - ⚠️ Modify createUser() to NOT create PIN hash

3. **functions/src/test-fixtures.ts** - PIN test data
   - ❌ Delete or deprecate

4. **functions/src/createUser.test.ts** - PIN rollback tests
   - ❌ Delete or deprecate (tests PIN compensation rollback, not needed without PIN)

5. **firestore.rules** - /userCredentials collection
   - ❌ Remove /userCredentials rules
   - ⚠️ Keep /users, /diary, /exams rules

6. **src/routes/index.tsx** - PIN entry keypad
   - ❌ Remove PIN numeric keypad UI
   - ❌ Remove PIN validation logic
   - ✅ Keep Google OAuth button

7. **src/lib/access-store.tsx** - PIN functions
   - ❌ Remove signIn(email, pin) → all login via Google
   - ❌ Remove PIN generation/validation
   - ⚠️ Keep role permission checking

---

### D.2 Migrate to Firestore /users (Adopt Reference Pattern)

**Files/Code to MODIFY:**

1. **src/lib/access-store.tsx**
   ```typescript
   // OLD:
   const [users, setUsers] = useState<AccessUser[]>(seedUsers);
   localStorage["wafi.users-access"]
   
   // NEW (like reference):
   const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
   const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
   
   // Real-time listener:
   const membersRef = collection(db, "workspace_members");
   const unsubscribe = onSnapshot(membersRef, (snapshot) => {
     setWorkspaceMembers(snapshot.docs.map(d => d.data()));
   });
   ```

2. **src/routes/index.tsx**
   ```typescript
   // OLD:
   - Role selection cards (student, teacher, parent)
   - PIN keypad
   - PIN validation
   
   // NEW (like reference):
   - Google Sign-In button (keep Rocky's existing flow)
   - Whitelist check
   - Auto-set workspace
   - onAuthStateChanged sets user/role
   ```

3. **firestore.rules**
   ```
   // ADD:
   /workspace_members/{memberId}
   /workspaces/{workspaceId}
   
   // KEEP:
   /users/{uid}
   /diary/{diaryId}
   /exams/{examId}
   
   // REMOVE:
   /userCredentials/{uid}
   ```

4. **Cloud Functions**
   ```typescript
   // NEW OR MODIFY:
   - createUser() → No PIN hash (use workspace invitation model)
   - getWorkspaceMembers() → List workspace members
   - sendInvitation() → Invite by email to workspace
   
   // DELETE:
   - pinLogin()
   - resetPin()
   - getLoginUsers()
   ```

---

## E. QUESTION: SHOULD WAFI KEEP 4 ROLES OR ADOPT 3?

**Reference Project:** 3 roles (Admin, Developer, Client)

**Wafi Current:** 4 roles (admin, teacher, parent, student)

**Analysis:**

**Option 1: Keep 4 roles (education-specific)**
```
admin        → Admin (workspace owner, content creator)
teacher      → Developer (can view/edit curriculum, assign homework)
parent       → Client (view-only progress, homework)
student      → ??? (viewer? read-only? limited?)
```

**Option 2: Adopt 3 roles (align with reference)**
```
admin        → Admin
teacher      → Developer
parent/student → Client (merged)
```

**Recommendation:** Keep 4 roles if Wafi's features need it (e.g., students need different permissions than parents). But clarify with user what each role should do.

---

## F. FILES TO KEEP / REMOVE / MODIFY

### F.1 Keep (No changes)

- ✅ `src/lib/firebase.ts` - Firebase init (already good)
- ✅ `src/lib/school-content.tsx` - Diary/exams sync (keep working)
- ✅ `src/routes/admin/diary.tsx` - Admin diary editor
- ✅ `src/routes/admin/exams.tsx` - Admin exams editor
- ✅ `src/components/route-guard.tsx` - Feature access (can reuse pattern)

### F.2 Remove/Deprecate (No longer needed)

- ❌ `functions/src/auth.ts` - Delete (PIN functions)
- ❌ `functions/src/test-fixtures.ts` - Delete (PIN test data)
- ❌ `functions/src/createUser.test.ts` - Delete (PIN rollback tests)
- ❌ `functions/src/emulator.test.ts` - Delete (or keep for Firestore Rules testing)
- ❌ `/userCredentials rules in firestore.rules`
- ❌ PIN-related code in `src/lib/access-store.tsx`

### F.3 Modify (Keep but refactor)

- ⚠️ `src/lib/access-store.tsx` - Refactor for Google-only + Firestore /users
- ⚠️ `src/routes/index.tsx` - Remove PIN keypad, keep Google OAuth
- ⚠️ `functions/src/users.ts` - Simplify createUser (no PIN hash)
- ⚠️ `functions/src/index.ts` - Remove PIN function exports
- ⚠️ `firestore.rules` - Add /workspace_members, /workspaces, remove /userCredentials

---

## G. EXACT IMPLEMENTATION ORDER

### Phase 1: Delete/Deprecate PIN Infrastructure

1. Delete `functions/src/auth.ts` (entire file - pinLogin, resetPin, getLoginUsers)
2. Delete `functions/src/test-fixtures.ts` (entire file)
3. Delete `functions/src/createUser.test.ts` (entire file)
4. Optionally keep `functions/src/emulator.test.ts` for Firestore Rules testing

### Phase 2: Firestore Rules Update

1. Remove /userCredentials rules
2. Add /workspace_members rules (allow read all, write by admin)
3. Add /workspaces rules (allow read by owner/members, write by owner)
4. Keep /users, /diary, /exams rules (simplify if needed)

### Phase 3: Cloud Functions Simplification

1. Remove pinLogin export
2. Remove resetPin export
3. Remove getLoginUsers export
4. Simplify createUser() to not use PIN (or mark as deprecated)
5. Add inviteUserToWorkspace() function (invite by email)

### Phase 4: Frontend Login Refactor

1. Update `src/routes/index.tsx`
   - Remove role selection cards
   - Remove PIN keypad UI
   - Keep Google Sign-In button
   - Add onAuthStateChanged → auto-role detection

2. Update `src/lib/access-store.tsx`
   - Replace localStorage["wafi.users-access"] with Firestore listeners
   - Keep Google OAuth signInAsAdmin
   - Add role detection from /users + /workspace_members
   - Keep feature permission checks (can reuse ROLE_PERMISSIONS)

### Phase 5: Testing & Verification

1. Test Google OAuth login → /users Firestore sync
2. Test role detection (owner → Admin, member → assigned role)
3. Test permission-based view routing
4. Test diary/exams access (kept from V5.1)
5. Test admin controls (if workspace/member management added)

---

## H. ARCHITECTURE COMPARISON TABLE

| Component | Reference Project | Wafi Currently | Wafi After Changes |
|-----------|---|---|---|
| **Auth** | Google OAuth | Google + PIN | Google OAuth only |
| **User Storage** | Firestore /users | localStorage | Firestore /users |
| **Role Model** | Admin/Developer/Client | admin/teacher/parent/student | Keep 4 (to clarify) |
| **Role Assignment** | Workspace membership | Manual user creation | Invitation by email |
| **Permission Check** | ROLE_PERMISSIONS matrix | Feature-based array | Keep feature-based (adapt matrix) |
| **Firestore Rules** | Minimal (client-side) | V5.1 detailed rules | Keep V5.1 or simplify |
| **Content Model** | Per-project | Shared classroom | Keep shared |
| **Workspace** | Multi-workspace | N/A | Single workspace? (to clarify) |
| **Admin Control** | Invite + settings | Manual edit | Invite + workspace mgmt |
| **Data Sync** | Real-time listeners | Mixed (Firebase + localStorage) | Real-time listeners |

---

## CRITICAL CLARIFICATIONS NEEDED FROM USER

Before implementing:

1. **Roles:** Keep 4 roles (admin, teacher, parent, student) or simplify to 3?
2. **Workspace:** Single shared workspace for whole school, or multi-workspace?
3. **Admin:** Is Rocky the only admin, or can others be invited as Admin?
4. **Diary/Exams:** Keep current rules (read-restricted, write-admin-only)?
5. **Firestore Rules:** Simplify V5.1 rules or keep as-is?

---

## SUMMARY

✅ **Audit complete. No code changes made.**

**Architecture Comparison:**
- Reference project: Google + workspace + role-based permissions (3 roles)
- Wafi current: Google + PIN + feature-based permissions (4 roles)
- Wafi after: Google + workspace + role-based (4 roles - simplified from PIN)

**Action Items:**
1. Delete Phase 2A PIN infrastructure
2. Adopt reference project's Firestore /users + /workspace_members pattern
3. Adapt reference's ROLE_PERMISSIONS pattern to Wafi's 4 roles
4. Keep Wafi's detailed feature-based permissions (compatible)
5. Keep diary/exams access patterns (compatible with reference)

**Status:** Ready for implementation plan approval once user clarifies 5 questions above.

