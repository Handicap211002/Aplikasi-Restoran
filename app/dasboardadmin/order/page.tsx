'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CircleCheckBig, Printer, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useRef } from 'react';
import { generateKikiRestaurantReceipt } from '../../utils/receipt-generator';
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

  return {
    isoStart: new Date(startUtcMs).toISOString(),
    isoEnd: new Date(endUtcMs).toISOString(),
  };
}
// Hitung selisih menit dari createdAt sampai sekarang
function getElapsedMinutes(createdAt: string | Date) {
  const d = normalizeToUTCDate(createdAt);
  return Math.floor((Date.now() - d.getTime()) / 60000);
}

// Tentukan warna baris sesuai usia order
function getRowClass(createdAt: string | Date) {
  const m = getElapsedMinutes(createdAt);
  if (m >= 60) return 'bg-red-400';            // ≥ 40 menit
  if (m >= 30) return 'bg-yellow-100';         // ≥ 30 menit
  if (m >= 0) return 'bg-green-100';          // ≥ 20 menit
  return '';
}
// Sisa menit dari sekarang ke scheduledAt (bisa negatif kalau sudah lewat)
function getMinutesUntil(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = normalizeToUTCDate(value);
  return Math.floor((d.getTime() - Date.now()) / 60000);
}

/**
 * Warna baris:
 * - Non pre‑order: pakai getRowClass(createdAt) (sudah ada).
 * - Pre‑order: berdasarkan sisa menit ke scheduledAt:
 *   >= 60     : indigo-50 (masih lama)
 *   30–59     : indigo-100
 *   10–29     : yellow-100 (mendekati)
 *   0–9       : yellow-200 (sangat dekat)
 *   -1 – -10  : red-100 (baru lewat)
 *   -11 – -30 : red-200 (telat)
 *   <= -31    : bg-black text-white (sangat telat)
 */
function getRowClassForOrder(order: any) {
  if (!order?.isPreOrder) {
    // order biasa: pakai logic lama
    return getRowClass(order?.createdAt);
  }

  const mins = getMinutesUntil(order?.scheduledAt);
  if (mins === null) return 'bg-indigo-50'; // fallback jika scheduledAt null

  if (mins <= 0) return 'bg-red-400';        // waktu pre-order sudah tiba atau lewat
  if (mins <= 20) return 'bg-yellow-100';    // 1–20 menit lagi
  if (mins <= 40) return 'bg-green-100';     // 21–40 menit lagi
  return 'bg-indigo-50';                     // >40 menit lagi
}



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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showNewOrderPopup, setShowNewOrderPopup] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const [showLegend, setShowLegend] = useState(false)

  // Tick per menit supaya warna baris update otomatis tanpa reload
  const [, setNowTick] = useState(0);
  const fetchOrders = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/kasirlogin');
        return;
      }

      const { isoStart, isoEnd } = getWIBDayRangeUTCISO();

      const { data, error } = await supabase
        .from('Order')
        .select(`
          id,
          roomNumber,
          customerName,
          orderType,
          paymentMethod,
          totalPrice,
          createdAt,
          isPreOrder,
          scheduledAt,
          isarchived,
          orderItems:OrderItem (
            id,
            note,
            menuItem:MenuItem (
              name
            )
          )
        `)
        .gte('createdAt', isoStart)
        .lt('createdAt', isoEnd)
        .eq('isarchived', false)
        .order('createdAt', { ascending: false });

      if (error) {
        setError('Gagal memuat data order.');
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data ?? []);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Terjadi kesalahan saat memuat order.');
    }
  };
  function stopBellAndClose() {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch { }
    }
    setShowNewOrderPopup(false);
  }

  // Jika autoplay diblok, user bisa memulai suara manual
  function startBell() {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn('Cannot start audio:', err);
      });
    }
  }

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
      // Ambil data order + relasinya
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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError);
      }

      const cashierName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        'Kasir Tidak Dikenal';

      const completeOrderData = {
        ...orderData,
        cashierName,
      };

      setPrintData({ ...orderData, cashierName });
      setReceiptText(generateKikiRestaurantReceipt(orderData, cashierName));
      setShowPrintPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Gagal memuat preview struk');
    }
  };

  const handleConfirmPrint = async () => {
    if (!receiptText) return alert('Tidak ada data struk');

    // Encode teks struk agar bisa dibaca oleh RawBT
    const encoded = encodeURIComponent(receiptText);

    // Arahkan browser tablet ke aplikasi RawBT
    window.location.href = `rawbt:${encoded}`;

    // Tutup modal preview
    setShowPrintPreview(false);
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
          filter: 'isarchived=eq.false',
        }, (payload) => {
          // refresh data
          fetchOrders();

          // Simpan info order masuk (opsional ditampilkan di popup)
          setIncomingOrder(payload.new);
          setShowNewOrderPopup(true);

          // Coba bunyikan bel
          const audio = audioRef.current;
          if (audio) {
            // Restart dari awal
            audio.currentTime = 0;
            audio.play().catch((err) => {
              // Autoplay bisa diblok browser — popup tetap muncul, user bisa tekan tombol untuk mulai/stop.
              console.warn('Autoplay blocked:', err);
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'Order',
          filter: 'isarchived=eq.true',
        }, () => fetchOrders())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loading]);

  // Siapkan audio lonceng sekali saat mount
  useEffect(() => {
    const a = new Audio('/bell.mp3'); // ganti jika nama file lain
    a.loop = true;
    audioRef.current = a;

    // cleanup
    return () => {
      try {
        a.pause();
      } catch { }
      audioRef.current = null;
    };
  }, []);

  // Re-render tiap 60 detik agar warna baris mengikuti umur order
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);


  if (loading) return <p className="text-center mt-10 text-blue-900">Memuat...</p>;

  return (
    <div className="pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image
          src="/logo.png"
          alt="logo"
          width={90}
          height={50}
          className="hidden md:block"
        />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a className="border-b-4 border-blue-900 pb-1">ORDER</a>
          <a href="/dasboardadmin/history" className="hover:border-b-4 hover:border-blue-900 pb-1">HISTORY</a>
          <a href="/dasboardadmin/menu" className="hover:border-b-4 hover:border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

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
            {orders.map(order => (
              <tr
                key={order.id}
                className={`${getRowClassForOrder(order)} border-b border-black-100 transition-colors`}
              >
                <td className="py-2">
                  {order.isPreOrder ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 border-indigo-300 text-indigo-800">
                        PRE‑ORDER • {order.scheduledAt ? formatToWIB(order.scheduledAt) : '-'}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Dipesan: {formatToWIB(order.createdAt)}
                      </span>
                    </div>
                  ) : (
                    formatToWIB(order.createdAt)
                  )}
                </td>
                <td className="py-2">{order.roomNumber}</td>
                <td className="py-2">{order.customerName}</td>

                {/* Kolom STATUS diganti menjadi Nama Menu → Note */}
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    {order.orderItems?.map(
                      (oi: { id: number; note: string | null; menuItem?: { name?: string | null } | null }) => (
                        <span key={oi.id}>
                          {oi.menuItem?.name ?? 'Item'} &rarr; {oi.note?.trim() || '–'}
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
                    <button
                      onClick={() => {
                        setOrderToDelete(order.id);
                        setShowConfirm(true);
                      }}
                      className="bg-green-500 hover:bg-green-800 text-white px-3 py-1 rounded inline-flex items-center justify-center w-full sm:w-auto"
                    >
                      <CircleCheckBig size={16} className="mr-1" /> SELESAI
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* ...setelah </table> */}
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
              <div className="font-mono text-sm text-black bg-gray-50 p-4 rounded mb-4">
                {receiptText.split('\n').map((line, i) => (
                  <div key={i} className={line.includes('KIKI RESTAURANT') ? 'font-bold text-center' : ''}>
                    {line.replace(/\x1B\[[0-9;]*[mGKH]/g, '')}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-black"
                >
                  Batal
                </button>
                {/* Tombol cetak dengan loading state */}
                <button
                  onClick={handleConfirmPrint}
                  disabled={isPrinting}
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-flex items-center ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4">
            <p className="text-lg text-black font-medium">Yakin Orderan Sudah Selesai?</p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-black"
                onClick={() => {
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
              >
                Tidak
              </button>
              <button
                className="bg-green-500 hover:bg-green-800 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (orderToDelete !== null) {
                    handleDeleteOrder(orderToDelete);
                  }
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewOrderPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 text-blue-900">
            <h3 className="text-xl font-bold mb-2">Order baru masuk!</h3>
            <p className="mb-4">
              {incomingOrder?.customerName
                ? `Dari: ${incomingOrder.customerName} • Room: ${incomingOrder.roomNumber ?? '-'}`
                : 'Ada order baru yang masuk.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={startBell}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black"
              >
                Bunyi lagi
              </button>
              <button
                onClick={stopBellAndClose}
                className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white"
              >
                Matikan bunyi & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {showLegend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-900">Penjelasan warna order</h3>
              <button
                onClick={() => setShowLegend(false)}
                className="text-black/70 hover:text-black text-xl leading-none"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 text-sm text-blue-900">
              {/* Order biasa */}
              <section>
                <h4 className="font-semibold mb-2">Order biasa (bukan pre‑order)</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-green-100" />
                    <span>waktunya memasak</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-yellow-100" />
                    <span>≥ 30 menit dari waktu orderan masuk</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-red-400" />
                    <span>≥ 60 menit setelah orderan masuk(sudah telat) </span>
                  </li>
                </ul>
              </section>

              {/* Pre‑order */}
              <section>
                <h4 className="font-semibold mb-2">Pre‑order (berdasarkan sisa waktu ke jadwal)</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-indigo-50" />
                    <span>60 menit lagi (masih lama)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-green-100" />
                    <span>30 menit lagi sebelum waktu tiba</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-yellow-100" />
                    <span>40 menit lagi sebelum waktu tiba</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded border bg-red-400" />
                    <span>sudah waktunya antar</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Catatan: Jam pada badge <b>PRE‑ORDER</b> ditampilkan dalam WIB. Warna baris mengikuti
                  sisa waktu menuju <code>scheduledAt</code>.
                </p>
              </section>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowLegend(false)}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}