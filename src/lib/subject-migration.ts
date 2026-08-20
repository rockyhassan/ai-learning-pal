import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { resolveCanonicalSubject } from "./subjects";

export interface NormalizationChange {
  from: string;
  to: string;
  diaryCount: number;
  routineCount: number;
  totalCount: number;
}

export interface NormalizationScanResult {
  totalDiaryDocs: number;
  totalRoutineDocs: number;
  nonCanonicalDiaryCount: number;
  nonCanonicalRoutineCount: number;
  changes: NormalizationChange[];
  isClean: boolean;
}

export interface NormalizationExecutionResult {
  updatedDiaryCount: number;
  updatedRoutineCount: number;
  totalUpdated: number;
  changesApplied: NormalizationChange[];
}

/**
 * Scans all Firestore documents in /diary and /routine collections
 * and calculates what changes would occur if normalized to Master Canonical Subjects.
 * Does NOT modify the database (Dry-Run).
 */
export async function scanAndPreviewNormalization(): Promise<NormalizationScanResult> {
  const diarySnapshot = await getDocs(collection(db, "diary"));
  const routineSnapshot = await getDocs(collection(db, "routine"));

  const changeMap = new Map<string, { from: string; to: string; diaryCount: number; routineCount: number }>();

  let nonCanonicalDiaryCount = 0;
  let nonCanonicalRoutineCount = 0;

  // 1. Scan Diary collection
  diarySnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const rawSubject = ((data["subject"] as string) || "").trim();
    if (!rawSubject) return;

    const canonical = resolveCanonicalSubject(rawSubject);
    if (rawSubject !== canonical) {
      nonCanonicalDiaryCount++;
      const key = `${rawSubject}--->${canonical}`;
      const existing = changeMap.get(key) || {
        from: rawSubject,
        to: canonical,
        diaryCount: 0,
        routineCount: 0,
      };
      existing.diaryCount++;
      changeMap.set(key, existing);
    }
  });

  // 2. Scan Routine collection
  routineSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const rawSubject = ((data["subject"] as string) || "").trim();
    if (!rawSubject) return;

    const canonical = resolveCanonicalSubject(rawSubject);
    if (rawSubject !== canonical) {
      nonCanonicalRoutineCount++;
      const key = `${rawSubject}--->${canonical}`;
      const existing = changeMap.get(key) || {
        from: rawSubject,
        to: canonical,
        diaryCount: 0,
        routineCount: 0,
      };
      existing.routineCount++;
      changeMap.set(key, existing);
    }
  });

  const changes: NormalizationChange[] = Array.from(changeMap.values())
    .map((c) => ({
      ...c,
      totalCount: c.diaryCount + c.routineCount,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  return {
    totalDiaryDocs: diarySnapshot.size,
    totalRoutineDocs: routineSnapshot.size,
    nonCanonicalDiaryCount,
    nonCanonicalRoutineCount,
    changes,
    isClean: changes.length === 0,
  };
}

/**
 * Executes a live batch normalization across /diary and /routine collections in Firestore.
 * Automatically updates all non-canonical names to canonical Master Subject names in chunked batches (up to 450 ops per batch).
 */
export async function executeDatabaseNormalization(): Promise<NormalizationExecutionResult> {
  const diarySnapshot = await getDocs(collection(db, "diary"));
  const routineSnapshot = await getDocs(collection(db, "routine"));

  const changeMap = new Map<string, { from: string; to: string; diaryCount: number; routineCount: number }>();

  // Collect operations for Diary
  const diaryOps: Array<{ docId: string; newSubject: string }> = [];
  diarySnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const rawSubject = ((data["subject"] as string) || "").trim();
    if (!rawSubject) return;

    const canonical = resolveCanonicalSubject(rawSubject);
    if (rawSubject !== canonical) {
      diaryOps.push({ docId: docSnap.id, newSubject: canonical });
      const key = `${rawSubject}--->${canonical}`;
      const existing = changeMap.get(key) || {
        from: rawSubject,
        to: canonical,
        diaryCount: 0,
        routineCount: 0,
      };
      existing.diaryCount++;
      changeMap.set(key, existing);
    }
  });

  // Collect operations for Routine
  const routineOps: Array<{ docId: string; newSubject: string }> = [];
  routineSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const rawSubject = ((data["subject"] as string) || "").trim();
    if (!rawSubject) return;

    const canonical = resolveCanonicalSubject(rawSubject);
    if (rawSubject !== canonical) {
      routineOps.push({ docId: docSnap.id, newSubject: canonical });
      const key = `${rawSubject}--->${canonical}`;
      const existing = changeMap.get(key) || {
        from: rawSubject,
        to: canonical,
        diaryCount: 0,
        routineCount: 0,
      };
      existing.routineCount++;
      changeMap.set(key, existing);
    }
  });

  // Execute chunked batch writes for Diary (up to 450 items per batch)
  let updatedDiaryCount = 0;
  for (let i = 0; i < diaryOps.length; i += 450) {
    const batch = writeBatch(db);
    const chunk = diaryOps.slice(i, i + 450);
    chunk.forEach((op) => {
      batch.update(doc(db, "diary", op.docId), { subject: op.newSubject });
      updatedDiaryCount++;
    });
    await batch.commit();
  }

  // Execute chunked batch writes for Routine (up to 450 items per batch)
  let updatedRoutineCount = 0;
  for (let i = 0; i < routineOps.length; i += 450) {
    const batch = writeBatch(db);
    const chunk = routineOps.slice(i, i + 450);
    chunk.forEach((op) => {
      batch.update(doc(db, "routine", op.docId), { subject: op.newSubject });
      updatedRoutineCount++;
    });
    await batch.commit();
  }

  const changesApplied: NormalizationChange[] = Array.from(changeMap.values()).map((c) => ({
    ...c,
    totalCount: c.diaryCount + c.routineCount,
  }));

  return {
    updatedDiaryCount,
    updatedRoutineCount,
    totalUpdated: updatedDiaryCount + updatedRoutineCount,
    changesApplied,
  };
}
