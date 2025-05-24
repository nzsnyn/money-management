#!/usr/bin/env node

const { testEmailConnection, sendVerificationEmail, generateVerificationToken } = require('./lib/email.ts');

async function testEmailSystem() {
  console.log('🔧 Testing Email Verification System...\n');

  // Test 1: Check if email is configured
  console.log('1. Checking email configuration...');
  const isConfigured = require('./lib/email.ts').isEmailConfigured();
  console.log(`   Email configured: ${isConfigured ? '✅' : '❌'}`);

  if (!isConfigured) {
    console.log('   ❌ Email not configured. Please check your .env file.');
    return;
  }

  // Test 2: Test email connection
  console.log('\n2. Testing email connection...');
  try {
    const connectionResult = await testEmailConnection();
    console.log(`   Connection test: ${connectionResult ? '✅' : '❌'}`);
    
    if (!connectionResult) {
      console.log('   ❌ Email connection failed.');
      return;
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error.message}`);
    return;
  }

  // Test 3: Test sending a verification email
  console.log('\n3. Testing verification email send...');
  try {
    const testToken = generateVerificationToken();
    await sendVerificationEmail(
      'test@example.com',
      'Test User',
      testToken
    );
    console.log('   ✅ Verification email sent successfully!');
  } catch (error) {
    console.log(`   ❌ Email send error: ${error.message}`);
  }

  console.log('\n🎉 Email system test completed!');
}

testEmailSystem().catch(console.error);
