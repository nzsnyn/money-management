# Money Management App - Authentication System

## 📋 Authentication Features

✅ **Email/Password Authentication** menggunakan NextAuth.js
✅ **Multi-user Support** dengan data isolation
✅ **Secure Password Hashing** dengan bcryptjs
✅ **Session Management** dengan JWT
✅ **Protected Routes** dengan middleware
✅ **Auto-registration** dengan default categories

## 🗄️ Database Schema

### NextAuth.js Tables:
- `users` - User accounts
- `accounts` - OAuth providers (extensible)
- `sessions` - User sessions
- `verificationtokens` - Email verification

### App-specific Tables:
- `bank_accounts` - User financial accounts
- `categories` - Transaction categories
- `transactions` - Financial transactions
- `budgets` - Budget planning
- `goals` - Savings goals

## 🚀 Getting Started

### 1. Environment Setup
Pastikan file `.env` memiliki:
```env
DATABASE_URL="your-postgresql-url"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### 2. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with sample data
npx prisma db seed
```

### 3. Start Development Server
```bash
npm run dev
```

## 📱 User Flow

### Registration:
1. User mengunjungi `/auth/signup`
2. Input name, email, password
3. Sistem create user + default categories
4. Redirect ke sign in page

### Login:
1. User mengunjungi `/auth/signin`
2. Input email/password
3. NextAuth verify credentials
4. Redirect ke `/dashboard`

### Protected Routes:
- `/dashboard/*` - Memerlukan authentication
- `/api/user/*` - API yang memerlukan authentication

## 🔧 Files Structure

```
app/
├── auth/
│   ├── signin/page.tsx          # Login page
│   └── signup/page.tsx          # Registration page
├── dashboard/page.tsx           # Protected dashboard
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts  # NextAuth handler
│       └── register/route.ts        # Registration API
components/
└── auth-provider.tsx           # Session provider wrapper
hooks/
└── use-auth.ts                 # Authentication hooks
lib/
├── auth.ts                     # NextAuth configuration
└── prisma.ts                   # Prisma client
types/
└── next-auth.d.ts             # TypeScript declarations
middleware.ts                   # Route protection
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs dengan salt rounds 12
- **CSRF Protection**: NextAuth.js built-in
- **Session Security**: Secure JWT dengan secret
- **Route Protection**: Middleware melindungi sensitive routes
- **Data Isolation**: User hanya bisa akses data mereka

## 🎯 Next Steps

1. **Email Verification** - Add email verification flow
2. **Password Reset** - Implement forgot password
3. **OAuth Providers** - Add Google/GitHub login
4. **2FA** - Two-factor authentication
5. **Role-based Access** - Admin/user roles

## 🧪 Testing

### Test Accounts (dari seed):
- **john@example.com** / password123
- **jane@example.com** / password123

### Manual Testing:
1. ✅ Registration dengan email baru
2. ✅ Login dengan credentials yang benar
3. ✅ Redirect ke dashboard setelah login
4. ✅ Access protected routes
5. ✅ Logout functionality

## 🔧 Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check DATABASE_URL di .env
   - Verify PostgreSQL connection

2. **NextAuth Configuration Error**
   - Check NEXTAUTH_SECRET di .env
   - Verify NEXTAUTH_URL setting

3. **Prisma Client Error**
   - Run `npx prisma generate`
   - Check schema.prisma syntax

4. **Session Issues**
   - Clear browser cookies
   - Check middleware.ts configuration

## 📊 Default Data

Setiap user baru akan mendapat:
- **9 Expense Categories**: Food, Transport, Shopping, dll
- **4 Income Categories**: Salary, Freelance, Investment, dll
- Semua kategori memiliki icon dan color

Authentication system sudah siap dan dapat diperluas sesuai kebutuhan aplikasi!
