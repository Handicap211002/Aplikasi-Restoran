// utils/receipt-generator.ts
import { Order, OrderItem } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/id';
dayjs.extend(utc); dayjs.extend(timezone);

function formatToWIB(dateInput: Date | string): string {
  return dayjs.utc(dateInput).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
}
function formatToWIBShort(dateInput: Date | string): string {
  // Contoh: "16 Agu 25 15:42"
  return dayjs.utc(dateInput).tz('Asia/Jakarta').locale('id').format('DD MMM YY HH:mm');
}

type Paper = '58mm' | '80mm';
type Font = 'A' | 'B';

const LINE_WIDTH: Record<Paper, Record<Font, number>> = {
  '58mm': { A: 32, B: 42 },
  '80mm': { A: 48, B: 64 },
};

const ESC = '\x1B';
const GS = '\x1D';
const alignLeft = () => ESC + 'a' + '\x00';
const alignCenter = () => ESC + 'a' + '\x01';
const escposHeader = (font: Font) =>
  ESC + '@' + ESC + 'M' + (font === 'A' ? '\x00' : '\x01') + GS + '!' + '\x00';
const escBold = (on: boolean) => ESC + 'E' + (on ? '\x01' : '\x00');

const padRight = (s: string, w: number) => (s.length >= w ? s : s + ' '.repeat(w - s.length));
const padLeft = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(n, b));
const money = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const sanitize = (t: any) => String(t ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');

function wrapWords(text: string, width: number): string[] {
  const words = String(text).split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= width) line += ' ' + w;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

function centerLine(text: string, width: number) {
  const s = String(text);
  if (s.length >= width) return s;
  const left = Math.floor((width - s.length) / 2);
  return ' '.repeat(left) + s;
}

// --- PRE ORDER HELPER ---
// Coba beberapa kemungkinan field: preOrderAt (Date), preOrderTime (string), dll.
// Kalau tidak ada → '-'
function getPreOrderText(order: any): string {
  const candidates = [
    'scheduledAt', 'preorderAt', 'pre_order_at',
    'preOrderTime', 'preorderTime', 'pre_order_time', 'preorder_time'
  ];
  for (const k of candidates) {
    const v = order?.[k];
    if (v) {
      // kalau bisa diparse sebagai tanggal, format HH:mm; kalau tidak, tampilkan apa adanya
      const d = new Date(v);
      if (!isNaN(d.getTime())) return dayjs.utc(d).tz('Asia/Jakarta').format('HH:mm');
      return String(v);
    }
  }
  const isPre = order?.isPreOrder ?? order?.preorder ?? false;
  if (isPre) {
    // coba jam menit lain kalau ada
    const hh = order?.preOrderHour ?? order?.hour ?? '';
    const mm = order?.preOrderMinute ?? order?.minute ?? '';
    if (hh && mm) return `${hh}:${String(mm).padStart(2, '0')}`;
  }
  return '-';
}

export type ReceiptOptions = {
  paper?: Paper;
  font?: Font;
  escpos?: boolean;   // true: kirim ESC/POS (cetakan). false: preview teks.
  compact?: boolean;  // true: layout hemat (biasanya 58mm/Restoran)
  variant?: 'resto' | 'dapur'; // ⬅️ layout khusus
};

export function generateKikiRestaurantReceipt(
  order: Order & { orderItems: (OrderItem & { menuItem: { name: string; price: number } })[]; },
  cashierName: string,
  options: ReceiptOptions = {}
): string {
  const paper = options.paper ?? '80mm';
  const font = options.font ?? 'A';
  const escpos = options.escpos ?? false;            // default aman buat preview
  const compact = options.compact ?? (paper === '58mm');
  const variant = options.variant ?? 'resto';

  const lineWidth = LINE_WIDTH[paper][font];

  // ===== hitung lebar kolom dinamis (RESTO) =====
  const COL_QTY_RESTO = compact ? 2 : 3;
  const maxUnit = Math.max(
    0,
    ...order.orderItems.map(i => Number((i as any).price ?? i.menuItem?.price ?? 0)),
    Number((order as any).totalPrice ?? 0)
  );
  const needed = money(maxUnit).length;
  const COL_TOTAL = clamp(needed + 1, compact ? 10 : 12, compact ? 12 : 15);
  const COL_GAP = 1;
  const COL_NAME_RESTO = Math.max(10, lineWidth - COL_QTY_RESTO - COL_GAP - COL_TOTAL - COL_GAP);

  // ===== kolom untuk DAPUR (QTY + MENU saja) =====
  const COL_QTY_KITCHEN = 3; // biar lega
  const COL_NAME_KITCHEN = Math.max(10, lineWidth - COL_QTY_KITCHEN - 1 /*gap*/);

  const divider = '-'.repeat(lineWidth);
  const strongLine = '='.repeat(lineWidth);

  // ===== Nama kasir =====
  const safeCashier = sanitize(
    cashierName?.includes('@') ? cashierName.split('@')[0] : cashierName
  ).slice(0, 40);

  let out = '';
  if (escpos) out += escposHeader(font);

  // ====== VARIANT: D A P U R  ======
  if (variant === 'dapur') {
    // Header hanya "DAPUR"
    if (escpos) out += alignCenter();
    out += (escpos ? 'DAPUR' : centerLine('DAPUR', lineWidth)) + '\n\n';
    if (escpos) out += alignLeft();

    // Info order — sesuai SS + tambahan Pre Order
    const labelRow = (label: string, value: string) => {
      const left = `${label.padEnd(12)}: `;
      const w = Math.max(1, lineWidth - left.length);
      const lines = wrapWords(value, w);
      let s = `${left}${lines[0]}\n`;
      for (let i = 1; i < lines.length; i++) s += ' '.repeat(left.length) + lines[i] + '\n';
      return s;
    };

    out += labelRow('No Order', `#${String(order.id).padStart(5, '0')}`);
    out += labelRow('Waktu', formatToWIB(order.createdAt));
    out += labelRow('Tipe', String(order.orderType).replace(/_/g, ' '));
    out += labelRow('Pre Order', getPreOrderText(order));
    if ((order as any).roomNumber) out += labelRow('Room', String((order as any).roomNumber));
    out += labelRow('Nama', sanitize((order as any).customerName || '-'));

    // Tabel item: Q + MENU + NOTE
    out += divider + '\n';
    const headQty = padRight('QTY', COL_QTY_KITCHEN);
    const headMenu = padRight('Menu', COL_NAME_KITCHEN);
    out += `${headQty} ${headMenu}\n`;
    out += divider + '\n';

    for (const it of order.orderItems) {
      const qtyStr = padRight(String(it.quantity), COL_QTY_KITCHEN);
      const nameLines = wrapWords(sanitize(it.menuItem?.name || ''), COL_NAME_KITCHEN);

      // baris pertama
      out += `${qtyStr} ${padRight(nameLines[0], COL_NAME_KITCHEN)}\n`;
      // lanjutan nama
      for (let i = 1; i < nameLines.length; i++) {
        out += `${' '.repeat(COL_QTY_KITCHEN)} ${padRight(nameLines[i], COL_NAME_KITCHEN)}\n`;
      }
      // Note di bawah item kalau ada
      const rawNote = (it as any).note ? `Note: ${sanitize((it as any).note)}` : '';
      if (rawNote) {
        const noteLines = wrapWords(rawNote, COL_NAME_KITCHEN);
        for (const nl of noteLines) {
          out += `${' '.repeat(COL_QTY_KITCHEN)} ${padRight(nl, COL_NAME_KITCHEN)}\n`;
        }
      }
    }

    out += strongLine + '\n\n';
    if (escpos) out += alignCenter();
    out += `Kasir: ${safeCashier || '-'}` + '\n';
    if (escpos) out += alignLeft();

    // selesai (DAPUR tidak ada total/payment/ucapan)
    out = out.replace(/\s+$/g, '');
    if (escpos) out += '\n\n' + '\x1D\x56\x00';
    return out;
  }

  // ====== VARIANT: R E S T O  (default) ======
  // Header toko lama (resort)
  const header = [
    'KIKI BEACH ISLAND RESORT',
    'Telp: +62 822-8923-0001',
    'Pasir Gelam, Karas, Pulau Galang',
    'Kota Batam, Kepulauan Riau 29486',
  ];
  if (escpos) out += alignCenter();
  for (const h of header) out += (escpos ? h : centerLine(h, lineWidth)) + '\n';
  if (escpos) out += alignLeft();

  // Info order (RESTO) + Pre Order
  const labelRow = (label: string, value: string) => {
    const left = `${label.padEnd(10)}: `;
    const w = Math.max(1, lineWidth - left.length);
    const lines = wrapWords(value, w);
    let s = `${left}${lines[0]}\n`;
    for (let i = 1; i < lines.length; i++) s += ' '.repeat(left.length) + lines[i] + '\n';
    return s;
  };

  out += strongLine + '\n';
  out += labelRow('Tanggal', formatToWIB(order.createdAt));
  out += labelRow('No. Order', `#${String(order.id).padStart(5, '0')}`);
  out += labelRow('Tipe', String(order.orderType).replace(/_/g, ' '));
  out += labelRow('Pre Order', getPreOrderText(order)); // ⬅ tambah di bawah Tipe
  if ((order as any).roomNumber) out += labelRow('Room', String((order as any).roomNumber));
  out += labelRow('Nama', sanitize((order as any).customerName || '-'));
  out += labelRow('Kasir', safeCashier || 'Kasir');

  // Tabel item (RESTO): Qty + Menu + Total/Unit
  out += divider + '\n';
  const headQtyR = padRight(compact ? 'Q' : 'Qty', COL_QTY_RESTO);
  const headMenuR = padRight('Menu', COL_NAME_RESTO);
  const headTotalR = padLeft(compact ? 'Harga' : 'Total', COL_TOTAL);
  out += `${headQtyR}${' '.repeat(COL_GAP)}${headMenuR}${' '.repeat(COL_GAP)}${headTotalR}\n`;
  out += divider + '\n';

  let totalItems = 0;
  for (const it of order.orderItems) {
    totalItems += it.quantity;
    const qtyStr = padRight(String(it.quantity), COL_QTY_RESTO);
    const unitPrice = Number((it as any).price ?? it.menuItem?.price ?? 0);
    const priceStr = padLeft(money(unitPrice), COL_TOTAL);
    const nameLines = wrapWords(sanitize(it.menuItem?.name || ''), COL_NAME_RESTO);

    out += `${qtyStr}${' '.repeat(COL_GAP)}${padRight(nameLines[0], COL_NAME_RESTO)}${' '.repeat(COL_GAP)}${priceStr}\n`;
    for (let i = 1; i < nameLines.length; i++) {
      out += `${' '.repeat(COL_QTY_RESTO)}${' '.repeat(COL_GAP)}${padRight(nameLines[i], COL_NAME_RESTO)}\n`;
    }
    const rawNote = (it as any).note ? `Note: ${sanitize((it as any).note)}` : '';
    if (rawNote) {
      const noteLines = wrapWords(rawNote, COL_NAME_RESTO);
      for (const nl of noteLines) {
        out += `${' '.repeat(COL_QTY_RESTO)}${' '.repeat(COL_GAP)}${padRight(nl, COL_NAME_RESTO)}\n`;
      }
    }
  }

  // Total & info pembayaran (RESTO)
  out += divider + '\n';
  out += labelRow('Item', String(totalItems));
  out += labelRow('Total', money(Number((order as any).totalPrice || 0)));
  out += labelRow('Bayar', String((order as any).paymentMethod || '-'));
  out += labelRow('Status', String((order as any).status || '-'));

  if (escpos) out += alignCenter();
  out += strongLine + '\n';
  out += (escpos ? 'Terima kasih atas kunjungannya!' : centerLine('Terima kasih atas kunjungannya!', lineWidth)) + '\n';
  out += strongLine + '\n';
  if (escpos) out += alignLeft();

  // Trim & feed/cut hanya saat CETAK
  out = out.replace(/\s+$/g, '');
  if (escpos) out += '\n\n' + '\x1D\x56\x00';

  return out;
}