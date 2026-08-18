/**
 * READ-ONLY FIREBASE/FIRESTORE AUDIT SCRIPT
 * 
 * Purpose: Determine which of the 4 verified users already exist in Firebase/Firestore
 * 
 * VERIFIED USERS TO CHECK:
 * 1. Rocky Hassan (rockyhsn9@gmail.com) - admin
 * 2. Afreen (afreen.antora@gmail.com) - parent
 * 3. Wafi (affanwafee@gmail.com) - student
 * 4. Tahsin (tahsin@gmail.com) - teacher
 * 
 * IMPORTANT: This script is READ-ONLY. It does NOT modify any data.
 */

// Firebase configuration (from .env.local)
const firebaseConfig = {
  apiKey: "AIzaSyA4tQ2p0qY79I0GkeC_mxfXJcV9bXtCSEk",
  authDomain: "wafi-learning-buddy-new.firebaseapp.com",
  projectId: "wafi-learning-buddy-new",
  storageBucket: "wafi-learning-buddy-new.firebasestorage.app",
  messagingSenderId: "225157832572",
  appId: "1:225157832572:web:ca791b5a0e76e28635cef9"
};

const verifiedUsers = [
  {
    id: "u-firebase-admin",
    name: "Rocky Hassan",
    email: "rockyhsn9@gmail.com",
    role: "admin",
    status: "active",
    permissions_count: 19
  },
  {
    id: "u-1786970828154",
    name: "Afreen",
    email: "afreen.antora@gmail.com",
    role: "parent",
    status: "active",
    permissions_count: 10
  },
  {
    id: "u-1786970842930",
    name: "Wafi",
    email: "affanwafee@gmail.com",
    role: "student",
    status: "active",
    permissions_count: 15
  },
  {
    id: "u-1786970857370",
    name: "Tahsin",
    email: "tahsin@gmail.com",
    role: "teacher",
    status: "active",
    permissions_count: 10
  }
];

// Document ID format: user_email_${email}
const expectedDocumentIds = verifiedUsers.map(u => `user_email_${u.email}`);

console.log("═══════════════════════════════════════════════════════════════");
console.log("FIREBASE/FIRESTORE READ-ONLY AUDIT");
console.log("═══════════════════════════════════════════════════════════════");
console.log("");
console.log("Firebase Project ID:", firebaseConfig.projectId);
console.log("Audit Date:", new Date().toISOString());
console.log("");
console.log("VERIFIED USERS TO CHECK:");
console.log("───────────────────────────────────────────────────────────────");
verifiedUsers.forEach((user, i) => {
  console.log(`${i + 1}. ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Expected Document ID: user_email_${user.email}`);
  console.log("");
});

console.log("═══════════════════════════════════════════════════════════════");
console.log("TO RUN THIS AUDIT:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("");
console.log("OPTION A: Run in Firebase Console (Easiest)");
console.log("──────────────────────────────────────────");
console.log("1. Go to: https://console.firebase.google.com");
console.log("2. Select project: wafi-learning-buddy-new");
console.log("3. Go to Firestore Database");
console.log("4. Check collections for:");
console.log("   - /users collection");
console.log("   - /audit collection (if exists)");
console.log("5. Look for documents with IDs:");
expectedDocumentIds.forEach(id => {
  console.log(`   • ${id}`);
});
console.log("");

console.log("OPTION B: Run in Browser Console (Using Firestore SDK)");
console.log("───────────────────────────────────────────────────────");
console.log("1. Open the app: https://learning-buddy.com");
console.log("2. Open DevTools (F12) → Console tab");
console.log("3. Paste this code:");
console.log("");
console.log(`
// Import Firebase modules (already loaded in app)
const db = window.firestoreDB; // or get from app
const getDocs = window.firebaseGetDocs;
const collection = window.firebaseCollection;
const doc = window.firebaseDoc;
const getDoc = window.firebaseGetDoc;

// Check if /users collection exists
async function auditUsers() {
  console.log("Checking Firestore for verified users...");
  
  const expectedDocIds = ${JSON.stringify(expectedDocumentIds)};
  
  for (const docId of expectedDocIds) {
    try {
      const docRef = doc(db, "users", docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log("✅ EXISTS:", docId);
        console.log("   Data:", docSnap.data());
      } else {
        console.log("❌ NOT FOUND:", docId);
      }
    } catch (error) {
      console.error("⚠️ ERROR checking", docId, ":", error.message);
    }
  }
}

auditUsers();
`);
console.log("");

console.log("═══════════════════════════════════════════════════════════════");
console.log("WHAT TO REPORT:");
console.log("═══════════════════════════════════════════════════════════════");
console.log("");
console.log("For each user, report:");
console.log("  ✅ EXISTS in Firestore:");
console.log("     - Document ID");
console.log("     - What fields are present");
console.log("     - What fields are missing");
console.log("     - Any data that differs from verified localStorage");
console.log("");
console.log("  ❌ DOES NOT EXIST in Firestore:");
console.log("     - Needs to be migrated");
console.log("");

console.log("═══════════════════════════════════════════════════════════════");
console.log("IMPORTANT: THIS IS READ-ONLY AUDIT");
console.log("═══════════════════════════════════════════════════════════════");
console.log("");
console.log("✅ This script only READS from Firestore");
console.log("❌ Does NOT create, modify, or delete any data");
console.log("❌ Does NOT deploy Firestore rules");
console.log("❌ Does NOT deploy Cloud Functions");
console.log("❌ Does NOT modify application code");
console.log("");
