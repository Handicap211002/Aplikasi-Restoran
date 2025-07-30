'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, Eye, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateKikiRestaurantReceipt } from '../../utils/receipt-generator';
import type {
  OrderStatus,
  OrderType as OrderMode,
  PaymentMethod,
  OrderItem,
  Order as PrismaOrder
} from '@prisma/client';

type Order = PrismaOrder & {
  orderItems: (OrderItem & {
    menuItem: {
      name: string;
      price: number;
    };
  })[];
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-07');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState<Order | null>(null);
  const [receiptText, setReceiptText] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [cashierName, setCashierName] = useState<string>('');


  const fetchOrders = async () => {
    let query = supabase
      .from('Order')
      .select(`*, orderItems:OrderItem(*, menuItem:MenuItem(name, price))`)
      .in('status', ['SUCCESS', 'FAILED']);

    if (!viewAll) {
      const start = new Date(`${selectedMonth}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      query = query.gte('createdAt', start.toISOString()).lt('createdAt', end.toISOString());
    }

    const { data, error } = await query.order('createdAt', { ascending: false });

    if (data) {
      const typedOrders: Order[] = data.map((order: any) => ({
        ...order,
        createdAt: new Date(order.createdAt),
        status: order.status as OrderStatus,
        orderType: order.orderType as OrderMode,
        paymentMethod: order.paymentMethod as PaymentMethod,
        orderItems: order.orderItems || [],
        totalOrder:
          order.orderItems?.reduce(
            (sum: number, item: { quantity: number }) => sum + item.quantity,
            0
          ) || 0
      }));
      setOrders(typedOrders);
    }
  };

  const handlePrintPreview = (order: Order) => {
    setPrintData(order);
    setReceiptText(generateKikiRestaurantReceipt(order, cashierName));
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    if (!receiptText) return alert('Tidak ada data untuk dicetak');
    const encoded = encodeURIComponent(receiptText);
    window.location.href = `rawbt:${encoded}`;
    setShowPrintPreview(false);
  };

  const handlePrintAll = () => {
    if (!orders.length) return alert('Tidak ada data order');
    const combinedText = orders.map(order => generateKikiRestaurantReceipt(order, cashierName)).join('\n\n\n');
    setReceiptText(combinedText);
    setShowPrintPreview(true);
  };

  const handleViewAll = () => {
    setViewAll(true);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/kasirlogin');
      } else {
        const user = data.session.user;
        const displayName = user.user_metadata?.displayName || user.email || 'Kasir';
        setCashierName(displayName);
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [selectedMonth, viewAll]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  const monthLabel = (date: Date) => {
    return `${date.toLocaleString('default', { month: 'long' }).toUpperCase()} ${date.getFullYear()}`;
  };
  const handleExportToExcel = async () => {
  if (!orders.length) {
    alert("Tidak ada data order untuk diekspor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Order History');

  // Header
  worksheet.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Order ID', key: 'id', width: 25 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Room', key: 'room', width: 10 },
    { header: 'Order Type', key: 'orderType', width: 15 },
    { header: 'Total (Rp)', key: 'totalPrice', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment', key: 'paymentMethod', width: 15 }
  ];

  // Isi data
  orders.forEach(order => {
    worksheet.addRow({
      tanggal: order.createdAt.toLocaleDateString(),
      id: order.id,
      customer: order.customerName,
      room: order.roomNumber,
      orderType: order.orderType.replace(/_/g, ' '),
      totalPrice: order.totalPrice,
      status: order.status,
      paymentMethod: order.paymentMethod,
    });
  });

  // Tambahkan total summary di bawah
  const totalRow = worksheet.addRow([]);
  totalRow.getCell(5).value = 'TOTAL';
  totalRow.getCell(6).value = {
    formula: `SUM(F2:F${orders.length + 1})`, // kolom totalPrice
    result: orders.reduce((sum, o) => sum + o.totalPrice, 0)
  };
  totalRow.font = { bold: true };

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Order_History_${selectedMonth}.xlsx`);
};


  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image
          src="/logo.png"
          alt="logo"
          width={90}
          height={50}
          className="hidden md:block"
        />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a href="/dasboardadmin/order" className="hover:border-b-4 hover:border-blue-900 pb-1">ORDER</a>
          <a className="border-b-4 border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      <div className="flex gap-3 mb-4 items-center">
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setViewAll(false);
          }}
          className="p-2 border border-blue-900 text-black rounded"
        >
          <option value="2025-07">JULI 2025</option>
          <option value="2025-06">JUNI 2025</option>
          <option value="2025-05">MEI 2025</option>
        </select>

        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          <Eye size={16} /> VIEW ALL ORDER
        </button>

        <button
          onClick={handlePrintAll}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          <Printer size={16} /> PRINT ALL ORDER
        </button>
        <button
          onClick={handleExportToExcel}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          EXPORT TO EXCEL
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
                <td>{order.orderType.replace(/_/g, ' ')}</td>
                <td>Rp.{order.totalPrice.toLocaleString()}</td>
                <td>{order.status}</td>
                <td>{order.paymentMethod}</td>
                <td className="space-x-2">
                  <button
                    onClick={() => handlePrintPreview(order)}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center"
                  >
                    <Printer size={14} className="mr-1" /> PRINT
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-6">No history this month</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPrintPreview && receiptText && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Preview Struk</h3>
              <div className="font-mono text-sm text-black bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
                {receiptText.split('\n').map((line, i) => (
                  <div key={i}>{line.replace(/\x1B\[[0-9;]*[mGKH]/g, '')}</div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-black"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmPrint}
                  disabled={isPrinting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  <Printer size={16} className="mr-2 inline" /> Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
