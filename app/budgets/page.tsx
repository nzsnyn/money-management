'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ConfirmModal from '../../components/confirm-modal';
import Navbar from '../../components/navbar';

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  status: 'good' | 'warning' | 'overbudget';
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'INCOME' | 'EXPENSE';
}

interface BudgetSummary {
  overview: {
    totalBudgets: number;
    totalBudgetAmount: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentageUsed: number;
    budgetsByStatus: Record<string, number>;
  };
  activeBudgets: Budget[];
  recommendations: Array<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  }>;
}

export default function BudgetsPage() {
  const { data: session, status } = useSession();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    period: 'MONTHLY' as const,
    categoryId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      loadBudgets();
      loadCategories();
      loadSummary();
    }
  }, [status, selectedPeriod]);

  const loadBudgets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/budgets?period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setBudgets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.filter((cat: Category) => cat.type === 'EXPENSE'));
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/budgets/summary?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load budget summary:', err);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create budget');
      }

      setFormData({
        name: '',
        amount: '',
        period: 'MONTHLY',
        categoryId: '',
        startDate: '',
        endDate: '',
      });
      setShowCreateModal(false);
      loadBudgets();
      loadSummary();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete budget');
      }

      loadBudgets();
      loadSummary();
    } catch (err: any) {
      setError(err.message);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'warning':
        return 'text-yellow-800 bg-yellow-100 border border-yellow-200';
      case 'overbudget':
        return 'text-red-700 bg-red-100 border border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good':
        return 'Sehat';
      case 'warning':
        return 'Peringatan';
      case 'overbudget':
        return 'Terlampaui';
      default:
        return 'Unknown';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'overbudget':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'WEEKLY':
        return 'Mingguan';
      case 'MONTHLY':
        return 'Bulanan';
      case 'QUARTERLY':
        return 'Kuartalan';
      case 'YEARLY':
        return 'Tahunan';
      default:
        return period;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-white/20">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Akses Ditolak</h1>
          <p className="text-slate-600 mb-6">Silakan login untuk mengakses halaman ini.</p>
          <Link href="/auth/signin" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar 
        title="Budget & Anggaran"
        subtitle="Kelola dan pantau anggaran keuangan Anda"
        showBackButton={true}
        backHref="/dashboard"
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Budget
        </button>
      </Navbar>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        {/* Budget Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {summary.overview.totalBudgets}
              </h3>
              <p className="text-slate-700 text-sm font-medium">Total Budget Aktif</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(summary.overview.totalBudgetAmount)}
              </h3>
              <p className="text-slate-700 text-sm font-medium">Total Anggaran</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(summary.overview.totalSpent)}
              </h3>
              <p className="text-slate-700 text-sm font-medium">Total Pengeluaran</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  summary.overview.totalRemaining >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-6 h-6 ${
                    summary.overview.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className={`text-2xl font-bold mb-1 ${
                summary.overview.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(summary.overview.totalRemaining))}
              </h3>
              <p className="text-slate-700 text-sm font-medium">
                {summary.overview.totalRemaining >= 0 ? 'Sisa Anggaran' : 'Deficit'}
              </p>
            </div>
          </div>
        )}

        {/* Period Filter & Create Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:text-slate-900'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {summary?.recommendations && summary.recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Rekomendasi</h2>
            <div className="space-y-3">
              {summary.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    rec.type === 'success'
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : rec.type === 'warning'
                      ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                  }`}
                >
                  <h3 className="font-bold mb-1">{rec.title}</h3>
                  <p className="text-sm font-medium opacity-90">{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budgets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Belum Ada Budget</h3>
            <p className="text-slate-700 mb-6 font-medium">Mulai kelola keuangan dengan membuat budget pertama Anda.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Buat Budget Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {budgets.map((budget) => (
              <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    {budget.category ? (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: budget.category.color || '#6B7280' }}
                      >
                        {budget.category.icon || budget.category.name.charAt(0)}
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{budget.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        <span>{budget.category?.name || 'Semua Kategori'}</span>
                        <span>•</span>
                        <span>{getPeriodLabel(budget.period)}</span>
                        <span>•</span>
                        <span>{formatDate(budget.startDate)} - {formatDate(budget.endDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(budget.status)}`}>
                      {getStatusText(budget.status)}
                    </span>
                    
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 font-medium">
                      {formatCurrency(budget.totalSpent)} dari {formatCurrency(budget.amount)}
                    </span>
                    <span className={`font-bold ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {budget.remaining >= 0 ? 'Sisa' : 'Deficit'}: {formatCurrency(Math.abs(budget.remaining))}
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(budget.status)}`}
                      style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>0%</span>
                    <span className="font-bold text-slate-700">{budget.percentageUsed.toFixed(1)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Budget Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg mx-auto my-4 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Buat Budget Baru</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Nama Budget
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                    placeholder="e.g., Budget Makan Bulanan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Jumlah Budget
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Periode
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="WEEKLY">Mingguan</option>
                    <option value="MONTHLY">Bulanan</option>
                    <option value="QUARTERLY">Kuartalan</option>
                    <option value="YEARLY">Tahunan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Kategori (Opsional)
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200"
                  >
                    Buat Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showSignOutModal}
          onClose={() => setShowSignOutModal(false)}
          onConfirm={() => signOut({ callbackUrl: '/auth/signin' })}
          title="Konfirmasi Keluar"
          message="Apakah Anda yakin ingin keluar dari aplikasi?"
          confirmText="Ya, Keluar"
          cancelText="Batal"
        />
      </div>
    </div>
  );
}