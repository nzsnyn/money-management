'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ResendVerification from '@/components/resend-verification';

interface EmailVerificationRequiredProps {
  email: string;
}

export default function EmailVerificationRequired({ email }: EmailVerificationRequiredProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
            <svg
              className="h-8 w-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification Required
          </h2>
          <p className="mt-2 text-gray-600">
            You need to verify your email address before you can access your dashboard.
          </p>
        </div>

        <div className="mt-8">
          <ResendVerification email={email} />
        </div>

        <div className="text-center">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing out...' : 'Sign out and use a different account'}
          </button>
        </div>
      </div>
    </div>
  );
}
