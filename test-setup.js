#!/usr/bin/env node

/**
 * Test setup script - Creates authorized emails in Firestore Emulator
 */

import * as admin from 'firebase-admin';

// Initialize with emulator connection
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const serviceAccount = {
  "type": "service_account",
  "project_id": "wafi-learning-buddy-new",
  "private_key_id": "test-key",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA2Z3qX2BTLS7ZAAAA1234567890ABCDEFGHIJKLMNOPQRST\nUVWXYZabcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTU\nVWXYZabcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUV\nWXYZabcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWX\nYZabcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYQID\nAQABAoIBAQC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ==\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-test@wafi-learning-buddy-new.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "http://localhost:9099/identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-test%40wafi-learning-buddy-new.iam.gserviceaccount.com"
};

admin.initializeApp({
  projectId: 'wafi-learning-buddy-new',
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setupTestData() {
  console.log('Setting up test data in Firestore Emulator...\n');

  try {
    // Create authorized email for admin
    const authorizedEmail = {
      email: 'rockyhsn9@gmail.com',
      name: 'Rocky',
      role: 'admin',
      status: 'active'
    };

    await db.collection('authorizedEmails').doc('rockyhsn9@gmail.com').set(authorizedEmail);
    console.log('✅ Created /authorizedEmails/rockyhsn9@gmail.com');
    console.log(JSON.stringify(authorizedEmail, null, 2));

    // Create authorized email for non-admin (for TEST 2)
    const unauthorizedEmail = {
      email: 'unauthorized@example.com',
      name: 'Unauthorized User',
      role: 'student',
      status: 'active'
    };

    await db.collection('authorizedEmails').doc('unauthorized@example.com').set(unauthorizedEmail);
    console.log('\n✅ Created /authorizedEmails/unauthorized@example.com');
    console.log(JSON.stringify(unauthorizedEmail, null, 2));

    console.log('\n✅ Test data setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTestData();
