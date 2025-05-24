'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ConfirmModal from '../../components/confirm-modal';
import Navbar from '../../components/navbar';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccountTransfer {
  id?: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
}

interface AccountSummary {
  totalAccounts: number;
  totalBalance: number;
  byType: Record<string, { count: number; balance: number }>;
  byCurrency: Record<string, { count: number; balance: number }>;
}

export default function AccountsPage() {
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'SAVINGS',
    balance: '',
    currency: 'IDR',
    description: '',
  });

  // Enhanced features state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'type' | 'created'>('name');
  const [filterType, setFilterType] = useState<'ALL' | 'SAVINGS' | 'CHECKING' | 'CREDIT' | 'CASH' | 'INVESTMENT'>('ALL');

  useEffect(() => {
    if (status === 'authenticated') {
      loadAccounts();
      loadAccountSummary();
    }
  }, [status]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/accounts');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAccounts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadAccountSummary = async () => {
    try {
      const response = await fetch('/api/accounts');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const accounts: Account[] = await response.json();
      
      // Calculate summary
      const summary: AccountSummary = {
        totalAccounts: accounts.length,
        totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
        byType: {},
        byCurrency: {}
      };

      // Group by type
      accounts.forEach(account => {
        if (!summary.byType[account.type]) {
          summary.byType[account.type] = { count: 0, balance: 0 };
        }
        summary.byType[account.type].count++;
        summary.byType[account.type].balance += account.balance;

        if (!summary.byCurrency[account.currency]) {
          summary.byCurrency[account.currency] = { count: 0, balance: 0 };
        }
        summary.byCurrency[account.currency].count++;
        summary.byCurrency[account.currency].balance += account.balance;
      });

      setAccountSummary(summary);
    } catch (err: any) {
      console.error('Failed to load account summary:', err);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.balance) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      setMessage(editingAccount ? 'Account updated successfully' : 'Account created successfully');
      setShowForm(false);
      setEditingAccount(null);
      resetForm();
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      description: account.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (accountId: string) => {
    setAccountToDelete(accountId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/accounts/${accountToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      setMessage('Account deleted successfully');
      await loadAccounts();
      setAccountToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'SAVINGS',
      balance: '',
      currency: 'IDR',
      description: '',
    });
  };

  // Enhanced account management functions
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
      setError('Please fill in all transfer fields');
      return;
    }

    if (transferData.fromAccountId === transferData.toAccountId) {
      setError('Cannot transfer to the same account');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Create transfer transaction
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'TRANSFER',
          amount: parseFloat(transferData.amount),
          description: transferData.description || 'Account Transfer',
          bankAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          date: transferData.date,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transfer');
      }
      
      setMessage('Transfer completed successfully');
      setShowTransferModal(false);
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      await loadAccounts();
      await loadAccountSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAccounts.length === 0) {
      setError('No accounts selected');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const deletePromises = selectedAccounts.map(id => 
        fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(r => !r.ok);
      
      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} accounts`);
      }
      
      setMessage(`Successfully deleted ${selectedAccounts.length} accounts`);
      setSelectedAccounts([]);
      setShowBulkModal(false);
      await loadAccounts();
      await loadAccountSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to delete accounts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(account => account.id));
    }
  };

  const getSortedAndFilteredAccounts = () => {
    let filtered = accounts;
    
    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter(account => account.type === filterType);
    }
    
    // Sort accounts
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'balance':
          return b.balance - a.balance;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  const exportAccounts = () => {
    const csvContent = [
      ['Name', 'Type', 'Balance', 'Currency', 'Description', 'Created At'],
      ...accounts.map(account => [
        account.name,
        account.type,
        account.balance.toString(),
        account.currency,
        account.description || '',
        new Date(account.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Utility functions
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'SAVINGS':
        return '🏦';
      case 'CHECKING':
        return '💳';
      case 'CREDIT':
        return '💰';
      case 'CASH':
        return '💵';
      case 'INVESTMENT':
        return '📈';
      default:
        return '🏛️';
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'SAVINGS':
        return 'Tabungan';
      case 'CHECKING':
        return 'Giro';
      case 'CREDIT':
        return 'Kredit';
      case 'CASH':
        return 'Tunai';
      case 'INVESTMENT':
        return 'Investasi';
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-3 text-slate-800 font-medium">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Akses Terbatas</h1>
          <p className="text-slate-700 mb-6">Silakan masuk untuk melihat halaman akun</p>
          <Link href="/auth/signin" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium">
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar 
        title="Kelola Akun" 
        subtitle="Atur rekening bank dan sumber dana Anda"
        showBackButton={true}
        backHref="/dashboard"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingAccount(null);
              resetForm();
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Akun
            </span>
          </button>
          
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transfer
            </span>
          </button>
          
          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Statistik
            </span>
          </button>
          
          <button
            onClick={exportAccounts}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2.5 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </span>
          </button>
        </div>
      </Navbar>

      <div className="min-h-screen bg-slate-50">
        <div className="p-6 max-w-6xl mx-auto">
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

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {message}
              </div>
            </div>
          )}

          {/* Account Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg mx-auto my-4 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {editingAccount ? '✏️ Edit Akun' : '➕ Tambah Akun'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingAccount(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">Nama Akun *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900 text-sm"
                      placeholder="Contoh: BCA Tabungan, Mandiri Giro"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">Jenis Akun *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900 text-sm"
                      required
                    >
                      <option value="SAVINGS">🏦 Tabungan</option>
                      <option value="CHECKING">💳 Giro</option>
                      <option value="CREDIT">💰 Kartu Kredit</option>
                      <option value="CASH">💵 Tunai</option>
                      <option value="INVESTMENT">📈 Investasi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">Saldo Awal *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 sm:top-3 text-slate-700 font-medium text-sm">Rp</span>
                      <input
                        type="number"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                        className="w-full pl-12 pr-3 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900 text-sm"
                        placeholder="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">Mata Uang</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900 text-sm"
                    >
                      <option value="IDR">IDR - Rupiah Indonesia</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-2">Deskripsi</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none bg-white text-slate-900 text-sm"
                      rows={2}
                      placeholder="Deskripsi tambahan untuk akun ini"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                    >
                      {loading ? 'Menyimpan...' : (editingAccount ? 'Update' : 'Simpan')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingAccount(null);
                      }}
                      className="flex-1 bg-slate-500 text-white py-3 px-4 rounded-xl hover:bg-slate-600 transition-all duration-200 font-medium text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Enhanced Controls */}
          <div className="mb-6 p-4 bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* View and Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="name">Urutkan: Nama</option>
                  <option value="balance">Urutkan: Saldo</option>
                  <option value="type">Urutkan: Jenis</option>
                  <option value="created">Urutkan: Terbaru</option>
                </select>

                {/* Filter Type */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Semua Jenis</option>
                  <option value="SAVINGS">Tabungan</option>
                  <option value="CHECKING">Giro</option>
                  <option value="CREDIT">Kredit</option>
                  <option value="CASH">Tunai</option>
                  <option value="INVESTMENT">Investasi</option>
                </select>
              </div>

              {/* Bulk Operations */}
              <div className="flex items-center gap-3">
                {selectedAccounts.length > 0 && (
                  <>
                    <span className="text-sm text-slate-600 font-medium">
                      {selectedAccounts.length} akun dipilih
                    </span>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium"
                    >
                      Hapus Terpilih
                    </button>
                  </>
                )}
                
                <button
                  onClick={selectAllAccounts}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 text-sm font-medium"
                >
                  {selectedAccounts.length === accounts.length ? 'Batalkan Pilih' : 'Pilih Semua'}
                </button>
              </div>
            </div>
          </div>

          {/* Account Summary Cards */}
          {accountSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                  {accountSummary.totalAccounts}
                </h3>
                <p className="text-slate-600 text-sm font-medium">Total Akun</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                  {formatCurrency(accountSummary.totalBalance)}
                </h3>
                <p className="text-slate-600 text-sm font-medium">Total Saldo</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {Object.keys(accountSummary.byType).length}
                </h3>
                <p className="text-slate-600 text-sm font-medium">Jenis Akun</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {Object.keys(accountSummary.byCurrency).length}
                </h3>
                <p className="text-slate-600 text-sm font-medium">Mata Uang</p>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Daftar Akun
              </h2>
            </div>
            
            {loading && (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-slate-600">Memuat data...</p>
              </div>
            )}
            
            {!loading && accounts.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Belum ada akun</h3>
                <p className="text-slate-500">Klik "Tambah Akun" untuk menambahkan rekening atau sumber dana.</p>
              </div>
            )}

            {!loading && accounts.length > 0 && (
              <div className="divide-y divide-slate-100">
                {getSortedAndFilteredAccounts().map((account) => (
                  <div key={account.id} className="p-6 hover:bg-blue-50/50 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {/* Checkbox for bulk selection */}
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={(e) => toggleAccountSelection(account.id)}
                          className="mr-4 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl">{getAccountTypeIcon(account.type)}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-slate-900">
                              {account.name}
                            </div>
                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                {getAccountTypeName(account.type)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                {account.currency}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 01-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 01-2 2z" />
                              </svg>
                              Dibuat: {new Date(account.createdAt).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-lg text-slate-900">
                          {formatCurrency(account.balance)}
                        </div>
                        <div className="flex space-x-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleEdit(account)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {account.description && (
                      <div className="mt-4 ml-16 p-3 bg-slate-50 rounded-lg border-l-4 border-blue-200">
                        <p className="text-sm text-slate-600 italic">"{account.description}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Transfer Antar Akun</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dari Akun</label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Pilih akun asal</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ke Akun</label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Pilih akun tujuan</option>
                  {accounts
                    .filter((account) => account.id !== transferData.fromAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance)}
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah</label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
                <input
                  type="text"
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Deskripsi transfer (opsional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={transferData.date}
                  onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-200 font-medium"
                >
                  {loading ? 'Memproses...' : 'Transfer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 bg-slate-500 text-white py-3 px-4 rounded-lg hover:bg-slate-600 transition-all duration-200 font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && accountSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Statistik Akun</h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Total Akun</h3>
                  <p className="text-2xl font-bold text-blue-900">{accountSummary?.totalAccounts}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Total Saldo</h3>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(accountSummary?.totalBalance || 0)}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Berdasarkan Jenis</h3>
                <div className="space-y-3">
                  {Object.entries(accountSummary?.byType || {}).map(([type, data]) => (
                    <div key={type} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{getAccountTypeName(type)}</span>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(data.balance)}</div>
                        <div className="text-sm text-slate-500">{data.count} akun</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Berdasarkan Mata Uang</h3>
                <div className="space-y-3">
                  {Object.entries(accountSummary?.byCurrency || {}).map(([currency, data]) => (
                    <div key={currency} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{currency}</span>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(data.balance)}</div>
                        <div className="text-sm text-slate-500">{data.count} akun</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Hapus Akun Terpilih</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-600 mb-4">
                Anda akan menghapus {selectedAccounts.length} akun. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Peringatan:</span>
                </div>
                <p className="text-red-700 mt-1 text-sm">
                  Semua transaksi yang terkait dengan akun-akun ini juga akan dihapus.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 bg-slate-500 text-white py-3 px-4 rounded-lg hover:bg-slate-600 transition-all duration-200 font-medium"
              >
                Batal
              </button>
            </div>
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAccountToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Akun"
        message="Apakah Anda yakin ingin menghapus akun ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua transaksi terkait."
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />
    </>
  );
}
