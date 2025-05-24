import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const data = await request.json();
    const { name, type, balance, currency, description } = data;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate account type
    const validTypes = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LOAN'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      );
    }

    // Check if account exists and belongs to user
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const updatedAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        name,
        type,
        balance: balance !== undefined ? Number(balance) : existingAccount.balance,
        currency: currency || existingAccount.currency,
        description: description !== undefined ? description : existingAccount.description,
      },
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if account exists and belongs to user
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: id,
      },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing transactions. Please delete all transactions first or transfer them to another account.' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false instead of hard delete
    await prisma.bankAccount.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
