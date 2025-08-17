'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, Eye, LogOut, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { MenuItem } from '@/types';
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
    menuItem: MenuItem;
  })[];
};

export default function HistoryPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  // Default ke bulan berjalan
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [viewAll, setViewAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [printData, setPrintData] = useState<Order | null>(null);
  const [receiptText, setReceiptText] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [cashierName, setCashierName] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ================= Helpers =================
  const monthToRange = (ym: string) => {
    const [yStr, mStr] = ym.split('-');
    const y = Number(yStr), m = Number(mStr);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1); // eksklusif
    return { start, end };
  };

  const monthLabel = (date: Date) => {
    return `${date.toLocaleString('id-ID', { month: 'long' }).toUpperCase()} ${date.getFullYear()}`;
  };

  const selectedMonthLabel = (ym: string) => {
    const [yStr, mStr] = ym.split('-');
    const d = new Date(Number(yStr), Number(mStr) - 1, 1);
    return `${d.toLocaleString('id-ID', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
  };

  // ================= Data =================
  const fetchOrders = async () => {
    let query = supabase
      .from('Order')
      .select(`*, orderItems:OrderItem(*, menuItem:MenuItem(*, category:Category(*)))`)
      .in('status', ['SUCCESS', 'FAILED']);

    if (!viewAll) {
      const { start, end } = monthToRange(selectedMonth);
      query = query.gte('createdAt', start.toISOString()).lt('createdAt', end.toISOString());
    }

    const { data, error } = await query.order('createdAt', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, viewAll]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  // ================= Print =================
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

  // ================= Delete All (by month) =================
  // buka modal (blokir jika View All aktif)
  const openConfirmDelete = () => {
    if (viewAll) {
      alert('Matikan "VIEW ALL" dulu untuk menghapus per-bulan.');
      return;
    }
    setConfirmOpen(true);
  };

  const deleteAllInMonth = async () => {
    setIsDeleting(true);
    try {
      const monthToRange = (ym: string) => {
        const [yStr, mStr] = ym.split('-');
        const y = Number(yStr), m = Number(mStr);
        return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }; // end eksklusif
      };
      const selectedMonthLabel = (ym: string) => {
        const [yStr, mStr] = ym.split('-');
        const d = new Date(Number(yStr), Number(mStr) - 1, 1);
        return `${d.toLocaleString('id-ID', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
      };

      const { start, end } = monthToRange(selectedMonth);

      // 1) ambil id order yang akan dihapus
      const { data: orderIdsData, error: idsErr } = await supabase
        .from('Order')
        .select('id')
        .in('status', ['SUCCESS', 'FAILED'])
        .gte('createdAt', start.toISOString())
        .lt('createdAt', end.toISOString());

      if (idsErr) throw idsErr;

      const orderIds = (orderIdsData || []).map(r => r.id as string);
      if (!orderIds.length) {
        alert(`Tidak ada order pada bulan ${selectedMonthLabel(selectedMonth)}.`);
        return;
      }

      // 2) hapus item dulu (jika belum cascade)
      await supabase.from('OrderItem').delete().in('orderId', orderIds);

      // 3) hapus order
      const { error: delOrderErr } = await supabase.from('Order').delete().in('id', orderIds);
      if (delOrderErr) throw delOrderErr;

      alert(`Berhasil menghapus ${orderIds.length} order.`);
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menghapus: ${e?.message || e}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ================= Export =================
  const handleExportToExcel = async () => {
    if (!orders.length) {
      alert("Tidak ada data order untuk diekspor.");
      return;
    }

    const { start, end } = monthToRange(selectedMonth);

    const groupedData: Record<string, Record<string, { quantity: number; price: number }>> = {};

    orders.forEach(order => {
      if (order.status !== 'SUCCESS') return;

      order.orderItems.forEach(item => {
        const category = item.menuItem.category.name;
        const menuName = item.menuItem.name;
        const price = item.menuItem.price;

        if (!groupedData[category]) groupedData[category] = {};
        if (!groupedData[category][menuName]) {
          groupedData[category][menuName] = { quantity: 0, price };
        }

        groupedData[category][menuName].quantity += item.quantity;
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penjualan');

    const title = `Laporan Penjualan ${start.toLocaleDateString('id-ID')} s/d ${new Date(end.getTime() - 1).toLocaleDateString('id-ID')}`;
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 24;

    worksheet.addRow([]);

    worksheet.columns = [
      { key: 'no', width: 5 },
      { key: 'menu', width: 30 },
      { key: 'jumlah', width: 15 },
      { key: 'harga', width: 20 },
      { key: 'total', width: 25 },
    ];

    const headerRow = worksheet.addRow(['NO', 'MENU', 'JUMLAH LAKU', 'HARGA JUAL', 'TOTAL PENDAPATAN']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let count = 1;
    let grandTotal = 0;

    for (const [category, menus] of Object.entries(groupedData)) {
      const catRow = worksheet.addRow(['', category]);
      const rowIndex = catRow.number;
      worksheet.mergeCells(`B${rowIndex}:E${rowIndex}`);
      catRow.font = { bold: true };
      catRow.alignment = { horizontal: 'left' };
      for (let i = 2; i <= 5; i++) {
        catRow.getCell(i).border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: i === 2 ? { style: 'thin' } : undefined,
          right: i === 5 ? { style: 'thin' } : undefined,
        };
      }

      for (const [menuName, data] of Object.entries(menus)) {
        const total = data.quantity * data.price;
        grandTotal += total;

        const row = worksheet.addRow([
          count++,
          menuName,
          data.quantity,
          `Rp. ${data.price.toLocaleString('id-ID')}`,
          `Rp. ${total.toLocaleString('id-ID')}`,
        ]);

        row.alignment = { vertical: 'middle', horizontal: 'left' };
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    }

    worksheet.addRow([]);

    const totalRow = worksheet.addRow(['', '', '', 'TOTAL PENDAPATAN:', `Rp. ${grandTotal.toLocaleString('id-ID')}`]);
    totalRow.font = { bold: true };
    totalRow.alignment = { horizontal: 'right' };
    totalRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const nice = selectedMonthLabel(selectedMonth).replace(/\s+/g, '_');
    saveAs(blob, `Laporan_Penjualan_${nice}.xlsx`);
  };

  // ================= Render =================
  if (loading) return null;

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} className="hidden md:block" />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a href="/dasboardadmin/order" className="hover:border-b-4 hover:border-blue-900 pb-1">ORDER</a>
          <a className="border-b-4 border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-center">
        {/* PILIH BULAN/TAHUN */}
        <div className="flex items-center gap-2">
          <label className="text-blue-900 font-semibold text-sm">Bulan</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setViewAll(false); }}
            className="p-2 border border-blue-900 text-black rounded"
          />
        </div>

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

        {/* HAPUS SEMUA BULAN INI */}
        <button
          onClick={openConfirmDelete}
          disabled={isDeleting || viewAll}
          className={`flex items-center gap-2 px-4 py-1 rounded text-white transition
    ${viewAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          title={viewAll ? 'Matikan VIEW ALL untuk hapus per-bulan' : 'Hapus semua order pada bulan terpilih'}
        >
          <Trash2 size={16} /> {isDeleting ? 'MENGHAPUS…' : `HAPUS SEMUA (${selectedMonthLabel(selectedMonth)})`}
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
                <td>Rp.{order.totalPrice.toLocaleString('id-ID')}</td>
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
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            // klik backdrop untuk tutup
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <AlertTriangle className="text-red-600" />
              <h3 className="font-semibold text-blue-900">Konfirmasi Hapus</h3>
            </div>

            <div className="px-5 py-4 text-sm text-black">
              Hapus <b>SEMUA</b> order bulan <b>{selectedMonth
                ? new Date(selectedMonth + '-01').toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()
                : ''}</b>?<br />
              <span className="text-red-600 font-medium">Tindakan ini tidak bisa dibatalkan.</span>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  // tutup modal lalu eksekusi hapus
                  setConfirmOpen(false);
                  await deleteAllInMonth();
                }}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}