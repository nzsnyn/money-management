'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ConfirmModal from '../../components/confirm-modal';
import Navbar from '../../components/navbar';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    icon: '',
    color: '#3B82F6',
  });

  // Filter state
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  useEffect(() => {
    if (status === 'authenticated') {
      loadCategories();
    }
  }, [status]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
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
      
      setMessage(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      setShowForm(false);
      setEditingCategory(null);
      resetForm();
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    if (category.isDefault) {
      setError('Default categories cannot be edited');
      return;
    }
    
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon || '',
      color: category.color || '#3B82F6',
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    
    if (category?.isDefault) {
      setError('Default categories cannot be deleted');
      return;
    }

    setCategoryToDelete(categoryId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/categories/${categoryToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      setMessage('Category deleted successfully');
      await loadCategories();
      setCategoryToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'EXPENSE',
      icon: '',
      color: '#3B82F6',
    });
  };

  const getFilteredCategories = () => {
    if (typeFilter === 'ALL') return categories;
    return categories.filter(cat => cat.type === typeFilter);
  };

  const getCategoryIcon = (category: Category) => {
    if (category.icon) return category.icon;
    return category.type === 'INCOME' ? '💰' : '💸';
  };

  const getCategoryTypeText = (type: 'INCOME' | 'EXPENSE') => {
    return type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
  };

  const getTypeBadgeColor = (type: 'INCOME' | 'EXPENSE') => {
    return type === 'INCOME' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
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
          <p className="text-slate-700 mb-6">Silakan masuk untuk melihat halaman kategori</p>
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
        title="Kelola Kategori" 
        subtitle="Atur kategori pemasukan dan pengeluaran"
        showBackButton={true}
        backHref="/dashboard"
      >
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCategory(null);
            resetForm();
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kategori
          </span>
        </button>
      </Navbar>

      <div className="min-h-screen bg-slate-50">
        <div className="p-6 max-w-6xl mx-auto">

        {/* Category Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg mx-auto my-4 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {editingCategory ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="text-slate-500 hover:text-slate-700 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Nama Kategori *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900"
                    placeholder="Contoh: Makanan, Gaji, Transport"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Jenis Kategori *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE' })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900"
                    required
                  >
                    <option value="EXPENSE">💸 Pengeluaran</option>
                    <option value="INCOME">💰 Pemasukan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900"
                    placeholder="🍔 (opsional)"
                    maxLength={4}
                  />
                  <p className="text-xs text-slate-500 mt-1">Gunakan emoji untuk mempermudah identifikasi kategori</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Warna</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-12 border border-slate-300 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {loading ? 'Menyimpan...' : (editingCategory ? 'Update' : 'Simpan')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 bg-slate-500 text-white py-3 px-4 rounded-xl hover:bg-slate-600 transition-all duration-200 font-medium"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  typeFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL' ? '📋 Semua' : filter === 'INCOME' ? '💰 Pemasukan' : '💸 Pengeluaran'}
              </button>
            ))}
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Daftar Kategori
            </h2>
          </div>
          
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-slate-600">Memuat data...</p>
            </div>
          )}
          
          {!loading && getFilteredCategories().length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">Belum ada kategori</h3>
              <p className="text-slate-500">Klik "Tambah Kategori" untuk membuat kategori baru.</p>
            </div>
          )}

          {!loading && getFilteredCategories().length > 0 && (
            <div className="divide-y divide-slate-100">
              {getFilteredCategories().map((category) => (
                <div key={category.id} className="p-6 hover:bg-blue-50/50 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: category.color || '#3B82F6' }}
                        >
                          <span className="text-white text-xl">{getCategoryIcon(category)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 group-hover:text-slate-900 flex items-center gap-2">
                            {category.name}
                            {category.isDefault && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getTypeBadgeColor(category.type)}`}>
                              {getCategoryTypeText(category.type)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Dibuat: {new Date(category.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`flex space-x-3 mt-3 transition-opacity duration-200 ${category.isDefault ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          onClick={() => handleEdit(category)}
                          disabled={category.isDefault}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={category.isDefault}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            setCategoryToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Hapus Kategori"
          message="Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua transaksi terkait."
          confirmText="Ya, Hapus"
          cancelText="Batal"
        />
        </div>
      </div>
    </>
  );
}
