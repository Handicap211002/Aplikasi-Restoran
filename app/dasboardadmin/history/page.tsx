'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, Eye } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Order = {
  id: number;
  customerName: string;
  roomNumber: string;
  orderType: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  createdAt: string;
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-07'); // default: Juli 2025
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const start = new Date(`${selectedMonth}-01`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const { data, error } = await supabase
      .from('Order')
      .select('*')
      .in('status', ['SUCCESS', 'FAILED'])
      .gte('createdAt', start.toISOString())
      .lt('createdAt', end.toISOString())
      .order('createdAt', { ascending: false });

    if (data) setOrders(data);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/kasirlogin');
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedMonth]);

  const monthLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleString('default', { month: 'long' }).toUpperCase()} ${date.getFullYear()}`;
  };

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <div className="flex items-center">
          <Image src="/logo.png" alt="logo" width={90} height={50} />
        </div>
        <div className="flex gap-8 text-blue-900 font-bold text-xl">
          <a href="/dasboardadmin/order" className="hover:border-b-4 hover:border-blue-900 pb-1">ORDER</a>
          <a className="border-b-4 border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      <div className="flex gap-3 mb-4 items-center">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 border border-blue-900 text-black rounded"
        >
          <option value="2025-07">JULI 2025</option>
          <option value="2025-06">JUNI 2025</option>
          <option value="2025-05">MEI 2025</option>
          {/* Tambah lagi jika perlu */}
        </select>

        <button className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition">
          <Eye size={16} /> VIEW ALL ORDER
        </button>

        <button className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition">
          <Printer size={16} /> PRINT ALL ORDER
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
        <table className="min-w-full table-auto text-center text-blue-900 border border-blue-200">
          <thead className="bg-blue-100 text-sm">
            <tr>
              <th className="px-2 py-2">DATE</th>
              <th className="px-2 py-2">ORDER ID</th>
              <th className="px-2 py-2">CUSTOMER</th>
              <th className="px-2 py-2">ROOM</th>
              <th className="px-2 py-2">ORDER TYPE</th>
              <th className="px-2 py-2">TOTAL</th>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">PAYMENT</th>
              <th className="px-2 py-2">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t border-blue-200">
                <td className="py-2">{monthLabel(order.createdAt)}</td>
                <td>{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.roomNumber}</td>
                <td>{order.orderType}</td>
                <td>Rp.{order.totalPrice.toLocaleString()}</td>
                <td>{order.status}</td>
                <td>{order.paymentMethod}</td>
                <td className="space-x-2">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center">
                    <Printer size={14} className="mr-1" /> PRINT
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={9} className="text-center py-6">No history this month</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
