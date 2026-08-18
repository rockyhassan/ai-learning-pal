# Firestore Read-Only Audit - Browser Console Script

## 🚀 How to Run

1. **Open the app** → Navigate to the learning buddy app (http://localhost:5173 or wherever it's running)
2. **Open DevTools** → Press `F12`
3. **Go to Console tab** → Click on the "Console" tab
4. **Copy the script below** → Select all code in the "Script to Run" section
5. **Paste into console** → Right-click in console, select "Paste", press Enter
6. **Wait for results** → Console will show all collections and their status

---

## Script to Run (Copy and Paste into Browser Console)

```javascript
// FIRESTORE READ-ONLY AUDIT SCRIPT
// For: wafi-learning-buddy-new project
// Status: READ-ONLY (no data modifications)

(async function auditFirestore() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('FIRESTORE DATABASE AUDIT - READ-ONLY');
    console.log('='.repeat(70));
    console.log('Project: wafi-learning-buddy-new');
    console.log('Time: ' + new Date().toISOString());
    console.log('');

    // Get Firestore instance from the app
    // The app uses: import { db } from "./lib/firebase";
    // Which is: const db = getFirestore(app);
    
    console.log('📋 Connecting to Firestore...');
    
    // If db is available in window, use it; otherwise import
    let db = window.db;
    
    if (!db) {
      console.log('⚠️  Firestore not found on window. Checking app imports...');
      // Try to get from React DevTools if available
      db = window.__firestore_db__;
    }
    
    if (!db) {
      console.error('❌ Cannot find Firestore instance');
      console.error('Make sure the app is fully loaded and authenticated');
      return;
    }
    
    console.log('✅ Connected to Firestore');
    console.log('');
    
    // Directly query _listCollections (internal method)
    console.log('📋 STEP 1: Listing all top-level collections');
    console.log('─'.repeat(70));
    console.log('');
    
    // Try to list collections
    let collections = [];
    try {
      const collectionsSnapshot = await db.listCollections();
      collections = collectionsSnapshot.map(c => c.id);
      console.log(`✅ Found ${collections.length} top-level collection(s):\n`);
      collections.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c}`);
      });
    } catch (e) {
      console.warn('⚠️  listCollections() not available in browser Firestore');
      console.log('Using alternative method...');
      // If listCollections fails, we'll check known collections
      collections = ['diary', 'exams', 'users', 'audit'];
    }
    
    console.log('');
    console.log('─'.repeat(70));
    console.log('🔍 STEP 2: Checking for /users collection');
    console.log('─'.repeat(70));
    console.log('');
    
    // Check /users collection
    try {
      const usersRef = db.collection('users');
      const querySnap = await usersRef.get();
      
      if (querySnap.empty) {
        console.log('❌ /users collection DOES NOT EXIST or is EMPTY');
        console.log('');
        console.log('   Status: No documents found');
        console.log('   Action: All verified users will need to be migrated');
      } else {
        console.log('✅ /users collection EXISTS');
        console.log(`');
        console.log(`   Documents found: ${querySnap.docs.length}`);
        console.log('');
        
        querySnap.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`   ${i + 1}. Document ID: ${doc.id}`);
          console.log(`      name: ${data.name || 'N/A'}`);
          console.log(`      email: ${data.email || 'N/A'}`);
          console.log(`      role: ${data.role || 'N/A'}`);
          console.log(`      status: ${data.status || 'N/A'}`);
          console.log(`      fields: ${Object.keys(data).sort().join(', ')}`);
          console.log('');
        });
      }
    } catch (e) {
      console.error('⚠️  Error accessing /users collection:');
      console.error(`   ${e.message}`);
      console.log('');
      console.log('This may indicate:');
      console.log('  - Collection does not exist');
      console.log('  - Firestore rules deny read access');
      console.log('  - Network issue');
    }
    
    console.log('─'.repeat(70));
    console.log('📊 STEP 3: Checking other collections');
    console.log('─'.repeat(70));
    console.log('');
    
    // Check other known collections
    const knownCollections = ['diary', 'exams', 'audit'];
    for (const collName of knownCollections) {
      try {
        const ref = db.collection(collName);
        const snap = await ref.get();
        const count = snap.docs.length;
        if (count > 0 || snap.docs.length === 0) {
          console.log(`  • ${collName}: ${count} document(s)`);
        }
      } catch (e) {
        console.log(`  • ${collName}: [error: ${e.message}]`);
      }
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('AUDIT COMPLETE');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Next: Share these results to determine migration strategy');
    console.log('');

  } catch (error) {
    console.error('❌ AUDIT ERROR:');
    console.error(error);
  }
})();
```

---

## Expected Output

The script will output something like:

```
======================================================================
FIRESTORE DATABASE AUDIT - READ-ONLY
======================================================================
Project: wafi-learning-buddy-new
Time: 2026-08-17T...

📋 Connecting to Firestore...
✅ Connected to Firestore

📋 STEP 1: Listing all top-level collections
──────────────────────────────────────────────────────────────────────

✅ Found 2 top-level collection(s):

  1. diary
  2. exams

──────────────────────────────────────────────────────────────────────
🔍 STEP 2: Checking for /users collection
──────────────────────────────────────────────────────────────────────

❌ /users collection DOES NOT EXIST or is EMPTY

   Status: No documents found
   Action: All verified users will need to be migrated

──────────────────────────────────────────────────────────────────────
📊 STEP 3: Checking other collections
──────────────────────────────────────────────────────────────────────

  • diary: 5 document(s)
  • exams: 3 document(s)
  • audit: [error: not found]

======================================================================
AUDIT COMPLETE
======================================================================

Next: Share these results to determine migration strategy
```

---

## Alternative: Using Firebase Console

If the script doesn't work:

1. Go to: https://console.firebase.google.com
2. Select project: **wafi-learning-buddy-new**
3. Navigate to: **Firestore Database**
4. Click: **Data** tab
5. Look at the list of top-level collections on the left
6. Check if you see:
   - ✅ `diary` (should exist)
   - ✅ `exams` (should exist)
   - ❓ `users` (check if exists)
   - Any other collections?

Then report what you see.

---

## What to Report

After running the audit, please provide:

1. **Collections found** (list all)
2. **/users collection status** (exists or doesn't exist)
3. **Number of documents in /users** (if it exists)
4. **Document names/IDs in /users** (if documents exist)
5. **Any errors encountered**

Example response format:

```
Audit Results:
- Collections: diary, exams (2 total)
- /users collection: DOES NOT EXIST
- Need to migrate all 4 verified users
```

---

## 🔒 Security Notes

- ✅ This script is READ-ONLY
- ✅ No data is created, modified, or deleted
- ✅ No Firestore rules are changed
- ✅ No Cloud Functions are deployed
- ✅ No application code is modified
- ✅ Uses existing app authentication (your current login)

---

## Verified Users for Reference

| # | Name | Email | Role |
|---|------|-------|------|
| 1 | Rocky Hassan | rockyhsn9@gmail.com | admin |
| 2 | Afreen | afreen.antora@gmail.com | parent |
| 3 | Wafi | affanwafee@gmail.com | student |
| 4 | Tahsin | tahsin@gmail.com | teacher |

These are the 4 users verified from localStorage. We're checking if they already exist in Firestore.

---

## Troubleshooting

**Q: Script doesn't run or shows error**
- A: Make sure the app is fully loaded and you're logged in

**Q: "Cannot find Firestore" error**
- A: The app needs to be open. Try refreshing (F5) and running again

**Q: "Permission denied" error**
- A: You may not have read access to Firestore. Check Firestore rules in Firebase Console

**Q: Nothing appears in console**
- A: Try opening console before pasting (F12 → Console tab)

---

Once you run this and report results, I can create the exact migration plan!
