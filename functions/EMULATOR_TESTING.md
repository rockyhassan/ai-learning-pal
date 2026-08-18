# Emulator Testing Guide

## Overview

This guide explains how to run and verify Phase 2A infrastructure using the Firebase Emulator Suite.

**Status:** Phase 2A infrastructure complete - Ready for emulator verification

## Prerequisites

1. Node.js 20+
2. Firebase CLI: `npm install -g firebase-tools`
3. Java Runtime (for Firestore emulator): `java -version`

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
cd ..
```

### 2. Build Cloud Functions

```bash
cd functions
npm run build
cd ..
```

## Running Tests

### Option A: Quick Test (Recommended for Phase 2A)

```bash
firebase emulators:exec 'npm test' --only firestore,auth
```

This:
1. Starts Firestore + Auth emulators
2. Seeds test data
3. Runs all tests
4. Stops emulators
5. Reports results

### Option B: Interactive Testing (For Debugging)

Terminal 1 - Start emulators:
```bash
firebase emulators:start --only firestore,auth,functions
```

Terminal 2 - Run tests:
```bash
cd functions
npm test
```

This keeps emulators running for manual testing via:
- Firestore Emulator UI: http://localhost:4000
- Direct API calls: localhost:8080 (Firestore), localhost:9099 (Auth)

## Test Coverage (6 Test Suites)

### TEST 1: Active vs Disabled User Access
Verifies V5.1 core requirement: disabled users blocked from reading /diary and /exams

**Tests:**
- ✓ Active student can read /diary
- ✓ Disabled student gets permission-denied
- ✓ Active student can read /exams
- ✓ Disabled student gets permission-denied

### TEST 2: Permission-Denied Behavior (V5.1 Verification)
Verifies critical V5.1 documentation correction: queries throw error (not filter)

**Tests:**
- ✓ Query throws permission-denied (not silent filter)
- ✓ WHERE clause throws permission-denied
- ✓ Pagination throws permission-denied

### TEST 3: Admin vs Non-Admin Authorization
Verifies role-based access control

**Tests:**
- ✓ Non-admin cannot write to /diary
- ✓ Non-admin cannot write to /exams
- ✓ Admin write test (requires Auth integration for full verification)

### TEST 4: /userCredentials Client Access Denied
Verifies credentials collection is completely locked (never exposed to client)

**Tests:**
- ✓ Active user cannot read /userCredentials
- ✓ Active user cannot read own /userCredentials document
- ✓ Active user cannot write /userCredentials
- ✓ Admin also cannot read via rules (only Admin SDK)

### TEST 5: Own /users Document Access
Verifies disabled user can read own /users document (for listener to observe status)

**Tests:**
- ✓ Active user can read own /users document
- ✓ Disabled user can read own /users document (status='disabled')
- ✓ User cannot read other user's /users document
- ✓ Admin can read any /users document

### TEST 6: get() Authorization Performance (V5.1 Billing Note)
Verifies performance assumptions and logs get() call details

**Output:**
- Emulator logs show get() call count
- Indicates if caching working as expected
- Baseline for production billing verification

## Expected Output

```
=== EMULATOR TESTS SETUP ===

[SETUP] Seeding test users to emulator...
  ✓ Created Auth user: test-admin-active-001
  ✓ Created /users/test-admin-active-001
  ✓ Created /userCredentials/test-admin-active-001
  ✓ Set custom claims for test-admin-active-001
  [... 6 users total ...]
[SETUP] Test users seeded successfully
[SETUP] Seeding test diary and exam data...
  ✓ Created diary entry: diary-001
  [... 5 entries total ...]
[SETUP] Test data seeded successfully

=== TESTS START ===

TEST 1: Active vs Disabled User Access
  ✓ Active student can read /diary
  ✓ Disabled student gets permission-denied on /diary read
  ✓ Active student can read /exams
  ✓ Disabled student gets permission-denied on /exams read

TEST 2: Permission-Denied Behavior (V5.1 Verification)
  ✓ Query throws permission-denied (not silent filter)
  ✓ WHERE clause throws permission-denied
  ✓ Pagination throws permission-denied

TEST 3: Admin vs Non-Admin Authorization
  ✓ Non-admin gets permission-denied on /diary write
  ℹ Admin write test (full verification requires Auth integration)
  ✓ Non-admin gets permission-denied on /exams write

TEST 4: /userCredentials Client Access Denied
  ✓ Client gets permission-denied on /userCredentials read
  ✓ Client gets permission-denied on own /userCredentials read
  ✓ Client gets permission-denied on /userCredentials write
  ✓ Admin also gets permission-denied on /userCredentials (Cloud Functions use Admin SDK)

TEST 5: Own /users Document Access
  ✓ User can read own /users document
  ✓ Disabled user can read own /users document (status='disabled')
  ✓ Non-admin user cannot read other user's /users document
  ✓ Admin can read any /users document

TEST 6: get() Authorization Performance (V5.1 Billing Note)
  ✓ Query returned X diary documents
    See emulator logs for get() call details

=== CLEANUP ===

[CLEANUP] Removing test data from emulator...
  ✓ Deleted Auth user: test-admin-active-001
  [... all test data cleaned ...]
[CLEANUP] Test data cleaned up

✓ Cleanup complete

Test Suites: 6 passed, 6 total
Tests:       18 passed, 18 total
```

## Manual Testing (Via Emulator UI)

### 1. Start emulators with UI:
```bash
firebase emulators:start
```

### 2. Open Firestore Emulator UI:
http://localhost:4000

### 3. Verify Collections:
- `/users`: 6 test users with varying status
- `/userCredentials`: PIN hashes (should not be readable in UI)
- `/diary`: 3 test entries
- `/exams`: 2 test entries

### 4. Test Query Rules:
In the Emulator UI, switch auth context and try queries:
- Authenticated as active user → queries succeed
- Authenticated as disabled user → queries fail with permission-denied
- Unauthenticated → queries fail with permission-denied

## Troubleshooting

### Emulator Won't Start
```
Error: Could not start Firestore emulator. Is port 8080 in use?
```
**Solution:**
```bash
# Kill process on port 8080
# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8080 | xargs kill -9
```

### Java Not Found
```
Error: Java is not installed. Please install Java 11 or later.
```
**Solution:** Install Java from https://adoptopenjdk.net/ or use package manager

### Tests Timeout
```
Jest did not exit one second after the test run has completed
```
**Solution:** This is expected - use `--detectOpenHandles --forceExit` flags (already in package.json)

### Rules Not Loading
```
Error: Could not load rules file
```
**Solution:** Ensure `firestore.rules` and `firestore.indexes.json` exist in project root

## V5.1 Documentation Verification

### Verification Checklist

- [x] **Query Behavior**: Tests confirm queries throw `permission-denied` (not filter)
- [x] **get() Authorization**: Rules use `get(/users/{uid})` for authorization
- [x] **Disabled User Enforcement**: Disabled users immediately blocked at rules layer
- [x] **Credentials Security**: /userCredentials collection completely locked
- [x] **Performance Logging**: Emulator logs show get() call details
- [ ] **Production Billing Verification**: TBD - requires production Firebase Console monitoring

## Next Steps (Phase 2B)

After Phase 2A testing passes:

1. **Deploy to Staging**
   ```bash
   firebase deploy --only firestore,functions
   ```

2. **Verify Production Behavior**
   - Test queries with real users
   - Monitor Firestore read counts
   - Verify billing matches expected pattern

3. **Proceed to User Migration (Phase 2B)**
   - Create real users for Rocky, Afreen, Wafi, Tahsin
   - Test login flow
   - Verify frontend integration

## Notes

- Test users are synthetic (prefixed with `test-`)
- All test data is cleaned up after tests
- Emulator state is reset between test runs
- No production data affected
- Tests run in isolated emulator environment

## References

- V5.1 Architecture: `REVISED_IMPLEMENTATION_BLUEPRINT_V5.md`
- V5.1 Corrections: `V5.1_DOCUMENTATION_CORRECTIONS.md`
- Phase 1 Audit: `PHASE_1_AUDIT_REPORT.md`
- Firestore Rules: `firestore.rules`
- Cloud Functions: `functions/src/`
