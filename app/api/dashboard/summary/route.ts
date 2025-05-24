import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, week, year
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get summary statistics
    const [
      totalIncome,
      totalExpense,
      transactionCount,
      recentTransactions,
      accountsBalance,
      categoryStats
    ] = await Promise.all([
      // Total income for the period
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: 'INCOME',
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Total expense for the period
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Transaction count for the period
      prisma.transaction.count({
        where: {
          userId: session.user.id,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),
      
      // Recent transactions (last 5)
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          category: {
            select: {
              name: true,
              icon: true,
              color: true,
              type: true,
            },
          },
          bankAccount: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: 5,
      }),
      
      // Total balance across all accounts
      prisma.bankAccount.aggregate({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        _sum: {
          balance: true,
        },
      }),
      
      // Expense breakdown by category for the period
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId: session.user.id,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Get category details for the stats
    const categoryIds = categoryStats.map(stat => stat.categoryId);
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
      },
    });

    const categoryStatsWithDetails = categoryStats.map(stat => {
      const category = categories.find(cat => cat.id === stat.categoryId);
      return {
        ...stat,
        category,
      };
    });

    const summary = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome: totalIncome._sum.amount?.toNumber() || 0,
      totalExpense: totalExpense._sum.amount?.toNumber() || 0,
      netIncome: (totalIncome._sum.amount?.toNumber() || 0) - (totalExpense._sum.amount?.toNumber() || 0),
      transactionCount,
      totalBalance: accountsBalance._sum.balance?.toNumber() || 0,
      recentTransactions,
      categoryStats: categoryStatsWithDetails,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
