// Simple test page for email functionality
import { generateVerificationToken, sendVerificationEmail, testEmailConnection } from '@/lib/email';

export default async function TestEmail() {
  // Test email connection
  const isConnected = await testEmailConnection();
  
  // Generate a test token
  const testToken = generateVerificationToken();
  
  // Test sending email (disabled for now to avoid spamming)
  // await sendVerificationEmail('test@example.com', 'Test User', testToken);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Email Functionality Test</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Connection Test</h2>
        <p>Email connection: {isConnected ? '✅ Connected' : '❌ Not connected'}</p>
      </div>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Token Generation Test</h2>
        <p>Generated token: <code className="bg-gray-200 px-2 py-1 rounded">{testToken}</code></p>
      </div>
    </div>
  );
}
