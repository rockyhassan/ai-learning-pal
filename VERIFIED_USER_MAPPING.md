# Verified User Mapping - Ready for Migration
**Status:** Verified from localStorage on August 17, 2026  
**Source:** Browser console (wafi.users-access)  
**Project:** wafi-learning-buddy-new (Firebase)  
**Action:** READ-ONLY (no changes yet)

---

## ✅ VERIFIED USERS (Exact from localStorage)

### 1. Rocky Hassan
```
ID:                u-firebase-admin
Name:              Rocky Hassan
Email:             rockyhsn9@gmail.com
Role:              admin
Status:            active
Permissions Count: 19 (all features)
Note:              Firebase admin (Google OAuth)
```

### 2. Afreen
```
ID:                u-1786970828154
Name:              Afreen
Email:             afreen.antora@gmail.com
Role:              parent
Status:            active
Permissions Count: 10 (parent features)
Note:              Parent/guardian account
```

### 3. Wafi
```
ID:                u-1786970842930
Name:              Wafi
Email:             affanwafee@gmail.com
Role:              student
Status:            active
Permissions Count: 15 (student features)
Note:              Primary student account (same as app name)
```

### 4. Tahsin
```
ID:                u-1786970857370
Name:              Tahsin
Email:             tahsin@gmail.com
Role:              teacher
Status:            active
Permissions Count: 10 (teacher features)
Note:              Teacher account
```

---

## 📊 MIGRATION MAPPING TABLE

| # | Name | Email | Role | Status | Perms | Firestore Doc ID | Current State |
|---|------|-------|------|--------|-------|------------------|---------------|
| 1 | Rocky Hassan | rockyhsn9@gmail.com | admin | active | 19 | user_email_rockyhsn9@gmail.com | [AUDIT PENDING] |
| 2 | Afreen | afreen.antora@gmail.com | parent | active | 10 | user_email_afreen.antora@gmail.com | [AUDIT PENDING] |
| 3 | Wafi | affanwafee@gmail.com | student | active | 15 | user_email_affanwafee@gmail.com | [AUDIT PENDING] |
| 4 | Tahsin | tahsin@gmail.com | teacher | active | 10 | user_email_tahsin@gmail.com | [AUDIT PENDING] |

---

## 📍 NEXT: Firestore Audit

**Read-only check needed:**

For each user, determine:
- ✅ Exists in Firestore `/users` collection?
- ✅ What fields are present?
- ✅ What fields are missing?
- ✅ Does data match verified localStorage?

**Document IDs to check:**
```
user_email_rockyhsn9@gmail.com
user_email_afreen.antora@gmail.com
user_email_affanwafee@gmail.com
user_email_tahsin@gmail.com
```

---

## 🔒 CONSTRAINTS

- ❌ NO data modifications
- ❌ NO Firestore rules deployment
- ❌ NO Cloud Functions deployment
- ❌ NO user migrations
- ❌ NO code changes
- ✅ READ-ONLY audit only

---

## ⏸️ HOLD

Awaiting Firestore audit results before proceeding with migration planning.

**See:** FIREBASE_AUDIT_READONLY.js (instructions to run audit)
