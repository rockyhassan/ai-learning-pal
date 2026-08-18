import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface SchoolProfileData {
  studentName: string;
  schoolName: string;
  grade: string;
  section: string;
  roll: string;
  curriculum: string;
  updatedAt?: any;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  studentName: "Muhammad Affan Hassan Wafi",
  schoolName: "KCIS",
  grade: "Grade-3",
  section: "Section A",
  roll: "08",
  curriculum: "NCTB (English Version)",
};

export function useSchoolProfile() {
  const [profile, setProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const docRef = doc(db, "schoolProfile", "info");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            studentName: data.studentName || data.name || DEFAULT_SCHOOL_PROFILE.studentName,
            schoolName: data.schoolName || data.school || DEFAULT_SCHOOL_PROFILE.schoolName,
            grade: data.grade || data.className || DEFAULT_SCHOOL_PROFILE.grade,
            section: data.section || DEFAULT_SCHOOL_PROFILE.section,
            roll: data.roll || DEFAULT_SCHOOL_PROFILE.roll,
            curriculum: data.curriculum || data.board || DEFAULT_SCHOOL_PROFILE.curriculum,
            updatedAt: data.updatedAt,
          });
        } else {
          setProfile(DEFAULT_SCHOOL_PROFILE);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("[SCHOOL_PROFILE] Error listening to profile:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { profile, loading, error };
}

export async function updateSchoolProfile(data: Partial<SchoolProfileData>) {
  const docRef = doc(db, "schoolProfile", "info");
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
