/**
 * Admin Firebase Authentication Prompt
 * 
 * Minimal UI component shown to admin when they need to verify with Google.
 * Only shown when:
 * - User is authenticated as admin (role === "admin")
 * - Admin is NOT yet authenticated with Firebase
 * - Admin is viewing a page that requires Firestore writes
 */

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { signInAdminWithGoogle, signOutFirebase } from '@/lib/admin-auth';
import { useApp } from '@/lib/app-state';

interface AdminFirebaseAuthPromptProps {
  onAuthSuccess?: () => void;
}

export function AdminFirebaseAuthPrompt({ onAuthSuccess }: AdminFirebaseAuthPromptProps) {
  const { t } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInAdminWithGoogle();
      onAuthSuccess?.();
    } catch (err: any) {
      console.error('Firebase auth error:', err);
      setError(err.message || 'Failed to verify with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setError(null);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔐</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-900">
            {t('Verify Admin with Google', 'অ্যাডমিনকে Google দিয়ে যাচাই করুন')}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {t(
              'To edit and publish diary entries online, you need to verify with your Google account.',
              'ডায়েরি এন্ট্রি অনলাইনে সম্পাদনা এবং প্রকাশ করতে, আপনার Google অ্যাকাউন্ট দিয়ে যাচাই করতে হবে।'
            )}
          </p>

          {error && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              ❌ {error}
            </p>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="tap mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <LogIn className="size-4" />
            {isLoading ? t('Signing in...', 'সাইন ইন করছে...') : t('Verify with Google', 'Google দিয়ে যাচাই করুন')}
          </button>

          {error && (
            <button
              onClick={handleDismiss}
              className="mt-2 text-xs text-amber-600 underline"
            >
              {t('Dismiss', 'বাতিল')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
