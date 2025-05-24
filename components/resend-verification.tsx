'use client';

import { useState } from 'react';

interface ResendVerificationProps {
  email: string;
}

export default function ResendVerification({ email }: ResendVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(data.message);
      } else {
        setIsSuccess(false);
        setMessage(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setIsSuccess(false);
      setMessage('An error occurred while sending the email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex items-center justify-center mb-3">
        <svg
          className="h-6 w-6 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-yellow-800 mb-2">
        Email Verification Required
      </h3>
      
      <p className="text-yellow-700 mb-4">
        Please check your email and click the verification link to activate your account.
        Didn't receive the email?
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          isSuccess 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={isLoading || isSuccess}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isLoading || isSuccess
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
              <path fill="currentColor" strokeWidth="4" className="opacity-75" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : isSuccess ? (
          'Email Sent!'
        ) : (
          'Resend Verification Email'
        )}
      </button>
    </div>
  );
}
