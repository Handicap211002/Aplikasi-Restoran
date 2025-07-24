'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateKikiRestaurantReceipt } from '../../utils/receipt-generator';
export default function OrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [receiptText, setReceiptText] = useState('');
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

  const handlePrintPreview = async (orderId: number) => {
    try {
      const { data: orderData, error } = await supabase
        .from('Order')
        .select(`
        *,
        orderItems:OrderItem(*, menuItem:MenuItem(name, price))
      `)
        .eq('id', orderId)
        .single();

      if (error || !orderData) {
        console.error('Error fetching order:', error);
        alert('Gagal mengambil data order');
        return;
      }

      setPrintData(orderData);
      setReceiptText(generateKikiRestaurantReceipt(orderData));
      setShowPrintPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Gagal memuat preview struk');
    }
  };

const handleConfirmPrint = async () => {
  setIsPrinting(true);
  try {
    const response = await fetch('/api/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptText,
        target: 'both', // atau 'kitchen'/'restaurant'
      }),
    });

    if (!response.ok) {
      throw new Error(`Print failed with status ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Print command failed');
    }

    alert('Struk berhasil dikirim ke printer!');
    setShowPrintPreview(false);
  } catch (error) {
    console.error('Print error:', error);
    alert(`Gagal mencetak: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
  } finally {
    setIsPrinting(false);
  }
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
        event: 'INSERT',
        schema: 'public',
        table: 'Order',
        filter: 'isarchived=eq.false'
      }, () => fetchOrders())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Order',
        filter: 'isarchived=eq.true'
      }, () => fetchOrders())
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
                  <button
                    onClick={() => handlePrintPreview(order.id)}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center"
                  >
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
{showPrintPreview && printData && (
  <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
      <div className="p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4">Preview Struk</h3>

        {/* Preview Struk */}
        <div className="font-mono text-sm bg-gray-50 p-4 rounded mb-4">
          {receiptText.split('\n').map((line, i) => (
            <div key={i} className={line.includes('KIKI RESTAURANT') ? 'font-bold text-center' : ''}>
              {line.replace(/\x1B\[[0-9;]*[mGKH]/g, '')}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowPrintPreview(false)}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Batal
          </button>
          {/* Tombol cetak dengan loading state */}
          <button
            onClick={handleConfirmPrint}
            disabled={isPrinting}
            className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-flex items-center ${
              isPrinting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isPrinting ? (
              'Mencetak...'
            ) : (
              <>
                <Printer size={16} className="mr-2" /> Cetak Struk
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
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