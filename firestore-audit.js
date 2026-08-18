#!/usr/bin/env node

/**
 * READ-ONLY FIRESTORE DATABASE AUDIT
 * 
 * Purpose: Inspect the actual Firestore database for project wafi-learning-buddy-new
 * 
 * What this does:
 * - Connects to Firebase using the project configuration
 * - Lists all top-level collections
 * - Checks if /users collection exists
 * - Reports complete database structure
 * 
 * IMPORTANT: This is READ-ONLY. No data is created, modified, or deleted.
 */

// Import Firebase Admin SDK (must be installed: npm install firebase-admin)
// If not installed, instructions will be provided
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error("\n❌ ERROR: firebase-admin not installed");
  console.error("\nTo run this audit, install firebase-admin:");
  console.error("  npm install firebase-admin");
  console.error("\nThen run this script again:");
  console.error("  node firestore-audit.js");
  process.exit(1);
}

// Firebase configuration from .env.local
const firebaseConfig = {
  apiKey: "AIzaSyA4tQ2p0qY79I0GkeC_mxfXJcV9bXtCSEk",
  authDomain: "wafi-learning-buddy-new.firebaseapp.com",
  projectId: "wafi-learning-buddy-new",
  storageBucket: "wafi-learning-buddy-new.firebasestorage.app",
  messagingSenderId: "225157832572",
  appId: "1:225157832572:web:ca791b5a0e76e28635cef9"
};

console.log("\n");
console.log("═".repeat(70));
console.log("FIRESTORE DATABASE AUDIT - READ-ONLY");
console.log("═".repeat(70));
console.log("");
console.log("Project:", firebaseConfig.projectId);
console.log("Audit Time:", new Date().toISOString());
console.log("");

// Check if service account exists
const serviceAccountPath = './wafi-learning-buddy-new-firebase-adminsdk.json';
const fs = require('fs');

if (!fs.existsSync(serviceAccountPath)) {
  console.log("⚠️  SERVICE ACCOUNT NOT FOUND");
  console.log("");
  console.log("To run this audit, you need a Firebase service account key:");
  console.log("");
  console.log("Steps:");
  console.log("1. Go to: https://console.firebase.google.com");
  console.log("2. Select project: wafi-learning-buddy-new");
  console.log("3. Go to: Project Settings → Service Accounts");
  console.log("4. Click: Generate New Private Key");
  console.log("5. Save as: wafi-learning-buddy-new-firebase-adminsdk.json");
  console.log("6. Place in this directory");
  console.log("7. Run this script again");
  console.log("");
  console.log("Or use Firebase Console directly:");
  console.log("1. https://console.firebase.google.com");
  console.log("2. wafi-learning-buddy-new");
  console.log("3. Firestore Database");
  console.log("4. Look at Data tab to see collections");
  console.log("");
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: firebaseConfig.projectId
  });
  
  console.log("✅ Connected to Firebase Admin SDK");
  console.log("");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:");
  console.error(error.message);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Main audit function
async function auditFirestore() {
  try {
    console.log("AUDITING FIRESTORE...");
    console.log("─".repeat(70));
    console.log("");

    // Get all top-level collections
    console.log("📋 Fetching top-level collections...");
    console.log("");

    const collectionsSnapshot = await db.listCollections();
    const collections = collectionsSnapshot.map(c => c.id);

    if (collections.length === 0) {
      console.log("⚠️  NO COLLECTIONS FOUND");
      console.log("");
      console.log("The Firestore database appears to be empty (no top-level collections).");
      console.log("");
    } else {
      console.log(`✅ Found ${collections.length} top-level collection(s):`);
      console.log("");
      
      collections.forEach((collName, i) => {
        console.log(`  ${i + 1}. ${collName}`);
      });
      console.log("");
    }

    // Specifically check for /users collection
    console.log("─".repeat(70));
    console.log("");
    console.log("🔍 CHECKING FOR /users COLLECTION...");
    console.log("");

    const usersExists = collections.includes('users');

    if (usersExists) {
      console.log("✅ /users COLLECTION EXISTS");
      console.log("");
      
      // Get document count in /users
      const usersSnapshot = await db.collection('users').get();
      const userDocs = usersSnapshot.docs;
      
      console.log(`   Documents in /users: ${userDocs.length}`);
      console.log("");
      
      if (userDocs.length > 0) {
        console.log("   Documents found:");
        userDocs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`   ${i + 1}. ${doc.id}`);
          console.log(`      - name: ${data.name || 'N/A'}`);
          console.log(`      - email: ${data.email || 'N/A'}`);
          console.log(`      - role: ${data.role || 'N/A'}`);
          console.log(`      - status: ${data.status || 'N/A'}`);
          console.log(`      - Fields: ${Object.keys(data).join(', ')}`);
          console.log("");
        });
      } else {
        console.log("   /users collection exists but is EMPTY (no documents)");
        console.log("");
      }
    } else {
      console.log("❌ /users COLLECTION DOES NOT EXIST");
      console.log("");
      console.log("   The /users collection has not been created in Firestore.");
      console.log("   All 4 verified users will need to be migrated.");
      console.log("");
    }

    // Check other collections and their contents
    if (collections.length > 0) {
      console.log("─".repeat(70));
      console.log("");
      console.log("📊 OTHER COLLECTIONS SUMMARY:");
      console.log("");
      
      for (const collName of collections) {
        if (collName !== 'users') {
          const snapshot = await db.collection(collName).get();
          const docCount = snapshot.docs.length;
          console.log(`  • ${collName}: ${docCount} document(s)`);
        }
      }
      console.log("");
    }

  } catch (error) {
    console.error("❌ AUDIT ERROR:");
    console.error(error.message);
    console.error("");
  } finally {
    // Clean up
    await admin.app().delete();
    console.log("═".repeat(70));
    console.log("AUDIT COMPLETE");
    console.log("═".repeat(70));
    console.log("");
    process.exit(0);
  }
}

// Run the audit
auditFirestore();
