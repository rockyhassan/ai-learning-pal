#!/usr/bin/env node

/**
 * Setup Firestore Emulator test data using REST API
 */

const projectId = 'wafi-learning-buddy-new';
const firestoreUrl = 'http://localhost:8081/v1/projects/' + projectId + '/databases/(default)/documents';

async function setupTestData() {
  console.log('Setting up Firestore Emulator test data...\n');

  try {
    // Create authorized emails collection
    const emails = [
      {
        docId: 'rockyhsn9@gmail.com',
        data: {
          email: 'rockyhsn9@gmail.com',
          name: 'Rocky',
          role: 'admin',
          status: 'active'
        }
      },
      {
        docId: 'unauthorized@example.com',
        data: {
          email: 'unauthorized@example.com',
          name: 'Unauthorized User',
          role: 'student',
          status: 'active'
        }
      }
    ];

    for (const { docId, data } of emails) {
      const url = firestoreUrl + '/authorizedEmails/' + docId;
      const body = {
        fields: Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = { stringValue: String(value) };
          return acc;
        }, {})
      };

      console.log(`Creating ${docId}...`);
      console.log(`URL: ${url}`);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`❌ Failed: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error(text);
        continue;
      }

      console.log(`✅ Created ${docId}\n`);
    }

    console.log('✅ Test data setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTestData();
