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
  Order as PrismaOrder,
} from '@prisma/client';

type Order = PrismaOrder & {
  orderItems: (OrderItem & { menuItem: MenuItem })[];
};

export default function HistoryPage() {
  const router = useRouter();

  // ================= State =================
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [viewAll, setViewAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print/preview
  const [printData, setPrintData] = useState<Order | null>(null); // null = print all visible
  const [receiptText, setReceiptText] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // ✅ Default DAPUR (80mm). Ubah ke 'resto' kalau mau default Restoran (58mm).
  const [printMode, setPrintMode] = useState<'resto' | 'dapur'>('dapur');

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

  const monthLabel = (date: Date) =>
    `${date.toLocaleString('id-ID', { month: 'long' }).toUpperCase()} ${date.getFullYear()}`;

  const selectedMonthLabel = (ym: string) => {
    const [yStr, mStr] = ym.split('-');
    const d = new Date(Number(yStr), Number(mStr) - 1, 1);
    return `${d.toLocaleString('id-ID', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
  };
  // Tambahkan helper ini di atas (bareng helpers lain)
  function getVisibleExportRange(orders: Order[], viewAll: boolean, selectedMonth: string) {
    if (!orders.length) return null;

    if (!viewAll) {
      // Single month (pakai month picker)
      const { start, end } = monthToRange(selectedMonth);
      // end eksklusif -> tampilkan di header sebagai hari terakhir bulan tsb
      return { start, end: new Date(end.getTime() - 1) };
    }

    // VIEW ALL: ambil min/max createdAt dari semua orders yang sedang ditampilkan
    const times = orders.map(o => o.createdAt.getTime());
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));

    // Mulai dari tanggal 1 bulan terawal
    const start = new Date(min.getFullYear(), min.getMonth(), 1);
    // Sampai tanggal terakhir bulan terahir
    const end = new Date(max.getFullYear(), max.getMonth() + 1, 0); // day 0 = last day prev month
    return { start, end };
  }

  function buildNiceLabelForFile(start: Date, end: Date) {
    const m = (d: Date) => d.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
    const y = (d: Date) => d.getFullYear();
    const sameMonth = start.getMonth() === end.getMonth() && y(start) === y(end);
    const sameYear = y(start) === y(end);

    if (sameMonth) {
      return `${m(start)}_${y(start)}`; // contoh: AGUSTUS_2025
    }
    if (sameYear) {
      return `${m(start)}-${m(end)}_${y(end)}`; // contoh: JULI-AGUSTUS_2025
    }
    return `${m(start)}_${y(start)}-${m(end)}_${y(end)}`; // contoh: DESEMBER_2024-AGUSTUS_2025
  }

  // Opsi generator berdasarkan mode
  function genOptsFor(mode: 'resto' | 'dapur', forEscpos: boolean) {
    return mode === 'resto'
      ? { paper: '58mm' as const, font: 'B' as const, escpos: forEscpos, compact: true, scale: { w: 1, h: 2 }, variant: 'resto' as const }
      : { paper: '80mm' as const, font: 'A' as const, escpos: forEscpos, compact: false, variant: 'dapur' as const };
  }

  // Opsi berdasarkan state printMode saat ini
  function genOpts(forEscpos: boolean) {
    return genOptsFor(printMode, forEscpos);
  }

  // (Re)generate preview text berdasar mode + target (single/all)
  function regenPreviewText(mode: 'resto' | 'dapur', target: Order | null) {
    setPrintMode(mode); // update UI
    const opts = genOptsFor(mode, false); // gunakan mode yang diklik (tanpa menunggu state)
    if (target) {
      setReceiptText(generateKikiRestaurantReceipt(target, cashierName, opts));
    } else {
      const txt = orders
        .map((o) => generateKikiRestaurantReceipt(o, cashierName, opts))
        .join('\n\n\n');
      setReceiptText(txt);
    }
  }

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
      const typed: Order[] = data.map((order: any) => ({
        ...order,
        createdAt: new Date(order.createdAt),
        status: order.status as OrderStatus,
        orderType: order.orderType as OrderMode,
        paymentMethod: order.paymentMethod as PaymentMethod,
        orderItems: order.orderItems || [],
        totalOrder:
          order.orderItems?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ||
          0,
      }));
      setOrders(typed);
    }
  };

  // Ambil user & set cashierName
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) {
        router.push('/kasirlogin');
        return;
      }
      const md = (u.user_metadata ?? {}) as Record<string, any>;
      const idMeta = (u.identities ?? [])
        .map((i: any) => i?.identity_data ?? {})
        .reduce((a: any, b: any) => ({ ...a, ...b }), {});
      const name =
        md.full_name ??
        md.display_name ??
        md.displayName ??
        md.name ??
        idMeta.full_name ??
        idMeta.name ??
        (u.email ? u.email.split('@')[0] : 'Kasir');
      setCashierName(String(name).trim() || 'Kasir');
      setLoading(false);
    })();
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
  function openPreview(order: Order, mode: 'resto' | 'dapur' = 'dapur') {
    setPrintData(order);
    regenPreviewText(mode, order);
    setShowPrintPreview(true);
  }

  const handleConfirmPrint = () => {
    if (!receiptText) return; // diam saja, tanpa notif
    setIsPrinting(true);
    try {
      const payload = printData
        ? generateKikiRestaurantReceipt(printData, cashierName, genOpts(true))
        : orders.map((o) => generateKikiRestaurantReceipt(o, cashierName, genOpts(true))).join('\n\n\n');
      const encoded = encodeURIComponent(payload);
      window.location.href = `rawbt:${encoded}`;
      setShowPrintPreview(false);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintAll = () => {
    setPrintData(null); // menandakan "all"
    regenPreviewText(printMode, null);
    setShowPrintPreview(true);
  };

  const handleViewAll = () => setViewAll(true);

  // ================= Delete All (by month) =================
  const openConfirmDelete = () => {
    if (viewAll) return; // diam saja, tombol juga sudah disabled
    setConfirmOpen(true);
  };

  const deleteAllInMonth = async () => {
    setIsDeleting(true);
    try {
      const { start, end } = monthToRange(selectedMonth);

      const { data: orderIdsData, error: idsErr } = await supabase
        .from('Order')
        .select('id')
        .in('status', ['SUCCESS', 'FAILED'])
        .gte('createdAt', start.toISOString())
        .lt('createdAt', end.toISOString());
      if (idsErr) throw idsErr;

      const orderIds = (orderIdsData || []).map((r) => r.id as string);
      if (!orderIds.length) return; // tidak ada data, diam saja

      await supabase.from('OrderItem').delete().in('orderId', orderIds);
      const { error: delOrderErr } = await supabase.from('Order').delete().in('id', orderIds);
      if (delOrderErr) throw delOrderErr;

      await fetchOrders(); // refresh tabel tanpa notif
    } catch (e) {
      console.error(e); // log di console saja
    } finally {
      setIsDeleting(false);
    }
  };

  // ================= Export =================
  const handleExportToExcel = async () => {
    if (!orders.length) return; // diam saja bila tidak ada data

    // Ambil rentang sesuai tampilan saat ini (single month vs view all)
    const range = getVisibleExportRange(orders, viewAll, selectedMonth);
    if (!range) return;
    const { start, end } = range;

    // --- AGREGASI DATA ---
    const grouped: Record<string, Record<string, { quantity: number; price: number }>> = {};

    orders.forEach((order) => {
      if (order.status !== 'SUCCESS') return; // hanya sukses yang dihitung
      order.orderItems.forEach((item) => {
        const category = item.menuItem.category.name;
        const menuName = item.menuItem.name;
        const price = item.menuItem.price;
        if (!grouped[category]) grouped[category] = {};
        if (!grouped[category][menuName]) grouped[category][menuName] = { quantity: 0, price };
        grouped[category][menuName].quantity += item.quantity;
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penjualan');

    // Header judul pakai rentang tanggal terlihat (dd/mm/yyyy sesuai id-ID)
    const title = `Laporan Penjualan ${start.toLocaleDateString('id-ID')} s/d ${end.toLocaleDateString('id-ID')}`;
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
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let count = 1;
    let grandTotal = 0;

    for (const [category, menus] of Object.entries(grouped)) {
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
        row.eachCell((cell) => {
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
    totalRow.eachCell((cell) => {
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

    // Nama file juga ikut rentang (contoh: JULI-AGUSTUS_2025.xlsx)
    const nice = buildNiceLabelForFile(start, end).replace(/\s+/g, '_');
    saveAs(blob, `Laporan_Penjualan_${nice}.xlsx`);
  };

  // ================= Render =================
  if (loading) return null;

  // Lebar preview mengikuti jumlah kolom masing-masing kertas
  const previewCols = printMode === 'resto' ? 42 : 48; // 58mm Font B = 42, 80mm Font A = 48

  return (
    <div
      className="pt-24 min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} className="hidden md:block" />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a href="/dasboardadmin/order" className="hover:border-b-4 hover:border-blue-900 pb-1">
            ORDER
          </a>
          <a className="border-b-4 border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">
            MENU
          </a>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
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
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setViewAll(false);
            }}
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
            {orders.map((order) => (
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
                    onClick={() => openPreview(order, 'dapur' /* default dapur */)}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center"
                  >
                    <Printer size={14} className="mr-1" /> PRINT
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-6">
                  No history this month
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= Preview Modal ================= */}
      {showPrintPreview && receiptText && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-900">Preview Struk</h3>
                <div className="flex gap-2">
                  {/* Dapur (80mm) */}
                  <button
                    onClick={() => regenPreviewText('dapur', printData)}
                    className={`px-3 py-1 rounded border ${printMode === 'dapur' ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'
                      }`}
                  >
                    Dapur
                  </button>
                  {/* Restoran (58mm) */}
                  <button
                    onClick={() => regenPreviewText('resto', printData)}
                    className={`px-3 py-1 rounded border ${printMode === 'resto' ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'
                      }`}
                  >
                    Restoran
                  </button>
                </div>
              </div>

              {/* PREVIEW TEXT — lebar mengikuti jumlah kolom kertas */}
              <div className="font-mono text-[13px] text-black bg-gray-50 p-4 rounded mb-4 overflow-auto">
                <pre
                  className="mx-auto"
                  style={{
                    width: `${previewCols}ch`,
                    whiteSpace: 'pre',
                    lineHeight: 1.25,
                  }}
                >
                  {receiptText}
                </pre>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  <Printer size={16} className="mr-2 inline" /> Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Confirm Delete Modal ================= */}
      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <AlertTriangle className="text-red-600" />
              <h3 className="font-semibold text-blue-900">Konfirmasi Hapus</h3>
            </div>

            <div className="px-5 py-4 text-sm text-black">
              Hapus <b>SEMUA</b> order bulan{' '}
              <b>
                {selectedMonth
                  ? new Date(selectedMonth + '-01')
                    .toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                    .toUpperCase()
                  : ''}
              </b>
              ?<br />
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