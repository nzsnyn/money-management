// Test script for email module
const emailModule = require('./lib/email');

console.log('Email module exports:', Object.keys(emailModule));

// Test if generateVerificationToken is a function
console.log('generateVerificationToken is a function:', 
  typeof emailModule.generateVerificationToken === 'function');

// Test token generation
try {
  console.log('Sample token:', emailModule.generateVerificationToken());
} catch (error) {
  console.error('Error generating token:', error.message);
}

// Test email configuration
console.log('Email configured:', emailModule.isEmailConfigured());

// Test creating verification URL
console.log('Verification URL:', emailModule.generateVerificationUrl('test-token'));