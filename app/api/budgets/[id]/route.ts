import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BudgetUpdateSchema = z.object({
  name: z.string().min(1, 'Nama budget wajib diisi').optional(),
  amount: z.number().positive('Jumlah budget harus lebih dari 0').optional(),
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  categoryId: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
});

// GET /api/budgets/[id] - Get specific budget
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id,
      },
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

    if (!budget) {
      return NextResponse.json({ error: 'Budget tidak ditemukan' }, { status: 404 });
    }

    // Calculate spending for this budget
    const whereTransactions: any = {
      userId: session.user.id,
      type: 'EXPENSE',
      date: {
        gte: budget.startDate,
        lte: budget.endDate,
      },
    };

    if (budget.categoryId) {
      whereTransactions.categoryId = budget.categoryId;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereTransactions,
      include: {
        category: true,
        bankAccount: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const totalSpent = transactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.amount),
      0
    );

    const budgetAmount = Number(budget.amount);
    const remaining = budgetAmount - totalSpent;
    const percentageUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

    const budgetWithDetails = {
      ...budget,
      amount: budgetAmount,
      totalSpent,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      status: remaining < 0 ? 'overbudget' : remaining < budgetAmount * 0.1 ? 'warning' : 'good',
      transactions,
    };

    return NextResponse.json(budgetWithDetails);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/budgets/[id] - Update budget
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = BudgetUpdateSchema.parse(body);

    // Check if budget exists and belongs to user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id,
      },
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget tidak ditemukan' }, { status: 404 });
    }

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

    const budget = await prisma.budget.update({
      where: {
        id: context.params.id,
      },
      data: validatedData,
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

    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/[id] - Delete budget
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if budget exists and belongs to user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id,
      },
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget tidak ditemukan' }, { status: 404 });
    }

    await prisma.budget.delete({
      where: {
        id: context.params.id,
      },
    });

    return NextResponse.json({ message: 'Budget berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
