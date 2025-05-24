import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/budgets/summary - Get budget summary and analytics
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'MONTHLY';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get active budgets for current period
    const activeBudgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        period: period as any,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        category: true,
      },
    });

    // Calculate spending for each active budget
    const budgetSummary = await Promise.all(
      activeBudgets.map(async (budget: any) => {
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

    // Calculate overall statistics
    const totalBudgetAmount = budgetSummary.reduce((sum: number, budget: any) => sum + budget.amount, 0);
    const totalSpent = budgetSummary.reduce((sum: number, budget: any) => sum + budget.totalSpent, 0);
    const totalRemaining = totalBudgetAmount - totalSpent;
    const overallPercentageUsed = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

    // Count budgets by status
    const budgetsByStatus = budgetSummary.reduce(
      (acc: Record<string, number>, budget: any) => {
        acc[budget.status] = (acc[budget.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get spending trends for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySpending = await prisma.transaction.groupBy({
      by: ['date'],
      where: {
        userId: session.user.id,
        type: 'EXPENSE',
        date: {
          gte: sixMonthsAgo,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Group by month
    const spendingByMonth = monthlySpending.reduce((acc: Record<string, number>, transaction: any) => {
      const month = new Date(transaction.date).toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + Number(transaction._sum.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get categories with most overspending
    const overbudgetCategories = budgetSummary
      .filter((budget: any) => budget.status === 'overbudget')
      .sort((a: any, b: any) => Math.abs(b.remaining) - Math.abs(a.remaining))
      .slice(0, 5);

    // Get upcoming budget period end dates
    const upcomingBudgets = activeBudgets
      .filter((budget: any) => {
        const daysUntilEnd = Math.ceil((budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilEnd <= 7 && daysUntilEnd > 0;
      })
      .sort((a: any, b: any) => a.endDate.getTime() - b.endDate.getTime());

    const summary = {
      overview: {
        totalBudgets: activeBudgets.length,
        totalBudgetAmount,
        totalSpent,
        totalRemaining,
        overallPercentageUsed: Math.round(overallPercentageUsed * 100) / 100,
        budgetsByStatus,
      },
      activeBudgets: budgetSummary,
      spendingTrends: spendingByMonth,
      overbudgetCategories,
      upcomingBudgets: upcomingBudgets.map((budget: any) => ({
        ...budget,
        daysUntilEnd: Math.ceil((budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recommendations: generateRecommendations(budgetSummary, totalSpent, totalBudgetAmount),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(budgets: any[], totalSpent: number, totalBudget: number) {
  const recommendations = [];

  // Check for overbudget categories
  const overbudgetBudgets = budgets.filter(b => b.status === 'overbudget');
  if (overbudgetBudgets.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Budget Terlampaui',
      message: `Anda telah melampaui budget di ${overbudgetBudgets.length} kategori. Pertimbangkan untuk mengurangi pengeluaran atau menyesuaikan budget.`,
    });
  }

  // Check for warning budgets
  const warningBudgets = budgets.filter(b => b.status === 'warning');
  if (warningBudgets.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Mendekati Batas Budget',
      message: `Budget Anda di ${warningBudgets.length} kategori hampir habis. Pantau pengeluaran dengan lebih ketat.`,
    });
  }

  // Overall spending check
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  if (overallPercentage > 90) {
    recommendations.push({
      type: 'warning',
      title: 'Total Pengeluaran Tinggi',
      message: 'Anda telah menggunakan lebih dari 90% dari total budget. Pertimbangkan untuk lebih berhemat.',
    });
  } else if (overallPercentage < 50) {
    recommendations.push({
      type: 'success',
      title: 'Pengelolaan Budget Baik',
      message: 'Selamat! Anda berhasil mengelola budget dengan baik. Pertimbangkan untuk menabung lebih banyak.',
    });
  }

  // No active budgets
  if (budgets.length === 0) {
    recommendations.push({
      type: 'info',
      title: 'Buat Budget Pertama',
      message: 'Mulai kelola keuangan dengan membuat budget untuk kategori pengeluaran Anda.',
    });
  }

  return recommendations;
}
