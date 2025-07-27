'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [userIdToUpdate, setUserIdToUpdate] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError || !data.session) throw new Error('Email atau password salah');

      const user = data.user;

      // Cek apakah sudah punya nama kasir
      if (!user.user_metadata?.full_name) {
        setUserIdToUpdate(user.id);
        setShowNameModal(true); // tampilkan modal input nama
      } else {
        router.push('/dasboardadmin/order');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newFullName.trim()) return;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: newFullName.trim() },
    });

    if (updateError) {
      alert('Gagal menyimpan nama kasir');
    } else {
      router.push('/dasboardadmin/order');
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm relative">
        {/* Tombol Back */}
        <button
          onClick={() => router.push('/menu')}
          className="absolute top-4 left-4 text-blue-900 hover:text-blue-700 flex items-center space-x-1"
        >
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </button>

        <div className="text-center mb-1">
          <img src="/logo.png" alt="Kiki Beach Logo" className="mx-auto w-72" />
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-blue-900 text-blue-900 placeholder-blue-900 rounded"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-blue-900 text-blue-900 placeholder-blue-900 rounded"
            required
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-blue-900 text-blue-900 py-2 rounded hover:bg-blue-900 hover:text-white transition duration-200"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>

      {/* Modal input nama kasir */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4 text-blue-900">Masukkan Nama Kasir</h2>
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="Contoh: Kasir Ayu"
              className="w-full mb-4 p-2 border border-blue-900 text-blue-900 rounded"
            />
            <button
              onClick={handleSaveName}
              className="w-full bg-blue-900 text-white py-2 rounded hover:bg-blue-800 transition duration-200"
            >
              Simpan & Masuk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
