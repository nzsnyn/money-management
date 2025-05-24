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

  useEffect(() => {
    if (status === 'authenticated') {
      loadAccounts();
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

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'SAVINGS': return '🏦';
      case 'CHECKING': return '💳';
      case 'CREDIT': return '💰';
      case 'CASH': return '💵';
      case 'INVESTMENT': return '📈';
      default: return '🏦';
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'SAVINGS': return 'Tabungan';
      case 'CHECKING': return 'Giro';
      case 'CREDIT': return 'Kartu Kredit';
      case 'CASH': return 'Tunai';
      case 'INVESTMENT': return 'Investasi';
      default: return 'Lainnya';
    }
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
                {accounts.map((account) => (
                  <div key={account.id} className="p-6 hover:bg-blue-50/50 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
