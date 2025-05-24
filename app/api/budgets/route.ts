import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Budget validation schema
const BudgetSchema = z.object({
  name: z.string().min(1, 'Nama budget wajib diisi'),
  amount: z.number().positive('Jumlah budget harus lebih dari 0'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  categoryId: z.string().nullable().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

// GET /api/budgets - Get user's budgets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status'); // 'active', 'completed', 'overbudget'

    // Build where clause
    let whereClause: any = {
      userId: session.user.id,
    };

    if (period) {
      whereClause.period = period;
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Get current date for status filtering
    const now = new Date();
    if (status === 'active') {
      whereClause.startDate = { lte: now };
      whereClause.endDate = { gte: now };
    } else if (status === 'completed') {
      whereClause.endDate = { lt: now };
    }

    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget: any) => {
        // Get transactions within budget period
        const whereTransactions: any = {
          userId: session.user.id,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
        };

        // If budget is category-specific, filter by category
        if (budget.categoryId) {
          whereTransactions.categoryId = budget.categoryId;
        }

        const transactions = await prisma.transaction.findMany({
          where: whereTransactions,
          select: {
            amount: true,
          },
        });

        const totalSpent = transactions.reduce(
          (sum: number, transaction: any) => sum + Number(transaction.amount),
          0
        );

        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - totalSpent;
        const percentageUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

        return {
          ...budget,
          amount: budgetAmount,
          totalSpent,
          remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          status: remaining < 0 ? 'overbudget' : remaining < budgetAmount * 0.1 ? 'warning' : 'good',
        };
      })
    );

    return NextResponse.json(budgetsWithSpending);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Create new budget
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = BudgetSchema.parse(body);

    // Check if category exists (if provided)
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          userId: session.user.id,
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Kategori tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    // Check for overlapping budgets
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: session.user.id,
        categoryId: validatedData.categoryId || null,
        OR: [
          {
            AND: [
              { startDate: { lte: validatedData.startDate } },
              { endDate: { gte: validatedData.startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: validatedData.endDate } },
              { endDate: { gte: validatedData.endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: validatedData.startDate } },
              { endDate: { lte: validatedData.endDate } },
            ],
          },
        ],
      },
    });

    if (existingBudget) {
      return NextResponse.json(
        { error: 'Budget untuk periode dan kategori ini sudah ada' },
        { status: 400 }
      );
    }

    const budgetData: any = {
      name: validatedData.name,
      amount: validatedData.amount,
      period: validatedData.period,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      userId: session.user.id,
    };

    if (validatedData.categoryId) {
      budgetData.categoryId = validatedData.categoryId;
    }

    const budget = await prisma.budget.create({
      data: budgetData,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
