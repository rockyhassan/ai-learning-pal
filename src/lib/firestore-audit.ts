/**
 * FIRESTORE READ-ONLY AUDIT UTILITY
 * 
 * This module provides functions to audit the Firestore database.
 * READ-ONLY: No data is created, modified, or deleted.
 */

import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

export interface CollectionInfo {
  name: string;
  documentCount: number;
  documents?: {
    id: string;
    fields: string[];
  }[];
}

export interface FirestoreAudit {
  timestamp: string;
  projectId: string;
  collections: CollectionInfo[];
  usersCollectionExists: boolean;
  usersDocumentCount: number;
  usersDocuments?: {
    id: string;
    fields: string[];
  }[];
}

/**
 * Audit a specific collection (READ-ONLY)
 */
export async function auditCollection(collectionName: string): Promise<CollectionInfo> {
  try {
    const collRef = collection(db, collectionName);
    const q = query(collRef);
    const snapshot = await getDocs(q);

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      fields: Object.keys(doc.data()),
    }));

    return {
      name: collectionName,
      documentCount: snapshot.docs.length,
      documents: documents.slice(0, 10), // Show first 10
    };
  } catch (error: any) {
    console.error(`Error auditing collection "${collectionName}":`, error);
    return {
      name: collectionName,
      documentCount: 0,
      documents: [],
    };
  }
}

/**
 * Audit specific collection: /users
 */
export async function auditUsersCollection(): Promise<{
  exists: boolean;
  documentCount: number;
  documents: { id: string; fields: string[] }[];
}> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const snapshot = await getDocs(q);

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      fields: Object.keys(doc.data()),
    }));

    return {
      exists: true,
      documentCount: snapshot.docs.length,
      documents: documents,
    };
  } catch (error: any) {
    // If collection doesn't exist or no read access, it will error
    if (
      error.code === 'not-found' ||
      error.message.includes('collection') ||
      error.message.includes('exists')
    ) {
      return {
        exists: false,
        documentCount: 0,
        documents: [],
      };
    }
    console.error('Error auditing /users collection:', error);
    return {
      exists: false,
      documentCount: 0,
      documents: [],
    };
  }
}

/**
 * Full Firestore database audit
 */
export async function auditFirestore(): Promise<FirestoreAudit> {
  console.log('🔍 Starting Firestore audit...');

  // Known collections based on code analysis
  const knownCollections = ['diary', 'exams', 'users', 'audit', 'routines'];

  const collections: CollectionInfo[] = [];

  for (const collName of knownCollections) {
    const info = await auditCollection(collName);
    if (info.documentCount > 0 || collName === 'users') {
      // Include users even if empty for reporting
      collections.push(info);
    }
  }

  // Audit /users specifically
  const usersAudit = await auditUsersCollection();

  return {
    timestamp: new Date().toISOString(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    collections,
    usersCollectionExists: usersAudit.exists,
    usersDocumentCount: usersAudit.documentCount,
    usersDocuments: usersAudit.documents,
  };
}

/**
 * Print audit results to console
 */
export function printAuditResults(audit: FirestoreAudit) {
  console.log('\n' + '='.repeat(70));
  console.log('FIRESTORE DATABASE AUDIT - READ-ONLY');
  console.log('='.repeat(70));
  console.log('');
  console.log('Project:', audit.projectId);
  console.log('Audit Time:', audit.timestamp);
  console.log('');

  console.log('📋 COLLECTIONS FOUND:');
  console.log('─'.repeat(70));
  console.log('');

  if (audit.collections.length === 0) {
    console.log('⚠️  No collections found');
  } else {
    audit.collections.forEach((coll, i) => {
      console.log(`${i + 1}. ${coll.name}`);
      console.log(`   Documents: ${coll.documentCount}`);
      if (coll.documents && coll.documents.length > 0) {
        console.log(`   Sample documents:`);
        coll.documents.slice(0, 3).forEach(doc => {
          console.log(`     - ${doc.id} (fields: ${doc.fields.join(', ')})`);
        });
      }
      console.log('');
    });
  }

  console.log('─'.repeat(70));
  console.log('🔍 /users COLLECTION STATUS:');
  console.log('─'.repeat(70));
  console.log('');

  if (audit.usersCollectionExists) {
    console.log('✅ /users collection EXISTS');
    console.log(`   Documents: ${audit.usersDocumentCount}`);
    console.log('');

    if (audit.usersDocuments && audit.usersDocuments.length > 0) {
      console.log('   User documents:');
      audit.usersDocuments.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.id}`);
        console.log(`      Fields: ${doc.fields.join(', ')}`);
      });
    } else {
      console.log('   ⚠️  Collection exists but is EMPTY (0 documents)');
    }
  } else {
    console.log('❌ /users COLLECTION DOES NOT EXIST');
    console.log('');
    console.log('   The /users collection has not been created.');
    console.log('   All verified users will need to be migrated.');
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('AUDIT COMPLETE');
  console.log('═'.repeat(70));
  console.log('');
}
