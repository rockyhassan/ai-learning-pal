# SECURITY CORRECTION - ONBOARDING AUTHORIZATION

**Issue:** Client must not be able to read /authorizedEmails or choose its own role/status.

**Solution:** Move authorization to Cloud Function using Firebase Admin SDK.

---

## CORRECTED ONBOARDING FLOW

```
1. User visits app
   ↓
2. Clicks "Sign In with Google"
   ↓
3. Google OAuth popup
   ↓
4. User signs in with Google (e.g., "teacher@school.com")
   ↓
5. Firebase Auth confirms authentication → Returns Firebase UID + ID token
   ↓
6. CLIENT CALLS: ensureUserProfile Cloud Function
   - Pass: Firebase ID token
   - Pass: Google email (already authenticated)
   ↓
7. CLOUD FUNCTION (Server-Side):
   
   a. Verify ID token authenticity
   
   b. Extract UID + email from token
   
   c. Query /authorizedEmails/{email}
      (Using Admin SDK - client never reads this)
   
   d. If document NOT found:
      - Return error: "Email not authorized"
      - Client shows error, signs out
      - User cannot proceed
   
   e. If document found:
      - Extract: authorized_role, authorized_status
      - Check: document.verified === true (optional safety flag)
      - Create/update /users/{uid}:
        {
          uid: uid,
          email: email,
          name: displayName,
          role: authorized_role        (FROM FIRESTORE, NOT CLIENT)
          status: authorized_status    (FROM FIRESTORE, NOT CLIENT)
          photoURL: photoURL,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      - Return: success + role + status
      - Client receives role (no choice)
   
   f. If email is authorized BUT status="disabled":
      - Return error: "Account disabled"
      - Client signs out
      - User cannot proceed
   
   g. Return to client:
      {
        ok: true,
        uid: uid,
        role: role,
        status: status
      }
   ↓
8. CLIENT receives confirmed role + status
   (No room for client to inject different values)
   ↓
9. Client route handler:
   - Load /users/{uid} (user's own doc)
   - Verify role matches returned value
   - Route to dashboard
   ↓
10. Dashboard renders per role + Firestore Rules enforce
```

---

## REQUIRED CLOUD FUNCTION

### New Function: `ensureUserProfile(idToken)`

**Location:** `functions/src/users.ts` (add to existing file)

**Trigger:** Callable HTTPS function

**Input:**
```typescript
{
  idToken: string  (Firebase ID token from client)
}
```

**Output:**
```typescript
{
  ok: true,
  uid: string,
  role: "admin" | "teacher" | "parent" | "student",
  status: "active" | "disabled"
}
// OR
{
  ok: false,
  reason: "email-not-authorized" | "account-disabled" | "auth-failed"
}
```

**Implementation Pseudocode:**

```typescript
export const ensureUserProfile = functions.https.onCall(async (data, context) => {
  // 1. Verify ID token (from client)
  const idToken = data.idToken;
  if (!idToken) return { ok: false, reason: "auth-failed" };
  
  // 2. Verify with Firebase Admin SDK
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return { ok: false, reason: "auth-failed" };
  }
  
  const uid = decodedToken.uid;
  const email = decodedToken.email;
  
  if (!email) return { ok: false, reason: "auth-failed" };
  
  // 3. Query /authorizedEmails (Admin SDK - NOT client-readable)
  const authorizedDoc = await db.collection("authorizedEmails").doc(email).get();
  
  if (!authorizedDoc.exists) {
    // Email not in authorized list
    await admin.auth().deleteUser(uid);  // Optional: clean up Auth user
    return { ok: false, reason: "email-not-authorized" };
  }
  
  const authData = authorizedDoc.data();
  const authorizedRole = authData.role;      // "admin" | "teacher" | ...
  const authorizedStatus = authData.status;  // "active" | "disabled"
  
  // 4. Check status before creating user
  if (authorizedStatus === "disabled") {
    return { ok: false, reason: "account-disabled" };
  }
  
  // 5. Create or update /users/{uid} using Admin SDK
  await db.collection("users").doc(uid).set({
    uid,
    email,
    name: decodedToken.name || email.split("@")[0],
    role: authorizedRole,              // ONLY from /authorizedEmails
    status: authorizedStatus,          // ONLY from /authorizedEmails
    photoURL: decodedToken.picture || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  // 6. Return confirmed profile
  return {
    ok: true,
    uid,
    role: authorizedRole,
    status: authorizedStatus
  };
});
```

**Security Checks:**
- ✅ ID token verified (cannot be forged)
- ✅ Email extracted from token (not trusting client)
- ✅ /authorizedEmails checked server-side (not visible to client)
- ✅ Role/status from Firestore (not from client input)
- ✅ Disabled users rejected before /users creation
- ✅ User creation uses Admin SDK (not client Firestore write)

---

## FIRESTORE RULES CORRECTION

### /users Collection Rules

```firestore-rules
match /users/{uid} {
  // READ: User can read their own document (for UI state sync)
  allow read: if request.auth != null && request.auth.uid == uid;
  
  // WRITE: Only Cloud Functions via Admin SDK
  //        Client can never modify their own role/status
  allow create, update, delete: if false;
}
```

### /authorizedEmails Collection Rules

```firestore-rules
match /authorizedEmails/{email} {
  // READ: DENY - Not readable by any client
  //       (Only Cloud Function accesses via Admin SDK)
  allow read: if false;
  
  // WRITE: Only admin via Cloud Function
  //        Could also add UI later for admin panel
  allow write: if request.auth != null &&
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
}
```

### /diary Collection Rules (No change from V5.1)

```firestore-rules
match /diary/{diaryId} {
  allow read: if isUserActive();
  allow write: if isAdmin() &&
               request.auth.token.email == 'rockyhsn9@gmail.com';
}
```

### /exams Collection Rules (No change from V5.1)

```firestore-rules
match /exams/{examId} {
  allow read: if isUserActive();
  allow write: if isAdmin() &&
               request.auth.token.email == 'rockyhsn9@gmail.com';
}
```

---

## CLIENT-SIDE CHANGES

### Login Flow (src/routes/index.tsx)

```typescript
// 1. Google Sign-In (existing)
const handleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  
  // 2. Get ID token (new)
  const idToken = await result.user.getIdToken();
  
  // 3. Call Cloud Function (new - MOVED TO CLOUD FUNCTION)
  try {
    const ensureUserProfile = functions.httpsCallable("ensureUserProfile");
    const response = await ensureUserProfile({ idToken });
    
    if (!response.data.ok) {
      // Authorization failed
      await signOut(auth);
      toast.error("Authorization failed: " + response.data.reason);
      return;
    }
    
    // 4. Confirm role in local state
    const { uid, role, status } = response.data;
    
    // 5. Load /users/{uid} to verify
    //    (Firestore Rules already restrict to own doc)
    const userDoc = await getDoc(doc(db, "users", uid));
    const userData = userDoc.data();
    
    // 6. Double-check role matches (defense in depth)
    if (userData.role !== role) {
      throw new Error("Role mismatch - authorization failed");
    }
    
    // 7. Set authenticated state
    setUser(result.user);
    setUserRole(role);
    setIsAuthenticated(true);
    
    // 8. Auto-navigate to dashboard
    navigate({ to: `/${role}/dashboard` });
    
  } catch (error) {
    console.error("Authorization failed:", error);
    await signOut(auth);
    toast.error("Failed to authorize user");
  }
};
```

### Auth Store Changes (src/lib/access-store.tsx)

```typescript
// REMOVE:
// - Code that reads /authorizedEmails directly
// - Code that sets role based on client input
// - Code that creates /users documents client-side

// KEEP:
// - signInAsAdmin() (now calls ensureUserProfile)
// - useAccess() hook
// - rolePresets, features, permissions
// - can() helper

// ADD:
// - Call ensureUserProfile Cloud Function on Google login
// - Load /users/{uid} from Firestore (use own doc)
// - Real-time listener for own /users/{uid}
// - Double-check role/status match on each check
```

---

## IMPLEMENTATION FILE CHANGES

### Files to MODIFY (Updated)

```
⚠️  functions/src/users.ts
    ADD: ensureUserProfile() Cloud Function
    (Keep existing: updateUser, disableUser)

⚠️  functions/src/index.ts
    ADD: export ensureUserProfile
    (Remove: pinLogin, resetPin, getLoginUsers)

⚠️  firestore.rules
    MODIFY: /users rules (no create/update/delete)
    ADD: /authorizedEmails rules (deny read)
    (Keep: /diary, /exams, helpers)

⚠️  src/routes/index.tsx
    MODIFY: Call ensureUserProfile after Google OAuth
    MODIFY: Handle authorization response

⚠️  src/lib/access-store.tsx
    MODIFY: Remove direct /authorizedEmails read
    MODIFY: Remove role/status setting by client
    ADD: Firestore listener for own /users/{uid}
```

### Files to REMOVE (No change)

```
❌ functions/src/auth.ts
❌ functions/src/test-fixtures.ts
❌ functions/src/createUser.test.ts
```

### Files to KEEP (No change)

```
✅ src/lib/firebase.ts
✅ src/lib/school-content.tsx
✅ All dashboard components
✅ firebaserc, .env.local
✅ All other existing code
```

---

## SECURITY PROPERTIES ACHIEVED

✅ **Client cannot read /authorizedEmails**
   - Firestore Rules deny all client reads
   - Only Cloud Function accesses via Admin SDK

✅ **Client cannot choose own role/status**
   - Role/status come from /authorizedEmails via Cloud Function
   - Client receives final values, cannot modify

✅ **Email is verified by Firebase**
   - Google + Firebase Auth verify email
   - ID token extracted from Firebase (cannot be forged)

✅ **Server is authoritative**
   - Cloud Function creates /users with authorized values
   - Firestore Rules prevent client writes to role/status

✅ **Defense in depth**
   - ID token verification
   - /authorizedEmails lookup
   - Double-check in Firestore Rules
   - Double-check in client state loading

---

## NO CHANGES TO:

✅ The rest of FINAL_MIGRATION_PLAN.md  
✅ 7-phase implementation order  
✅ 4 roles, single school, Google-only  
✅ Diary/exams access rules  
✅ Feature permission system  
✅ No workspace, PIN, invite, or custom-token infrastructure

---

## WHAT CHANGES:

🔒 **Onboarding** → Server-side authorization via Cloud Function  
🔒 **ensureUserProfile()** → New required Cloud Function  
🔒 **/authorizedEmails Rules** → Added (deny client read)  
🔒 **/users Rules** → Updated (no client write to role/status)  
🔒 **Client Login** → Call Cloud Function after Google OAuth  

---

## SUMMARY

✅ **Role/status always server-authorized**  
✅ **Client never reads /authorizedEmails**  
✅ **Client never chooses own role**  
✅ **Firestore Rules prevent role/status modification**  
✅ **Defense in depth: ID token + Cloud Function + Rules**  

---

**Status: READY FOR APPROVAL**

Approval required for:
- [ ] ensureUserProfile() Cloud Function design
- [ ] Firestore Rules for /authorizedEmails (deny read)
- [ ] Firestore Rules for /users (no client write)
- [ ] Client-side Cloud Function call flow

Once approved, proceed with implementation.

