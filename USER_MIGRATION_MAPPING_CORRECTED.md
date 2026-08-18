# User Migration Mapping - CORRECTED
**Status:** Awaiting exact data verification  
**Based on:** Admin Dashboard roles (per your feedback)  
**Date:** August 17, 2026 (corrected from 2024)

---

## ❌ ERROR IDENTIFIED & CORRECTED

### What Was Wrong:
```
❌ INCORRECT (in FIREBASE_MIGRATION_STRATEGY_REVISED.md):
  - Rocky Hassan → Student
  - Afreen → Student
  - Wafi → Admin
  - Tahsin → Teacher
```

### What's Correct:
```
✅ CORRECT (from Admin Dashboard):
  - Rocky Hassan → Admin
  - Afreen → Parent
  - Wafi → Student
  - Tahsin → Teacher
```

---

## 📊 CORRECTED USER MAPPING TABLE

| Name | Email | Role | Current Status | Permissions Count | Notes |
|------|-------|------|---|---|---|
| Rocky Hassan | [VERIFY] | **Admin** | Active | 19 (all) | Firestore admin super-user |
| Afreen | [VERIFY] | **Parent** | Active | ~10 | Parent-mode access, homework tracking |
| Wafi | [VERIFY] | **Student** | Active | ~15 | Primary student user |
| Tahsin | [VERIFY] | **Teacher** | Active | ~10 | Teacher dashboard access |

**Note:** Email addresses and permission counts [AWAITING VERIFICATION FROM ACTUAL localStorage]

---

## 🔄 MIGRATION MAPPING (Corrected)

### Phase 1 - Role Verification

**Confirm each user's actual localStorage record:**

```
Rocky Hassan
  ├─ Current role: admin ✅
  ├─ Current status: [VERIFY]
  ├─ Current permissions: [VERIFY] (expect: all 19 features)
  ├─ Current email: [VERIFY]
  ├─ Current PIN: [NOT SHOWN IN REPORT]
  └─ Migration: Hash existing PIN → Firestore with role=admin

Afreen
  ├─ Current role: parent ✅
  ├─ Current status: [VERIFY]
  ├─ Current permissions: [VERIFY] (expect: ~10 parent features)
  ├─ Current email: [VERIFY]
  ├─ Current PIN: [NOT SHOWN IN REPORT]
  └─ Migration: Hash existing PIN → Firestore with role=parent

Wafi
  ├─ Current role: student ✅
  ├─ Current status: [VERIFY]
  ├─ Current permissions: [VERIFY] (expect: ~15 student features)
  ├─ Current email: [VERIFY]
  ├─ Current PIN: [NOT SHOWN IN REPORT]
  └─ Migration: Hash existing PIN → Firestore with role=student

Tahsin
  ├─ Current role: teacher ✅
  ├─ Current status: [VERIFY]
  ├─ Current permissions: [VERIFY] (expect: ~10 teacher features)
  ├─ Current email: [VERIFY]
  ├─ Current PIN: [NOT SHOWN IN REPORT]
  └─ Migration: Hash existing PIN → Firestore with role=teacher
```

---

## 📋 EXACT CURRENT RECORDS NEEDED

**From browser console, send this data (excluding plaintext PINs):**

```javascript
// Each user's exact localStorage record:

NEEDED FOR:
1. Rocky Hassan
   - Exact email (not guessed)
   - Exact permissions array (verify "admin" preset)
   - Exact ID
   - Exact status

2. Afreen
   - Exact email (not guessed)
   - Exact permissions array (verify "parent" preset)
   - Exact ID
   - Exact status

3. Wafi
   - Exact email (not guessed)
   - Exact permissions array (verify "student" preset)
   - Exact ID
   - Exact status

4. Tahsin
   - Exact email (not guessed)
   - Exact permissions array (verify "teacher" preset)
   - Exact ID
   - Exact status
```

---

## ✅ PERMISSIONS BY ROLE (Expected)

**Based on codebase rolePresets:**

### Admin (Rocky Hassan)
```
Expected permissions: All 19 features
  - dashboard
  - study
  - homework
  - ai-teacher
  - scan
  - vocabulary
  - pronunciation
  - question-bank
  - practice
  - games
  - progress
  - parent-mode
  - planner
  - notifications
  - documents
  - achievements
  - ai-memory
  - school-profile
  - admin
```

### Parent (Afreen)
```
Expected permissions: 10 features
  - dashboard
  - parent-mode
  - progress
  - homework
  - planner
  - notifications
  - documents
  - achievements
  - ai-memory
  - school-profile
```

### Student (Wafi)
```
Expected permissions: 15 features
  - dashboard
  - study
  - homework
  - ai-teacher
  - scan
  - vocabulary
  - pronunciation
  - question-bank
  - practice
  - games
  - progress
  - planner
  - notifications
  - documents
  - achievements
```

### Teacher (Tahsin)
```
Expected permissions: 10 features
  - dashboard
  - study
  - homework
  - question-bank
  - practice
  - progress
  - planner
  - notifications
  - documents
  - school-profile
```

---

## 🔍 VERIFICATION (Will Do After Receiving Data)

Once exact data provided, I will verify:

- [ ] Rocky Hassan's permissions = admin preset (all 19)
- [ ] Afreen's permissions = parent preset (10 specific)
- [ ] Wafi's permissions = student preset (15 specific)
- [ ] Tahsin's permissions = teacher preset (10 specific)
- [ ] All 4 users have status = "active"
- [ ] All 4 users have unique valid IDs
- [ ] All 4 users have valid email addresses

---

## ⏸️ HOLD: Waiting for Verification

**Cannot proceed with:**
- ❌ Creating exact Firebase migration script
- ❌ Creating exact backup procedure
- ❌ Creating Firestore documents
- ❌ Any implementation

**Can only proceed after:**
- ✅ Exact current localStorage records provided
- ✅ Roles, emails, IDs verified
- ✅ Permissions confirmed

---

## 📍 NEXT STEP

Please provide the exact current user data from localStorage:

```bash
# In browser console:
const users = JSON.parse(localStorage.getItem('wafi.users-access') || '[]')
console.table(users.map(u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  permissions_count: u.permissions?.length
})))
```

**Copy the output and send it.**

---

## 🚫 CRITICAL RULES (During Verification)

- ❌ **NO code modifications**
- ❌ **NO Firestore deployments**
- ❌ **NO user migrations**
- ❌ **NO assumptions** about data
- ✅ **VERIFY FIRST**, then document

Once data received → Immediate correction of all documents → Complete revised architecture
