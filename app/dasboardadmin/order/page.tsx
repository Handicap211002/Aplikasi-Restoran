'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  CircleCheckBig,
  Printer,
  LogOut,
  Pencil,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateKikiRestaurantReceipt } from '../../utils/receipt-generator';
import NewOrderPopup from '../../../components/NewOrderPopup';
import { useNewOrderNotify } from '../../../hooks/useNewOrderNotify';

// ==== KONFIG: token admin (hardcoded sesuai permintaan) ====
const ADMIN_TOKEN = 'KIKI-ADMIN-123'; // ganti sesuai kebutuhan

// ============= Utils waktu (tetap) =============
function normalizeToUTCDate(value: string | Date) {
  if (value instanceof Date) return value;
  const s = String(value).trim();
  const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(s);
  const iso = hasTZ ? s : s + 'Z';
  return new Date(iso);
}
function formatToWIB(value: string | Date) {
  const d = normalizeToUTCDate(value);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(d);
}
function getWIBDayRangeUTCISO(base: Date = new Date()) {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wib00 = new Date(base.getTime() + wibOffsetMs);
  wib00.setHours(0, 0, 0, 0);
  const startUtcMs = wib00.getTime() - wibOffsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  return { isoStart: new Date(startUtcMs).toISOString(), isoEnd: new Date(endUtcMs).toISOString() };
}
function getElapsedMinutes(createdAt: string | Date) {
  const d = normalizeToUTCDate(createdAt);
  return Math.floor((Date.now() - d.getTime()) / 60000);
}
function getRowClass(createdAt: string | Date) {
  const m = getElapsedMinutes(createdAt);
  if (m >= 60) return 'bg-red-400';
  if (m >= 30) return 'bg-yellow-100';
  if (m >= 0) return 'bg-green-100';
  return '';
}
function getMinutesUntil(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = normalizeToUTCDate(value);
  return Math.floor((d.getTime() - Date.now()) / 60000);
}
function getRowClassForOrder(order: any) {
  if (!order?.isPreOrder) return getRowClass(order?.createdAt);
  const mins = getMinutesUntil(order?.scheduledAt);
  if (mins === null) return 'bg-indigo-50';
  if (mins <= 0) return 'bg-red-400';
  if (mins <= 20) return 'bg-yellow-100';
  if (mins <= 40) return 'bg-green-100';
  return 'bg-indigo-50';
}

// ===== tipe bantu untuk UI edit item
type EditItem = {
  id?: number;            // ada jika item lama
  menuItemId: number;
  name?: string;          // untuk tampilan
  price?: number;         // untuk kalkulasi total
  quantity: number;
  note: string | null;
  _deleted?: boolean;     // tanda dihapus di UI
  _new?: boolean;         // tanda item baru
};

type MenuItemLite = {
  id: number;
  name: string;
  price: number;
};

export default function OrderPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PRINT / PREVIEW
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [receiptText, setReceiptText] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMode, setPrintMode] = useState<'resto' | 'dapur'>('dapur');

  // Popup legend + tick
  const [showLegend, setShowLegend] = useState(false);
  const [, setNowTick] = useState(0);

  // ===== popup notifikasi reusable
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
    channelName: 'order-realtime-popup',
    filter: 'isarchived=eq.false',
    rateLimitMs: 2000,
    soundSrc: '/bell.mp3',
  });

  // ====== AUTH (token) ======
  const [authOpen, setAuthOpen] = useState(false);
  const [authAction, setAuthAction] = useState<null | 'edit' | 'delete'>(null);
  const [authTargetOrder, setAuthTargetOrder] = useState<any>(null);
  const [authToken, setAuthToken] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const openAuth = (action: 'edit' | 'delete', order: any) => {
    setAuthAction(action);
    setAuthTargetOrder(order);
    setAuthToken('');
    setAuthError(null);
    setAuthOpen(true);
  };

  // ====== EDIT MODAL ======
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [formCustomerName, setFormCustomerName] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formOrderType, setFormOrderType] = useState<'IN_RESTAURANT' | 'DELIVERY_ROOM' | 'TAKE_AWAY'>('IN_RESTAURANT');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'ROOM_CHARGE'>('CASH');
  const [formIsPreOrder, setFormIsPreOrder] = useState(false);
  const [formScheduledAtLocal, setFormScheduledAtLocal] = useState<string>(''); // local datetime string

  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [allMenus, setAllMenus] = useState<MenuItemLite[]>([]);

  // ---------- opsi generator (identik dengan History) ----------
  function genOptsFor(mode: 'resto' | 'dapur', forEscpos: boolean) {
    return mode === 'resto'
      ? { paper: '58mm' as const, font: 'B' as const, escpos: forEscpos, compact: true, scale: { w: 1, h: 2 }, variant: 'resto' as const }
      : { paper: '80mm' as const, font: 'A' as const, escpos: forEscpos, compact: false, variant: 'dapur' as const };
  }
  function genOpts(forEscpos: boolean) {
    return genOptsFor(printMode, forEscpos);
  }
  function regenPreviewText(mode: 'resto' | 'dapur', target: any) {
    setPrintMode(mode);
    if (!target) return;
    const cashierName = target.cashierName ?? 'Kasir';
    const txt = generateKikiRestaurantReceipt(target, cashierName, genOptsFor(mode, false));
    setReceiptText(txt);
  }

  // ---------- data ----------
  const fetchOrders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.push('/kasirlogin');
        return;
      }

      const { isoStart, isoEnd } = getWIBDayRangeUTCISO();
      const { data, error } = await supabase
        .from('Order')
        .select(`
          id, roomNumber, customerName, orderType, paymentMethod, totalPrice, totalOrder, createdAt,
          status, isPreOrder, scheduledAt, isarchived,
          orderItems:OrderItem ( id, note, quantity, price, menuItem:MenuItem ( id, name, price ) )
        `)
        .gte('createdAt', isoStart)
        .lt('createdAt', isoEnd)
        .eq('isarchived', false)
        .order('createdAt', { ascending: false });

      if (error) {
        setError('Gagal memuat data order.');
        console.error(error);
        return;
      }
      setOrders(data ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat memuat order.');
    }
  };

  // soft delete helper
  const softDeleteOrder = async (orderId: number) => {
    // ubah status jadi DELETED & arsipkan
    const { error } = await supabase
      .from('Order')
      .update({ status: 'DELETED' as any, isarchived: true })
      .eq('id', orderId);

    if (error) {
      // kemungkinan enum belum ditambah → fallback FAILED + arsip
      console.warn('[softDeleteOrder] enum mungkin belum ada, fallback FAILED.', error);
      await supabase.from('Order').update({ status: 'FAILED', isarchived: true }).eq('id', orderId);
    }
    await fetchOrders();
  };

  // buka editor: ambil data lengkap + menu list
  const openEditorFor = async (orderId: number) => {
    const [{ data: order, error: e1 }, { data: menus, error: e2 }] = await Promise.all([
      supabase
        .from('Order')
        .select(`
          id, roomNumber, customerName, orderType, paymentMethod, totalPrice, totalOrder, status,
          isPreOrder, scheduledAt,
          orderItems:OrderItem ( id, note, quantity, price, menuItem:MenuItem ( id, name, price ) )
        `)
        .eq('id', orderId)
        .single(),
      supabase.from('MenuItem').select('id,name,price').order('name'),
    ]);

    if (e1 || e2 || !order || !menus) {
      console.error('Gagal ambil data untuk edit', e1 || e2);
      return;
    }

    setAllMenus(menus as MenuItemLite[]);

    setFormCustomerName(order.customerName ?? '');
    setFormRoomNumber(order.roomNumber ?? '');
    setFormOrderType(order.orderType);
    setFormPaymentMethod(order.paymentMethod);
    setFormIsPreOrder(Boolean(order.isPreOrder));
    setFormScheduledAtLocal(order.scheduledAt ? toLocalDatetimeInput(order.scheduledAt) : '');

    const items: EditItem[] = (order.orderItems ?? []).map((oi: any) => ({
      id: oi.id,
      menuItemId: oi.menuItem?.id,
      name: oi.menuItem?.name,
      price: oi.menuItem?.price,
      quantity: oi.quantity ?? 1,
      note: oi.note ?? '',
    }));
    setEditItems(items);

    setEditOpen(true);
  };

  // convert Date/ISO → nilai <input type="datetime-local">
  function toLocalDatetimeInput(iso: string | Date) {
    const d = normalizeToUTCDate(iso);
    // tampilkan dalam zona lokal
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  // parse nilai dari input datetime-local → ISO UTC
  function fromLocalDatetimeInput(val: string) {
    if (!val) return null;
    // val dianggap local time → konversi ke UTC ISO
    const local = new Date(val);
    return new Date(local.getTime()).toISOString();
  }

  // simpan hasil edit
  const saveEdit = async () => {
    if (!authTargetOrder) return;
    setEditSaving(true);
    try {
      // hitung totalOrder & totalPrice berdasar item & harga menu
      const calcItems = editItems.filter(i => !i._deleted);
      const totalOrder = calcItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      // ambil harga dari source menu (agar akurat)
      const priceMap = new Map<number, number>(allMenus.map(m => [m.id, m.price]));
      const totalPrice = calcItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (priceMap.get(i.menuItemId) ?? i.price ?? 0), 0);

      const payloadOrder = {
        customerName: formCustomerName.trim(),
        roomNumber: formRoomNumber.trim(),
        orderType: formOrderType as any,
        paymentMethod: formPaymentMethod as any,
        isPreOrder: formIsPreOrder,
        scheduledAt: formIsPreOrder ? fromLocalDatetimeInput(formScheduledAtLocal) : null,
        totalOrder,
        totalPrice,
        status: 'SUCCESS_EDIT' as any, // ⚠️ butuh enum baru; ada fallback di bawah
        isarchived: false,
      };

      // update order dulu
      let upd = await supabase.from('Order').update(payloadOrder).eq('id', authTargetOrder.id);
      if (upd.error) {
        // fallback kalau enum belum ada
        console.warn('[saveEdit] enum SUCCESS_EDIT belum ada → fallback SUCCESS', upd.error);
        upd = await supabase.from('Order').update({ ...payloadOrder, status: 'SUCCESS' }).eq('id', authTargetOrder.id);
        if (upd.error) throw upd.error;
      }

      // sinkronisasi item
      // 1) ambil item lama agar tahu mana yang dihapus
      const { data: curItems, error: curErr } = await supabase
        .from('OrderItem')
        .select('id')
        .eq('orderId', authTargetOrder.id);
      if (curErr) throw curErr;
      const currentIds = new Set<number>((curItems ?? []).map((r: any) => r.id));

      const toKeepOrUpdate = calcItems.filter(i => i.id);           // id ada → update
      const toInsert = calcItems.filter(i => !i.id || i._new);      // item baru
      const finalIds = new Set<number>(toKeepOrUpdate.map(i => i.id!));
      const toDeleteIds = [...currentIds].filter(id => !finalIds.has(id));

      // 2) delete yang dihapus
      if (toDeleteIds.length) {
        const { error: delErr } = await supabase.from('OrderItem').delete().in('id', toDeleteIds);
        if (delErr) throw delErr;
      }

      // 3) update existing
      for (const it of toKeepOrUpdate) {
        const { error: upErr } = await supabase
          .from('OrderItem')
          .update({
            menuItemId: it.menuItemId,
            quantity: Number(it.quantity) || 1,
            price: priceMap.get(it.menuItemId) ?? it.price ?? 0,
            note: it.note ?? null,
          })
          .eq('id', it.id!);
        if (upErr) throw upErr;
      }

      // 4) insert new
      if (toInsert.length) {
        const rows = toInsert.map(it => ({
          orderId: authTargetOrder.id,
          menuItemId: it.menuItemId,
          quantity: Number(it.quantity) || 1,
          price: priceMap.get(it.menuItemId) ?? it.price ?? 0,
          note: it.note ?? null,
        }));
        const { error: insErr } = await supabase.from('OrderItem').insert(rows);
        if (insErr) throw insErr;
      }

      setEditOpen(false);
      await fetchOrders();
    } catch (e) {
      console.error('[saveEdit] gagal:', e);
      alert('Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  // aksi setelah autentikasi
  const proceedAfterAuth = async () => {
    if (authToken !== ADMIN_TOKEN) {
      setAuthError('Token/Password salah.');
      return;
    }
    setAuthOpen(false);
    if (!authTargetOrder || !authAction) return;

    if (authAction === 'delete') {
      await softDeleteOrder(authTargetOrder.id);
    } else if (authAction === 'edit') {
      await openEditorFor(authTargetOrder.id);
    }
  };

  const handleFinishOrder = async (orderId: number) => {
    try {
      const { error } = await supabase
        .from('Order')
        .update({
          isarchived: true,          // arsipkan
          status: 'SUCCESS_EDIT',    // status jadi sukses edit
        })
        .eq('id', orderId);

      if (error) {
        console.error('[finish] gagal:', error.message);
        alert('Gagal menandai selesai.');
        return;
      }

      // refresh list
      await fetchOrders();
    } catch (err) {
      console.error('[finish] exception:', err);
      alert('Gagal menandai selesai.');
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
        .select(`*, orderItems:OrderItem(*, menuItem:MenuItem(name, price))`)
        .eq('id', orderId)
        .single();
      if (error || !orderData) {
        console.error('Error fetching order:', error);
        alert('Gagal mengambil data order');
        return;
      }

      const { data: userWrap } = await supabase.auth.getUser();
      const u = userWrap?.user;
      const md = (u?.user_metadata ?? {}) as Record<string, any>;
      const idMeta = (u?.identities ?? [])
        .map((i: any) => i?.identity_data ?? {})
        .reduce((a: any, b: any) => ({ ...a, ...b }), {});
      const cashierName =
        md.full_name ??
        md.display_name ??
        md.displayName ??
        md.name ??
        idMeta.full_name ??
        idMeta.name ??
        (u?.email ? u.email.split('@')[0] : 'Kasir');

      const payload = { ...orderData, cashierName };
      setPrintData(payload);
      setPrintMode('dapur'); // default sama seperti History
      setReceiptText(generateKikiRestaurantReceipt(payload, cashierName, genOptsFor('dapur', false)));
      setShowPrintPreview(true);
    } catch (err) {
      console.error('Preview error:', err);
      alert('Gagal memuat preview struk');
    }
  };

  const handleConfirmPrint = () => {
    if (!printData) return alert('Tidak ada data struk');
    setIsPrinting(true);
    try {
      const cashierName = printData.cashierName ?? 'Kasir';
      const payload = generateKikiRestaurantReceipt(printData, cashierName, genOpts(true));
      const encoded = encodeURIComponent(payload);
      // RawBT
      window.location.href = `rawbt:${encoded}`;
      setShowPrintPreview(false);
    } finally {
      setIsPrinting(false);
    }
  };

  // ---------- effects ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push('/kasirlogin');
      else {
        await fetchOrders();
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const channel = supabase
      .channel('order-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Order', filter: 'isarchived=eq.false' },
        () => {
          fetchOrders(); // popup & audio diurus hook
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Order', filter: 'isarchived=eq.true' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loading]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p className="text-center mt-10 text-blue-900">Memuat...</p>;

  const previewCols = printMode === 'resto' ? 42 : 48; // 58mm Font B = 42, 80mm Font A = 48

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} className="hidden md:block" />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a className="border-b-4 border-blue-900 pb-1">ORDER</a>
          <a href="/dasboardadmin/history" className="hover:border-b-4 hover:border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      {/* Tabel */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md mt-4">
        <table className="min-w-full table-auto text-center text-black">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-2 py-2">Time Order</th>
              <th className="px-2 py-2">ROOM</th>
              <th className="px-2 py-2">CUSTOMER</th>
              <th className="px-2 py-2">ORDER</th>
              <th className="px-2 py-2">ORDER TYPE</th>
              <th className="px-2 py-2">PAYMENT</th>
              <th className="px-2 py-2">TOTAL</th>
              <th className="px-6 py-2">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={`${getRowClassForOrder(order)} border-b border-black-100 transition-colors`}>
                <td className="py-2">
                  {order.isPreOrder ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 border-indigo-300 text-indigo-800">
                        PRE-ORDER • {order.scheduledAt ? formatToWIB(order.scheduledAt) : '-'}
                      </span>
                      <span className="text-[11px] text-gray-500">Dipesan: {formatToWIB(order.createdAt)}</span>
                    </div>
                  ) : (
                    formatToWIB(order.createdAt)
                  )}
                </td>
                <td className="py-2">{order.roomNumber}</td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    {order.orderItems?.map(
                      (oi: any) => (
                        <span key={oi.id}>
                          {oi.menuItem?.name ?? 'Item'} × {oi.quantity} &rarr; {oi.note?.trim() || '–'}
                        </span>
                      )
                    )}
                  </div>
                </td>
                <td className="py-2">{order.orderType}</td>
                <td className="py-2">{order.paymentMethod}</td>
                <td className="py-2">Rp.{order.totalPrice?.toLocaleString('id-ID') ?? 0}</td>
                <td className="py-2">
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2 px-2">
                    <button
                      onClick={() => handlePrintPreview(order.id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded inline-flex items-center justify-center w-full sm:w-auto"
                    >
                      <Printer size={16} className="mr-1" /> PRINT
                    </button>

                    {/* EDIT (butuh token) */}
                    <button
                      onClick={() => openAuth('edit', order)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded inline-flex items-center justify-center w-full sm:w-auto"
                      title="Edit order (proteksi token)"
                    >
                      <Pencil size={16} className="mr-1" /> EDIT
                    </button>

                    {/* DELETE (soft-delete, butuh token) */}
                    <button
                      onClick={() => openAuth('delete', order)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded inline-flex items-center justify-center w-full sm:w-auto"
                      title="Delete (soft-delete → status DELETED, arsip true)"
                    >
                      <Trash2 size={16} className="mr-1" /> DELETE
                    </button>
                    <button
                      onClick={() => handleFinishOrder(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded inline-flex items-center justify-center w-full sm:w-auto"
                      title="Arsipkan & set status ke SUCCESS_EDIT"
                    >
                      <CircleCheckBig size={16} className="mr-1" /> SELESAI
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* tombol legenda */}
        <div className="flex justify-end p-3">
          <button
            onClick={() => setShowLegend(true)}
            className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-black px-3 py-2 rounded"
            aria-haspopup="dialog"
            aria-expanded={showLegend}
          >
            ❔ Legenda warna
          </button>
        </div>

        {error && <p className="text-center text-red-600 py-4">{error}</p>}
        {orders.length === 0 && !error && <p className="text-center text-blue-800 py-6">Belum ada order.</p>}
      </div>

      {/* ===== Preview Modal (IDENTIK History) ===== */}
      {showPrintPreview && printData && (
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
                <pre className="mx-auto" style={{ width: `${previewCols}ch`, whiteSpace: 'pre', lineHeight: 1.25 }}>
                  {receiptText}
                </pre>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowPrintPreview(false)} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-black">
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

      {/* ===== Modal AUTH (token/password) ===== */}
      {authOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 text-blue-900">
            <h3 className="text-lg font-bold mb-2">
              {authAction === 'delete' ? 'Konfirmasi Delete (Soft-Delete)' : 'Konfirmasi Edit'}
            </h3>
            <p className="text-sm mb-3">Masukkan token/password admin untuk melanjutkan.</p>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Token / Password"
              className="w-full border rounded px-3 py-2 text-black"
            />
            {authError && <p className="text-red-600 text-sm mt-2">{authError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAuthOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-black">
                Batal
              </button>
              <button onClick={proceedAfterAuth} className="px-4 py-2 rounded bg-blue-600 text-white">
                Lanjut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal EDIT ===== */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-6 text-blue-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Edit Order</h3>
              <button onClick={() => setEditOpen(false)} className="text-black/70 hover:text-black">
                <X />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Customer Name</label>
                <input
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="text-sm">Room Number</label>
                <input
                  value={formRoomNumber}
                  onChange={(e) => setFormRoomNumber(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="text-sm">Order Type</label>
                <select
                  value={formOrderType}
                  onChange={(e) => setFormOrderType(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 text-black"
                >
                  <option value="IN_RESTAURANT">IN_RESTAURANT</option>
                  <option value="DELIVERY_ROOM">DELIVERY_ROOM</option>
                  <option value="TAKE_AWAY">TAKE_AWAY</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Payment</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 text-black"
                >
                  <option value="CASH">CASH</option>
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="ROOM_CHARGE">ROOM_CHARGE</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formIsPreOrder}
                    onChange={(e) => setFormIsPreOrder(e.target.checked)}
                  />
                  Pre-Order
                </label>
                {formIsPreOrder && (
                  <div className="mt-2">
                    <label className="text-sm block">Scheduled At</label>
                    <input
                      type="datetime-local"
                      value={formScheduledAtLocal}
                      onChange={(e) => setFormScheduledAtLocal(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-black"
                    />
                  </div>
                )}
              </div>
            </div>

            <hr className="my-4" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Items</h4>
                <button
                  onClick={() => {
                    const first = allMenus[0];
                    if (!first) return;
                    setEditItems(prev => [
                      ...prev,
                      { _new: true, menuItemId: first.id, name: first.name, price: first.price, quantity: 1, note: '' },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded border text-blue-900 border-blue-900 hover:bg-blue-900 hover:text-white"
                >
                  <Plus size={16} /> Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {editItems.filter(i => !i._deleted).map((it, idx) => (
                  <div key={it.id ?? `new-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={it.menuItemId}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const m = allMenus.find(mm => mm.id === id);
                          setEditItems(prev => prev.map(x => x === it ? { ...x, menuItemId: id, name: m?.name, price: m?.price } : x));
                        }}
                        className="w-full border rounded px-3 py-2 text-black"
                      >
                        {allMenus.map(m => (
                          <option key={m.id} value={m.id}>{m.name} — Rp.{m.price.toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value) || 1);
                          setEditItems(prev => prev.map(x => x === it ? { ...x, quantity: q } : x));
                        }}
                        className="w-full border rounded px-2 py-2 text-black text-center"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        value={it.note ?? ''}
                        onChange={(e) => setEditItems(prev => prev.map(x => x === it ? { ...x, note: e.target.value } : x))}
                        placeholder="Catatan"
                        className="w-full border rounded px-3 py-2 text-black"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => setEditItems(prev => prev.map(x => x === it ? { ...x, _deleted: true } : x))}
                        className="px-2 py-2 rounded bg-red-500 hover:bg-red-600 text-white"
                        title="Hapus item ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {editItems.filter(i => !i._deleted).length === 0 && (
                  <p className="text-sm text-gray-600">Belum ada item. Klik “Tambah Item”.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-black">
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
              >
                {editSaving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Legend */}
      {showLegend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">Penjelasan warna order</h3>
              <button onClick={() => setShowLegend(false)} className="text-black/70 hover:text-black text-xl leading-none">×</button>
            </div>

            <div className="space-y-5 text-sm text-blue-900">
              <section>
                <h4 className="font-semibold mb-2">Order biasa (bukan pre-order)</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-green-100" /><span>waktunya memasak</span></li>
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-yellow-100" /><span>≥ 30 menit dari waktu orderan masuk</span></li>
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-red-400" /><span>≥ 60 menit setelah orderan masuk (sudah telat)</span></li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold mb-2">Pre-order (berdasarkan sisa waktu ke jadwal)</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-indigo-50" /><span>≥ 60 menit lagi (masih lama)</span></li>
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-green-100" /><span>45 menit lagi sebelum waktu tiba</span></li>
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-yellow-100" /><span>30 menit lagi sebelum waktu tiba</span></li>
                  <li className="flex items-center gap-3"><span className="w-4 h-4 rounded border bg-red-400" /><span>sudah waktunya antar</span></li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Catatan: Jam pada badge <b>PRE-ORDER</b> ditampilkan dalam WIB. Warna baris mengikuti sisa waktu menuju <code>scheduledAt</code>.
                </p>
              </section>

              <div className="flex justify-end">
                <button onClick={() => setShowLegend(false)} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}