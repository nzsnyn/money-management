# Email Verification Testing Guide

## 🎯 Quick Test Summary

The email verification system has been successfully implemented! Here's how to test it:

## 🚀 Setup Instructions

### 1. Configure Email Service
Update your `.env` file with email service credentials:

```env
# Email Configuration (required for sending verification emails)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="your-email@gmail.com"
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use your Gmail address and app password

### 2. Start the Application
```bash
npm run dev
```

## 🧪 Testing Scenarios

### Test Account 1: Verified User (Works Immediately)
- **Email:** john@example.com
- **Password:** password123
- **Status:** ✅ Email verified - can access dashboard

### Test Account 2: Unverified User (Shows Verification Flow)
- **Email:** jane@example.com  
- **Password:** password123
- **Status:** ❌ Email not verified - will see verification requirement

## 📋 Test Flow

### 1. Test New User Registration
1. Go to `/auth/signup`
2. Create a new account
3. Check that verification email is sent (if configured)
4. User should see message about checking email

### 2. Test Unverified User Sign-in
1. Go to `/auth/signin`
2. Try to sign in with `jane@example.com` / `password123`
3. Should see "Please verify your email" error
4. Should see "Resend Verification" component

### 3. Test Email Verification
1. Use verification URL: `/auth/verify-email?token=test-token-123`
2. Should see success message and redirect to sign-in
3. Jane's account should now be verified

### 4. Test Verified User Access
1. Sign in with `john@example.com` / `password123`
2. Should access dashboard immediately
3. No verification prompts should appear

### 5. Test Dashboard Protection
1. Try accessing `/dashboard` without signing in
2. Should redirect to sign-in page
3. Sign in with unverified account
4. Should see email verification requirement page

## 🔍 What to Look For

### ✅ Expected Behaviors
- New users get verification emails (if email configured)
- Unverified users cannot access dashboard
- Verification links work correctly
- Verified users have full access
- Clear error messages for unverified users
- Resend verification functionality works

### ❌ Potential Issues
- Email not configured: Registration works but no emails sent
- Token expiration: Verification links expire after 24 hours
- Network issues: Email service failures should not break registration

## 🛠️ Key Files Created/Modified

### API Routes
- `/api/auth/register` - Enhanced with email verification
- `/api/auth/verify-email` - Handles verification tokens
- `/api/auth/resend-verification` - Resends verification emails
- `/api/user/[id]` - Fetches user verification status

### Components
- `ResendVerification` - UI for resending verification emails
- `EmailVerificationRequired` - Blocks unverified users

### Pages
- `/auth/verify-email` - Handles email verification links
- Updated sign-in/sign-up pages with verification flow

### Services
- `lib/email.ts` - Email sending and template generation
- Enhanced authentication to check verification status

## 🚨 Important Notes

1. **Email Configuration:** If email is not configured, users can still register but won't receive verification emails
2. **Test Tokens:** Jane's account has a test token `test-token-123` for testing
3. **Database:** Verification fields added to User model
4. **Security:** Tokens expire after 24 hours for security

## 🔧 Troubleshooting

### Email Not Sending
- Check environment variables
- Verify email service credentials
- Check console for error messages
- Registration will still work, just no email

### Verification Not Working
- Check token expiration (24 hours)
- Verify database schema is updated
- Check API route responses in browser dev tools

### Dashboard Access Issues
- Clear browser session/cookies
- Check user verification status in database
- Verify middleware configuration

## 🎉 Success Criteria

The email verification system is working correctly if:
1. ✅ New users receive verification emails
2. ✅ Unverified users cannot access dashboard
3. ✅ Verification links activate accounts
4. ✅ Verified users have full access
5. ✅ Error messages are clear and helpful
6. ✅ Resend functionality works

Ready to test! 🚀
