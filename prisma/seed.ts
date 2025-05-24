import { PrismaClient } from '../app/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
      isEmailVerified: true, // Verified user for testing
      emailVerified: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      isEmailVerified: false, // Unverified user for testing
      emailVerificationToken: 'test-token-123',
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  });

  console.log('👥 Users created');

  // Create default categories for each user
  const incomeCategories = [
    { name: 'Salary', icon: '💼', color: '#10B981' },
    { name: 'Freelance', icon: '💻', color: '#6366F1' },
    { name: 'Investment', icon: '📈', color: '#8B5CF6' },
    { name: 'Other Income', icon: '💰', color: '#F59E0B' },
  ];

  const expenseCategories = [
    { name: 'Food & Dining', icon: '🍽️', color: '#EF4444' },
    { name: 'Transportation', icon: '🚗', color: '#F97316' },
    { name: 'Shopping', icon: '🛍️', color: '#EC4899' },
    { name: 'Entertainment', icon: '🎬', color: '#8B5CF6' },
    { name: 'Bills & Utilities', icon: '📄', color: '#6B7280' },
    { name: 'Healthcare', icon: '🏥', color: '#EF4444' },
    { name: 'Education', icon: '🎓', color: '#3B82F6' },
    { name: 'Travel', icon: '✈️', color: '#06B6D4' },
    { name: 'Other Expenses', icon: '💸', color: '#6B7280' },
  ];

  // Create categories for both users
  for (const user of [user1, user2]) {
    for (const category of incomeCategories) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: category.name } },
        update: {},
        create: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: 'INCOME',
          isDefault: true,
          userId: user.id,
        },
      });
    }

    for (const category of expenseCategories) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: category.name } },
        update: {},
        create: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: 'EXPENSE',
          isDefault: true,
          userId: user.id,
        },
      });
    }
  }

  console.log('📂 Categories created');

  // Create accounts for John
  const johnChecking = await prisma.bankAccount.create({
    data: {
      name: 'BCA Checking',
      type: 'CHECKING',
      balance: 5000000,
      currency: 'IDR',
      description: 'Primary checking account',
      userId: user1.id,
    },
  });

  const johnSavings = await prisma.bankAccount.create({
    data: {
      name: 'BCA Savings',
      type: 'SAVINGS',
      balance: 15000000,
      currency: 'IDR',
      description: 'Emergency fund savings',
      userId: user1.id,
    },
  });

  const johnCredit = await prisma.bankAccount.create({
    data: {
      name: 'BCA Credit Card',
      type: 'CREDIT_CARD',
      balance: -2500000,
      currency: 'IDR',
      description: 'BCA Mastercard',
      userId: user1.id,
    },
  });

  // Create accounts for Jane
  const janeChecking = await prisma.bankAccount.create({
    data: {
      name: 'Mandiri Checking',
      type: 'CHECKING',
      balance: 3500000,
      currency: 'IDR',
      description: 'Primary account',
      userId: user2.id,
    },
  });

  const janeSavings = await prisma.bankAccount.create({
    data: {
      name: 'Mandiri Savings',
      type: 'SAVINGS',
      balance: 8000000,
      currency: 'IDR',
      description: 'Savings account',
      userId: user2.id,
    },
  });

  console.log('🏦 Accounts created');

  // Get categories for transactions
  const salaryCategory = await prisma.category.findFirst({
    where: { name: 'Salary', userId: user1.id },
  });
  const foodCategory = await prisma.category.findFirst({
    where: { name: 'Food & Dining', userId: user1.id },
  });
  const transportCategory = await prisma.category.findFirst({
    where: { name: 'Transportation', userId: user1.id },
  });

  // Create sample transactions for John
  if (salaryCategory && foodCategory && transportCategory) {
    await prisma.transaction.createMany({
      data: [
        {
          amount: 12000000,
          type: 'INCOME',
          description: 'Monthly salary',
          date: new Date('2025-05-01'),
          userId: user1.id,
          accountId: johnChecking.id,
          categoryId: salaryCategory.id,
        },
        {
          amount: -150000,
          type: 'EXPENSE',
          description: 'Lunch at restaurant',
          date: new Date('2025-05-02'),
          userId: user1.id,
          accountId: johnChecking.id,
          categoryId: foodCategory.id,
        },
        {
          amount: -50000,
          type: 'EXPENSE',
          description: 'Grab ride to office',
          date: new Date('2025-05-03'),
          userId: user1.id,
          accountId: johnChecking.id,
          categoryId: transportCategory.id,
        },
        {
          amount: -75000,
          type: 'EXPENSE',
          description: 'Grocery shopping',
          date: new Date('2025-05-04'),
          userId: user1.id,
          accountId: johnChecking.id,
          categoryId: foodCategory.id,
        },
      ],
    });
  }

  console.log('💳 Transactions created');

  // Create budget for John
  if (foodCategory) {
    await prisma.budget.create({
      data: {
        name: 'Monthly Food Budget',
        amount: 2000000,
        spent: 225000,
        period: 'MONTHLY',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31'),
        userId: user1.id,
        categoryId: foodCategory.id,
      },
    });
  }

  // Create savings goal for John
  await prisma.goal.create({
    data: {
      name: 'Emergency Fund',
      description: '6 months of expenses for emergency',
      targetAmount: 50000000,
      currentAmount: 15000000,
      targetDate: new Date('2025-12-31'),
      userId: user1.id,
    },
  });

  await prisma.goal.create({
    data: {
      name: 'Vacation to Japan',
      description: 'Family trip to Japan next year',
      targetAmount: 25000000,
      currentAmount: 5000000,
      targetDate: new Date('2026-06-01'),
      userId: user1.id,
    },
  });

  console.log('🎯 Budgets and Goals created');
  console.log('✅ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });