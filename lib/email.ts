// Simple email service for Money Management app
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Function to create a new email transporter instance
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '587');
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    // Better connection reliability options
    tls: {
      rejectUnauthorized: false, // In production, this should be true
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
}

// Generate a random token for email verification
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Create a verification URL with the token
export const generateVerificationUrl = (token: string): string => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/auth/verify-email?token=${token}`;
};

// Check if email config is set in environment variables
export const isEmailConfigured = (): boolean => {
  return !!(
    process.env.EMAIL_SERVER_HOST &&
    process.env.EMAIL_SERVER_USER &&
    process.env.EMAIL_SERVER_PASSWORD &&
    process.env.EMAIL_FROM
  );
}

// Test the email connection
export const testEmailConnection = async (): Promise<boolean> => {
  if (!isEmailConfigured()) {
    console.warn('Email not configured - check your .env file');
    return false;
  }
  
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  name: string | null,
  token: string
): Promise<void> => {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured, skipping verification email');
    return;
  }

  const transporter = createTransporter();
  const verificationUrl = generateVerificationUrl(token);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your email address - Money Management App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Money Management!</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px;">
          <h2>Hello ${name || 'there'}!</h2>
          <p>Thank you for registering with our Money Management application. To complete your registration, please verify your email address.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
        </div>
      </div>
    `,
    text: `
      Welcome to Money Management!
      
      Hello ${name || 'there'}!
      
      Thank you for registering. Please verify your email by visiting: ${verificationUrl}
      
      This link will expire in 24 hours.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send verification email');
    } else {
      console.warn('Email sending failed in development mode, continuing...');
    }
  }
}

// Send welcome email after verification
export const sendWelcomeEmail = async (
  email: string,
  name: string | null
): Promise<void> => {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured, skipping welcome email');
    return;
  }

  const transporter = createTransporter();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Money Management App!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h1>🎉 Welcome to Money Management!</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px;">
          <h2>Hello ${name || 'there'}!</h2>
          <p>Congratulations! Your email has been verified and your account is now active.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${baseUrl}/dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Started</a>
          </div>
          
          <p>Happy budgeting!</p>
        </div>
      </div>
    `,
    text: `
      Welcome to Money Management!
      
      Hello ${name || 'there'}!
      
      Congratulations! Your email has been verified and your account is now active.
      
      Visit ${baseUrl}/dashboard to get started!
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}
