'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function OrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/kasirlogin');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isoStart = today.toISOString();
      const isoEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('Order')
        .select('*')
        .gte('createdAt', isoStart)
        .lt('createdAt', isoEnd)
        .eq('isarchived', false)
        .order('createdAt', { ascending: false });

      if (error) {
        setError('Gagal memuat data order.');
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Terjadi kesalahan saat memuat order.');
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    try {
      const { error: itemError } = await supabase
        .from('OrderItem')
        .delete()
        .eq('orderId', orderId);

      if (itemError) {
        console.error('Gagal hapus OrderItem:', itemError.message);
        return;
      }

      const { error: orderError } = await supabase
        .from('Order')
        .update({ isarchived: true })
        .eq('id', orderId);

      if (orderError) {
        console.error('Gagal hapus Order:', orderError.message);
      } else {
        console.log('Order berhasil dihapus');
        fetchOrders();
      }
    } catch (err) {
      console.error('Terjadi error:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/kasirlogin');
      } else {
        await fetchOrders();
        setLoading(false);
      }
    };
    checkSessionAndFetch();
  }, []);

  useEffect(() => {
    if (!loading) {
      const channel = supabase
        .channel('order-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Order',
        }, () => {
          fetchOrders();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loading]);

  if (loading) return <p className="text-center mt-10 text-blue-900">Memuat...</p>;

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} />
        <div className="flex gap-8 text-blue-900 font-bold text-xl">
          <a className="border-b-4 border-blue-900 pb-1">ORDER</a>
          <a href="/dasboardadmin/history" className="hover:border-b-4 hover:border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      <div className="overflow-x-auto bg-white rounded-xl shadow-md mt-4">
        <table className="min-w-full table-auto text-center text-blue-900">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-2 py-2">ORDER ID</th>
              <th className="px-2 py-2">CUSTOMER</th>
              <th className="px-2 py-2">ROOM</th>
              <th className="px-2 py-2">ORDER TYPE</th>
              <th className="px-2 py-2">TOTAL</th>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">PAYMENT</th>
              <th className="px-6 py-2">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                <td className="py-2">{order.id}</td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2">{order.roomNumber}</td>
                <td className="py-2">{order.orderType}</td>
                <td className="py-2">Rp.{order.totalPrice?.toLocaleString() ?? 0}</td>
                <td className="py-2">{order.status}</td>
                <td className="py-2">{order.paymentMethod}</td>
                <td className="py-2 space-x-2">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center">
                    <Printer size={16} className="mr-1" /> PRINT
                  </button>
                  <button
                    onClick={() => {
                      setOrderToDelete(order.id);
                      setShowConfirm(true);
                    }}
                    className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded inline-flex items-center"
                  >
                    <Trash2 size={16} className="mr-1" /> DELETE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="text-center text-red-600 py-4">{error}</p>}
        {orders.length === 0 && !error && (
          <p className="text-center text-blue-800 py-6">Belum ada order.</p>
        )}
      </div>

      {/* Modal Konfirmasi */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.1)] flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4">
            <p className="text-lg font-medium">Yakin ingin menghapus order ini?</p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                onClick={() => {
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
              >
                Tidak
              </button>
              <button
                className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (orderToDelete !== null) {
                    handleDeleteOrder(orderToDelete);
                  }
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
