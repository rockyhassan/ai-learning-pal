#!/usr/bin/env node

/**
 * FIRESTORE READ-ONLY AUDIT - REST API Method
 * 
 * Purpose: Audit all Firestore collections without requiring firebase-admin SDK
 * Uses: Firestore REST API + Firebase configuration from .env.local
 * 
 * What this script does:
 * 1. Reads Firebase config from .env.local
 * 2. Connects to Firestore via REST API
 * 3. Lists all top-level collections
 * 4. Checks if /users collection exists
 * 5. Reports complete database structure
 * 
 * IMPORTANT: This is READ-ONLY. No data is created, modified, or deleted.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read .env.local
const envFilePath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envFilePath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const projectId = env['VITE_FIREBASE_PROJECT_ID'];
const apiKey = env['VITE_FIREBASE_API_KEY'];

if (!projectId || !apiKey) {
  console.error('❌ Error: Firebase config not found in .env.local');
  process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('FIRESTORE DATABASE AUDIT - READ-ONLY (REST API)');
console.log('='.repeat(70));
console.log('');
console.log('Project:', projectId);
console.log('Audit Time:', new Date().toISOString());
console.log('');

/**
 * Make HTTPS request to Firestore REST API
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (method === 'GET') {
      // For GET requests, append API key as query parameter
      options.path += `?key=${apiKey}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Run the audit
 */
async function runAudit() {
  try {
    console.log('🔍 STEP 1: Attempting to list collections');
    console.log('─'.repeat(70));
    console.log('');

    // List collections endpoint
    // Format: projects/{project}/databases/{database}/documents
    const endpoint = `/v1/projects/${projectId}/databases/(default)/documents`;

    console.log('Making request to Firestore API...');
    console.log('Endpoint:', endpoint);
    console.log('');

    const response = await makeRequest('GET', endpoint);

    if (response.status === 200) {
      console.log('✅ Successfully connected to Firestore');
      console.log('');

      const documents = response.body.documents || [];
      console.log(`📋 Response contains: ${documents.length} document(s)`);
      console.log('');

      // Parse document paths to extract collections
      const collections = new Set();
      documents.forEach(doc => {
        // Document path format: projects/{project}/databases/{db}/documents/{collection}/{docId}
        const pathParts = doc.name.split('/');
        if (pathParts.length >= 8) {
          const collection = pathParts[6];
          collections.add(collection);
        }
      });

      const collArray = Array.from(collections).sort();

      if (collArray.length === 0) {
        console.log('⚠️  No collections found in response');
        console.log('');
        console.log('This may indicate:');
        console.log('  - Database is empty');
        console.log('  - Firestore rules deny read access');
        console.log('  - API token/key issue');
      } else {
        console.log(`✅ Found ${collArray.length} top-level collection(s):`);
        console.log('');
        collArray.forEach((coll, i) => {
          console.log(`  ${i + 1}. ${coll}`);
        });
        console.log('');
      }

      // Check for /users specifically
      console.log('─'.repeat(70));
      console.log('🔍 STEP 2: Checking for /users collection');
      console.log('─'.repeat(70));
      console.log('');

      if (collArray.includes('users')) {
        console.log('✅ /users COLLECTION EXISTS');
        console.log('');

        // Try to get documents in /users
        const usersEndpoint = `${endpoint}/users`;
        try {
          const usersResponse = await makeRequest('GET', usersEndpoint);
          if (usersResponse.status === 200) {
            const userDocs = usersResponse.body.documents || [];
            console.log(`   Documents in /users: ${userDocs.length}`);
            console.log('');

            if (userDocs.length > 0) {
              console.log('   User documents found:');
              userDocs.slice(0, 10).forEach((doc, i) => {
                const docId = doc.name.split('/').pop();
                const fields = doc.fields || {};
                console.log(`   ${i + 1}. ${docId}`);
                console.log(`      Fields: ${Object.keys(fields).join(', ')}`);
              });

              if (userDocs.length > 10) {
                console.log(`   ... and ${userDocs.length - 10} more`);
              }
            }
          }
        } catch (e) {
          console.log(`   ⚠️  Could not read /users documents: ${e.message}`);
        }
      } else {
        console.log('❌ /users COLLECTION DOES NOT EXIST');
        console.log('');
        console.log('   The /users collection has not been created.');
        console.log('   All verified users will need to be migrated.');
      }

      // Summary of all collections
      console.log('');
      console.log('─'.repeat(70));
      console.log('📊 COMPLETE COLLECTION SUMMARY');
      console.log('─'.repeat(70));
      console.log('');

      if (collArray.length > 0) {
        collArray.forEach(coll => {
          console.log(`  • ${coll}`);
        });
      } else {
        console.log('  [No collections found]');
      }

    } else if (response.status === 403) {
      console.error('❌ PERMISSION DENIED (403)');
      console.error('');
      console.error('Possible causes:');
      console.error('  1. Firestore rules deny read access');
      console.error('  2. API key does not have Firestore read permissions');
      console.error('  3. API key is invalid');
      console.error('');
      console.error('Solution: Check Firestore security rules in Firebase Console');
    } else if (response.status === 401) {
      console.error('❌ UNAUTHORIZED (401)');
      console.error('');
      console.error('The API key may be invalid or expired.');
    } else {
      console.error(`❌ API Error (${response.status})`);
      console.error('Response:', response.body);
    }

  } catch (error) {
    console.error('❌ AUDIT ERROR:');
    console.error(error.message);
    console.error('');
    console.error('This is likely a network or configuration issue.');
  } finally {
    console.log('');
    console.log('═'.repeat(70));
    console.log('AUDIT COMPLETE');
    console.log('═'.repeat(70));
    console.log('');
    process.exit(0);
  }
}

runAudit();
