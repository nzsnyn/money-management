'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function TestUserAPI() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserData();
    }
  }, [status, session?.user?.id]);

  const fetchUserData = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/user/${session.user.id}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setUserData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    if (!session?.user?.id || !name.trim()) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const response = await fetch(`/api/user/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setUserData(data);
      setMessage('User updated successfully');
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="p-4">Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="p-4">Please sign in to test the User API</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test User API</h1>
      
      {loading && <div className="mb-4 text-blue-600">Loading...</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {message && <div className="mb-4 text-green-600">{message}</div>}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Current User Data</h2>
        {userData ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(userData, null, 2)}
          </pre>
        ) : (
          <p>No user data loaded</p>
        )}
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Update User</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New name"
            className="border p-2 flex-grow rounded"
          />
          <button
            onClick={updateUser}
            disabled={loading || !name.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Update
          </button>
        </div>
      </div>
      
      <div>
        <button
          onClick={fetchUserData}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
