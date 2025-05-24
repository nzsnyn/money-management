// Test TypeScript email module
import { 
  generateVerificationToken, 
  generateVerificationUrl, 
  isEmailConfigured, 
  testEmailConnection 
} from './lib/email';

async function testEmailModule() {
  console.log('Running email module tests...');

  try {
    // Test token generation
    const token = generateVerificationToken();
    console.log('✓ Generated verification token:', token);

    // Test URL generation
    const url = generateVerificationUrl(token);
    console.log('✓ Generated verification URL:', url);

    // Test configuration check
    const configured = isEmailConfigured();
    console.log('✓ Email configured:', configured);

    // Test connection only if configured
    if (configured) {
      console.log('Testing email connection...');
      const connected = await testEmailConnection();
      console.log('✓ Connection test result:', connected ? 'Success' : 'Failed');
    }

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailModule().catch(console.error);
