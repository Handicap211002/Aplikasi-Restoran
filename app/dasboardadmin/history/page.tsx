'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, Printer, Eye, LogOut, AlertTriangle, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { MenuItem } from '@/types';
import { generateKikiRestaurantReceipt } from '../../utils/receipt-generator';

// Popup notif reusable
import NewOrderPopup from '../../../components/NewOrderPopup';
import { useNewOrderNotify } from '../../../hooks/useNewOrderNotify';

// ================== KONFIG TOKEN ADMIN ==================
const ADMIN_TOKEN = 'KIKI-ADMIN-123'; // TODO: ganti sesuai kebutuhan

// ================== TYPES ==================
type OrderRow = {
  id: number;
  createdAt: Date;
  customerName: string;
  roomNumber: string | null;
  orderType: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  isarchived?: boolean | null;
  orderItems: (any & { menuItem: MenuItem })[];
  totalOrder?: number;
};

// ================== STATUS NORMALIZER ==================
function normalizeStatus(v: any): 'SUCCESS' | 'SUCCESS_EDIT' | 'DELETED' | 'FAILED' | 'OTHER' {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'SUCCESS') return 'SUCCESS';
  if (s === 'SUCCESS_EDIT' || s === 'SUKSES_EDIT' || s === 'SUCCESS-EDIT' || s === 'SUKSESEDIT') return 'SUCCESS_EDIT';
  if (s === 'DELETED' || s === 'DELETE' || s === 'DELATE') return 'DELETED';
  if (s === 'FAILED') return 'FAILED';
  return 'OTHER';
}

// ================== HELPERS WAKTU ==================
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

function getVisibleExportRange(orders: OrderRow[], viewAll: boolean, selectedMonth: string) {
  if (!orders.length) return null;
  if (!viewAll) {
    const { start, end } = monthToRange(selectedMonth);
    return { start, end: new Date(end.getTime() - 1) };
  }
  const times = orders.map(o => o.createdAt.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  const start = new Date(min.getFullYear(), min.getMonth(), 1);
  const end = new Date(max.getFullYear(), max.getMonth() + 1, 0);
  return { start, end };
}

function buildNiceLabelForFile(start: Date, end: Date) {
  const m = (d: Date) => d.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
  const y = (d: Date) => d.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth() && y(start) === y(end);
  const sameYear = y(start) === y(end);
  if (sameMonth) return `${m(start)}_${y(start)}`;
  if (sameYear) return `${m(start)}-${m(end)}_${y(end)}`;
  return `${m(start)}_${y(start)}-${m(end)}_${y(end)}`;
}

// ================== KOMPONEN ==================
export default function HistoryPage() {
  const router = useRouter();

  // ========== STATE ==========
  const [orders, setOrders] = useState<OrderRow[]>([]);
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
  const [printData, setPrintData] = useState<OrderRow | null>(null); // null = print all success
  const [receiptText, setReceiptText] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMode, setPrintMode] = useState<'resto' | 'dapur'>('dapur');
  const [cashierName, setCashierName] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Token modal untuk hard delete
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Notif hook
  const {
    show,
    current,
    muted,
    needEnable,
    close,
    replay,
    enableSound,
    toggleMute,
  } = useNewOrderNotify({
    channelName: 'history-realtime-popup',
    filter: 'isarchived=eq.false',
    rateLimitMs: 2000,
    soundSrc: '/bell.mp3',
  });

  // ========== DATA ==========
  const fetchOrders = async () => {
    let query = supabase
      .from('Order')
      .select(`
        id, createdAt, customerName, roomNumber, totalPrice, status, orderType, paymentMethod,
        isarchived,
        orderItems:OrderItem(*, menuItem:MenuItem(*, category:Category(*)))
      `)
      .eq('isarchived', true); // hanya arsip (history)

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
      const typed: OrderRow[] = (data as any[]).map((order) => ({
        ...order,
        createdAt: new Date(order.createdAt),
        orderItems: order.orderItems || [],
        totalOrder:
          (order.orderItems || []).reduce((sum: number, it: any) => sum + (it.quantity ?? 0), 0),
      }));
      // guard isarchived
      setOrders(typed.filter(o => o.isarchived === true));
    }
  };

  // Session & cashier
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

  useEffect(() => { fetchOrders(); /* eslint-disable-next-line */ }, [selectedMonth, viewAll]);

  // Realtime refresh saat arsip berubah
  useEffect(() => {
    if (loading) return;
    const ch = supabase
      .channel('history-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order' },
        () => fetchOrders()
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [loading]); // eslint-disable-line

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  // ========== SPLIT DATA ==========
  const successOrders = orders.filter(o => {
    const s = normalizeStatus(o.status);
    return s === 'SUCCESS' || s === 'SUCCESS_EDIT';
  });
  const deletedOrders = orders.filter(o => normalizeStatus(o.status) === 'DELETED');

  // ========== PRINT ==========
  function genOptsFor(mode: 'resto' | 'dapur', forEscpos: boolean) {
    return mode === 'resto'
      ? { paper: '58mm' as const, font: 'B' as const, escpos: forEscpos, compact: true, scale: { w: 1, h: 2 }, variant: 'resto' as const }
      : { paper: '80mm' as const, font: 'A' as const, escpos: forEscpos, compact: false, variant: 'dapur' as const };
  }
  function genOpts(forEscpos: boolean) { return genOptsFor(printMode, forEscpos); }

  function regenPreviewText(mode: 'resto' | 'dapur', target: OrderRow | null) {
    setPrintMode(mode);
    const opts = genOptsFor(mode, false);
    if (target) {
      setReceiptText(generateKikiRestaurantReceipt(target as any, cashierName, opts));
    } else {
      // Print ALL → hanya successOrders
      const txt = successOrders
        .map((o) => generateKikiRestaurantReceipt(o as any, cashierName, opts))
        .join('\n\n\n');
      setReceiptText(txt);
    }
  }

  function openPreview(order: OrderRow, mode: 'resto' | 'dapur' = 'dapur') {
    setPrintData(order);
    regenPreviewText(mode, order);
    setShowPrintPreview(true);
  }

  const handleConfirmPrint = () => {
    if (!receiptText) return;
    setIsPrinting(true);
    try {
      const payload = printData
        ? generateKikiRestaurantReceipt(printData as any, cashierName, genOpts(true))
        : successOrders.map((o) => generateKikiRestaurantReceipt(o as any, cashierName, genOpts(true))).join('\n\n\n');
      const encoded = encodeURIComponent(payload);
      window.location.href = `rawbt:${encoded}`;
      setShowPrintPreview(false);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintAll = () => {
    setPrintData(null);
    regenPreviewText(printMode, null);
    setShowPrintPreview(true);
  };

  // ========== DELETE ALL (bulan ini, hanya arsip) – opsional ==========
  const openConfirmDelete = () => {
    if (viewAll) return;
    setConfirmOpen(true);
  };
  const deleteAllInMonth = async () => {
    setIsDeleting(true);
    try {
      const { start, end } = monthToRange(selectedMonth);
      const { data: orderIdsData, error: idsErr } = await supabase
        .from('Order')
        .select('id, isarchived')
        .eq('isarchived', true)
        .gte('createdAt', start.toISOString())
        .lt('createdAt', end.toISOString());
      if (idsErr) throw idsErr;

      const orderIds = (orderIdsData || [])
        .filter((r: any) => r.isarchived === true)
        .map((r: any) => r.id as number);

      if (!orderIds.length) return;

      await supabase.from('OrderItem').delete().in('orderId', orderIds);
      const { error: delOrderErr } = await supabase.from('Order').delete().in('id', orderIds);
      if (delOrderErr) throw delOrderErr;

      await fetchOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== HARD DELETE (by row) dengan TOKEN ==========
  const requestHardDelete = (id: number) => {
    setPendingDeleteId(id);
    setTokenValue('');
    setTokenOpen(true);
  };

  const confirmHardDelete = async () => {
    if (tokenValue !== ADMIN_TOKEN) {
      alert('Token salah.');
      return;
    }
    if (pendingDeleteId == null) return;
    try {
      // hapus detail dulu
      await supabase.from('OrderItem').delete().eq('orderId', pendingDeleteId);
      // hapus header
      const { error } = await supabase.from('Order').delete().eq('id', pendingDeleteId);
      if (error) throw error;
      setTokenOpen(false);
      setPendingDeleteId(null);
      await fetchOrders();
    } catch (e) {
      console.error('[hardDelete] gagal:', e);
      alert('Gagal menghapus permanen.');
    }
  };

  // ========== EXPORT (hanya sukses & sukses edit) ==========
  const handleExportToExcel = async () => {
    if (!successOrders.length) return;

    const range = getVisibleExportRange(successOrders, viewAll, selectedMonth);
    if (!range) return;
    const { start, end } = range;

    const grouped: Record<string, Record<string, { quantity: number; price: number }>> = {};

    successOrders.forEach((order) => {
      order.orderItems.forEach((item: any) => {
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

    const nice = buildNiceLabelForFile(start, end).replace(/\s+/g, '_');
    saveAs(blob, `Laporan_Penjualan_${nice}.xlsx`);
  };

  if (loading) return null;

  const previewCols = printMode === 'resto' ? 42 : 48;

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* NAV */}
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

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-center">
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
          onClick={() => setViewAll(true)}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          <Eye size={16} /> VIEW ALL ORDER
        </button>

        {/* PRINT ALL (hanya success) */}
        <button
          onClick={handlePrintAll}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          <Printer size={16} /> PRINT ALL (SUKSES)
        </button>

        {/* EXPORT (hanya success) */}
        <button
          onClick={handleExportToExcel}
          className="flex items-center gap-1 border border-blue-900 text-black px-4 py-1 rounded hover:bg-blue-900 hover:text-white transition"
        >
          EXPORT TO EXCEL (SUKSES)
        </button>

        {/* HAPUS SEMUA (arsip) – opsional */}
        <button
          onClick={openConfirmDelete}
          disabled={isDeleting || viewAll}
          className={`flex items-center gap-2 px-4 py-1 rounded text-white transition
            ${viewAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
        >
          <Trash2 size={16} /> {isDeleting ? 'MENGHAPUS…' : `HAPUS SEMUA (${selectedMonthLabel(selectedMonth)})`}
        </button>
      </div>

      {/* ==================== TABEL SUKSES (+ EDIT) ==================== */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md mb-8">
        <div className="px-4 pt-4 text-left text-blue-900 font-bold">SUKSES & SUKSES EDIT</div>
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
            {successOrders.map((order) => (
              <tr key={order.id} className="border-t border-blue-200">
                <td className="py-2">{monthLabel(order.createdAt)}</td>
                <td>{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.roomNumber}</td>
                <td>{order.orderType.replace(/_/g, ' ')}</td>
                <td>Rp.{(order.totalPrice ?? 0).toLocaleString('id-ID')}</td>
                <td>{normalizeStatus(order.status)}</td>
                <td>{order.paymentMethod}</td>
                <td className="space-x-2">
                  <button
                    onClick={() => openPreview(order, 'dapur')}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded inline-flex items-center"
                  >
                    <Printer size={14} className="mr-1" /> PRINT
                  </button>
                  {/* Kalau mau boleh tambahkan hard delete juga di tabel ini:
                  <button onClick={() => requestHardDelete(order.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded inline-flex items-center">
                    <Trash2 size={14} className="mr-1" /> DELETE
                  </button> */}
                </td>
              </tr>
            ))}
            {successOrders.length === 0 && (
              <tr><td colSpan={9} className="text-center py-6">Tidak ada data sukses di rentang ini</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== TABEL DELETED ==================== */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
        <div className="px-4 pt-4 text-left text-red-700 font-bold">DELETED (Soft)</div>
        <table className="min-w-full table-auto text-center text-blue-900 border border-blue-200">
          <thead className="bg-red-100 text-sm">
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
            {deletedOrders.map((order) => (
              <tr key={order.id} className="border-t border-blue-200">
                <td className="py-2">{monthLabel(order.createdAt)}</td>
                <td>{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.roomNumber}</td>
                <td>{order.orderType.replace(/_/g, ' ')}</td>
                <td>Rp.{(order.totalPrice ?? 0).toLocaleString('id-ID')}</td>
                <td>{normalizeStatus(order.status)}</td>
                <td>{order.paymentMethod}</td>
                <td className="space-x-2">
                  {/* Tidak ada PRINT untuk deleted */}
                  <button
                    onClick={() => requestHardDelete(order.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded inline-flex items-center"
                    title="Hapus permanen (token)"
                  >
                    <Trash2 size={14} className="mr-1" /> DELETE
                  </button>
                </td>
              </tr>
            ))}
            {deletedOrders.length === 0 && (
              <tr><td colSpan={9} className="text-center py-6">Tidak ada data deleted di rentang ini</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================ Preview Modal ================ */}
      {showPrintPreview && receiptText && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-900">Preview Struk</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => regenPreviewText('dapur', printData)}
                    className={`px-3 py-1 rounded border ${printMode === 'dapur' ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'}`}
                  >
                    Dapur
                  </button>
                  <button
                    onClick={() => regenPreviewText('resto', printData)}
                    className={`px-3 py-1 rounded border ${printMode === 'resto' ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'}`}
                  >
                    Restoran
                  </button>
                </div>
              </div>

              <div className="font-mono text-[13px] text-black bg-gray-50 p-4 rounded mb-4 overflow-auto">
                <pre
                  className="mx-auto"
                  style={{ width: `${previewCols}ch`, whiteSpace: 'pre', lineHeight: 1.25 }}
                >
                  {receiptText}
                </pre>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowPrintPreview(false)} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-black">
                  Batal
                </button>
                <button onClick={handleConfirmPrint} disabled={isPrinting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60">
                  <Printer size={16} className="mr-2 inline" /> Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ Confirm Delete Bulan ================ */}
      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <AlertTriangle className="text-red-600" />
              <h3 className="font-semibold text-blue-900">Konfirmasi Hapus</h3>
            </div>

            <div className="px-5 py-4 text-sm text-black">
              Hapus <b>SEMUA</b> arsip bulan{' '}
              <b>{selectedMonth ? new Date(selectedMonth + '-01').toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase() : ''}</b>?
              <br />
              <span className="text-red-600 font-medium">Tindakan ini tidak bisa dibatalkan.</span>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black" disabled={isDeleting}>
                Batal
              </button>
              <button
                onClick={async () => { setConfirmOpen(false); await deleteAllInMonth(); }}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================ Token Modal (Hard Delete) ================ */}
      {tokenOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 text-blue-900">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound />
              <h3 className="text-lg font-semibold">Masukkan Token Admin</h3>
            </div>
            <input
              type="password"
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder="Token"
              className="w-full border rounded p-2 text-black mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTokenOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-black">
                Batal
              </button>
              <button onClick={confirmHardDelete} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white">
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================ Popup Notifikasi ================ */}
      <NewOrderPopup
        open={show}
        customerName={current?.customerName}
        roomNumber={current?.roomNumber}
        onClose={close}
        onReplay={replay}
        onEnableSound={enableSound}
        showEnableSound={needEnable}
        muted={muted}
        onToggleMute={toggleMute}
      />
    </div>
  );
}