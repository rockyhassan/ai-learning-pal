/**
 * Firestore Audit Route
 * 
 * READ-ONLY audit of Firestore database
 * Accessible at: /audit
 */

import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { auditFirestore, printAuditResults, type FirestoreAudit } from '../lib/firestore-audit';

export const Route = createFileRoute('/audit')({
  component: AuditPage,
});

function AuditPage() {
  const [audit, setAudit] = useState<FirestoreAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runAudit = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('\n' + '='.repeat(70));
        console.log('FIRESTORE READ-ONLY AUDIT');
        console.log('='.repeat(70) + '\n');

        const result = await auditFirestore();
        setAudit(result);

        // Print to console
        printAuditResults(result);

        console.log('📋 Audit data available in React state');
        console.log('✅ Open browser DevTools Console to see full results above');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('❌ Audit failed:', message);
      } finally {
        setLoading(false);
      }
    };

    runAudit();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', lineHeight: '1.6' }}>
      <h1>🔍 Firestore Database Audit</h1>

      {loading && (
        <div style={{ color: '#1a73e8', fontSize: '16px' }}>
          ⏳ Running audit... (check browser console for results)
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '4px',
            marginTop: '15px',
          }}
        >
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {audit && (
        <div style={{ marginTop: '20px' }}>
          <h2>✅ Audit Results</h2>

          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', marginTop: '15px' }}>
            <strong>Project:</strong> {audit.projectId}
            <br />
            <strong>Timestamp:</strong> {audit.timestamp}
          </div>

          <h3 style={{ marginTop: '20px' }}>📊 Collections</h3>

          {audit.collections.length === 0 ? (
            <p>No collections found</p>
          ) : (
            <div>
              {audit.collections.map((coll, i) => (
                <div
                  key={coll.name}
                  style={{
                    background: '#f9f9f9',
                    padding: '12px',
                    margin: '8px 0',
                    borderLeft: '4px solid #1a73e8',
                    borderRadius: '4px',
                  }}
                >
                  <strong>
                    {i + 1}. {coll.name}
                  </strong>
                  <br />
                  Documents: {coll.documentCount}
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: '20px' }}>👥 /users Collection</h3>

          {audit.usersCollectionExists ? (
            <div
              style={{
                background: '#e8f5e9',
                border: '1px solid #4caf50',
                padding: '15px',
                borderRadius: '4px',
              }}
            >
              <strong style={{ color: '#2e7d32' }}>✅ EXISTS</strong>
              <br />
              Documents: {audit.usersDocumentCount}
              <br />
              {audit.usersDocumentCount === 0 && <em>(Collection is empty)</em>}
            </div>
          ) : (
            <div
              style={{
                background: '#ffebee',
                border: '1px solid #f44336',
                padding: '15px',
                borderRadius: '4px',
              }}
            >
              <strong style={{ color: '#c62828' }}>❌ DOES NOT EXIST</strong>
              <br />
              The /users collection has not been created in Firestore.
            </div>
          )}

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            <strong>📝 For detailed results:</strong>
            <br />
            Open DevTools (F12) → Console tab to see full audit output
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          background: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '4px',
          color: '#0c5460',
        }}
      >
        <strong>ℹ️ This is a READ-ONLY audit</strong>
        <br />
        No data is created, modified, or deleted.
      </div>
    </div>
  );
}
