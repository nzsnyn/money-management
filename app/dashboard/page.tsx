'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '../../components/navbar';

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description: string | null;
  date: string;
  category: {
    name: string;
    icon: string | null;
    color: string | null;
    type: 'INCOME' | 'EXPENSE';
  };
  bankAccount: {
    name: string;
    type: string;
  };
}

interface CategoryStat {
  categoryId: string;
  _sum: {
    amount: number;
  };
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

interface DashboardSummary {
  period: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  categoryStats: CategoryStat[];
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    if (status === 'authenticated') {
      loadSummary();
    }
  }, [status, period]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dashboard/summary?period=${period}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week':
        return '7 Hari Terakhir';
      case 'year':
        return 'Tahun Ini';
      case 'month':
      default:
        return 'Bulan Ini';
    }
  };

  if (status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Money Management</h1>
        <p className="mb-4">Please sign in to access your dashboard.</p>
        <Link href="/auth/signin" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <Navbar 
        title="Dashboard" 
        subtitle={`Selamat datang kembali, ${session?.user?.name}!`}
      >
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900 text-sm"
          >
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
          
          <Link 
            href="/transactions" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            Kelola Transaksi
          </Link>

          <Link 
            href="/budgets" 
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            Kelola Budget
          </Link>
        </div>
      </Navbar>

      <div className="min-h-screen bg-slate-50">
        <div className="p-6 max-w-7xl mx-auto">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-slate-700 font-medium">Memuat data dashboard...</p>
          </div>
        )}

      {!loading && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Total Saldo</h3>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalBalance)}</p>
              <p className="text-xs text-slate-500 mt-1">Semua akun</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pemasukan</h3>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
              <p className="text-xs text-slate-500 mt-1">{getPeriodLabel()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pengeluaran</h3>
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</p>
              <p className="text-xs text-slate-500 mt-1">{getPeriodLabel()}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Keuntungan Bersih</h3>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netIncome)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{getPeriodLabel()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Transaksi Terbaru
                  </h2>
                  <Link href="/transactions" className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200">
                    Lihat Semua
                  </Link>
                </div>
              </div>
              
              <div className="p-6">
                {summary.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-medium">Belum ada transaksi</p>
                    <p className="text-slate-500 text-sm mt-1">Mulai catat keuangan Anda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summary.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all duration-200 group">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'INCOME' 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                              : 'bg-gradient-to-br from-red-400 to-rose-500'
                          } shadow-md`}>
                            {transaction.type === 'INCOME' ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm group-hover:text-slate-700">
                              {transaction.description || transaction.category.name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <span>{formatDate(transaction.date)}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span>{transaction.bankAccount.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold text-sm ${
                          transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Kategori Pengeluaran Teratas
                </h2>
                <p className="text-sm text-slate-500 mt-1">{getPeriodLabel()}</p>
              </div>
              
              <div className="p-6">
                {summary.categoryStats.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-medium">Belum ada pengeluaran</p>
                    <p className="text-slate-500 text-sm mt-1">Data akan muncul setelah ada transaksi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summary.categoryStats.map((stat, index) => (
                      <div key={stat.categoryId} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all duration-200 group">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                              <span className="text-lg">{stat.category?.icon}</span>
                              <span>{stat.category?.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-sm text-red-600">
                          {formatCurrency(stat._sum.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Aksi Cepat
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                href="/transactions?type=INCOME" 
                className="group p-6 border-2 border-dashed border-green-200 rounded-2xl text-center hover:border-green-400 hover:bg-green-50 transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="text-green-600 text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">💰</div>
                <div className="text-sm font-semibold text-slate-800">Tambah Pemasukan</div>
                <div className="text-xs text-slate-500 mt-1">Catat pendapatan</div>
              </Link>
              
              <Link 
                href="/transactions?type=EXPENSE" 
                className="group p-6 border-2 border-dashed border-red-200 rounded-2xl text-center hover:border-red-400 hover:bg-red-50 transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="text-red-600 text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">💸</div>
                <div className="text-sm font-semibold text-slate-800">Tambah Pengeluaran</div>
                <div className="text-xs text-slate-500 mt-1">Catat belanja</div>
              </Link>
              
              <Link 
                href="/accounts" 
                className="group p-6 border-2 border-dashed border-blue-200 rounded-2xl text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="text-blue-600 text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">🏦</div>
                <div className="text-sm font-semibold text-slate-800">Kelola Akun</div>
                <div className="text-xs text-slate-500 mt-1">Atur rekening</div>
              </Link>
              
              <Link 
                href="/categories" 
                className="group p-6 border-2 border-dashed border-purple-200 rounded-2xl text-center hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="text-purple-600 text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">📂</div>
                <div className="text-sm font-semibold text-slate-800">Kelola Kategori</div>
                <div className="text-xs text-slate-500 mt-1">Atur klasifikasi</div>
              </Link>
            </div>
          </div>
        </>
      )}
      
        </div>
      </div>
    </>
  );
}
