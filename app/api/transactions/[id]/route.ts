import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionId = context.params.id;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            type: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionId = context.params.id;
    const data = await request.json();
    const { amount, type, description, notes, date, accountId, categoryId } = data;

    // Get the existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!amount || !type || !accountId || !categoryId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate transaction type
    if (!['INCOME', 'EXPENSE', 'TRANSFER'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Verify that the account and category belong to the user
    const [account, category] = await Promise.all([
      prisma.bankAccount.findFirst({
        where: { id: accountId, userId: session.user.id },
      }),
      prisma.category.findFirst({
        where: { id: categoryId, userId: session.user.id },
      }),
    ]);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Validate category type matches transaction type
    if (
      (type === 'INCOME' && category.type !== 'INCOME') ||
      (type === 'EXPENSE' && category.type !== 'EXPENSE')
    ) {
      return NextResponse.json(
        { error: 'Category type does not match transaction type' },
        { status: 400 }
      );
    }

    // Update transaction and adjust account balances
    const result = await prisma.$transaction(async (tx) => {
      // Reverse the old transaction's effect on balance
      const oldBalanceChange = existingTransaction.type === 'INCOME' 
        ? -existingTransaction.amount.toNumber() 
        : existingTransaction.amount.toNumber();
      
      if (existingTransaction.accountId === accountId) {
        // Same account - adjust for the old amount
        await tx.bankAccount.update({
          where: { id: existingTransaction.accountId },
          data: {
            balance: {
              increment: oldBalanceChange,
            },
          },
        });
      } else {
        // Different account - reverse old and apply to new
        await tx.bankAccount.update({
          where: { id: existingTransaction.accountId },
          data: {
            balance: {
              increment: oldBalanceChange,
            },
          },
        });
      }

      // Update the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          amount: parseFloat(amount),
          type,
          description: description || null,
          notes: notes || null,
          date: new Date(date),
          accountId,
          categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              type: true,
            },
          },
          bankAccount: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      // Apply the new transaction's effect on balance
      const newBalanceChange = type === 'INCOME' ? parseFloat(amount) : -parseFloat(amount);
      await tx.bankAccount.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: newBalanceChange,
          },
        },
      });

      return updatedTransaction;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactionId = context.params.id;

    // Get the existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Delete transaction and reverse its effect on account balance
    await prisma.$transaction(async (tx) => {
      // Reverse the transaction's effect on balance
      const balanceChange = existingTransaction.type === 'INCOME' 
        ? -existingTransaction.amount.toNumber() 
        : existingTransaction.amount.toNumber();
      
      await tx.bankAccount.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // Delete the transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    return NextResponse.json(
      { message: 'Transaction deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
