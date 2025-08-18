// utils/receipt-generator.ts
import { Order, OrderItem } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc); dayjs.extend(timezone);

function formatToWIB(dateInput: Date | string): string {
  return dayjs.utc(dateInput).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
}

type Paper = '58mm' | '80mm';
type Font  = 'A' | 'B';

const LINE_WIDTH: Record<Paper, Record<Font, number>> = {
  '58mm': { A: 32, B: 42 },
  '80mm': { A: 48, B: 64 },
};

const ESC = '\x1B';
const GS  = '\x1D';
const alignLeft   = () => ESC + 'a' + '\x00';
const alignCenter = () => ESC + 'a' + '\x01';
const escposHeader = (font: Font) => ESC + '@' + ESC + 'M' + (font === 'A' ? '\x00' : '\x01') + GS + '!' + '\x00';

const padRight = (s: string, w: number) => (s.length >= w ? s : s + ' '.repeat(w - s.length));
const padLeft  = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s);
const clamp    = (n: number, a: number, b: number) => Math.max(a, Math.min(n, b));
const money    = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
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

type ReceiptOptions = {
  paper?: Paper;
  font?: Font;
  escpos?: boolean;   // true = pakai ESC/POS align; false = preview (center pakai spasi)
  compact?: boolean;  // true = mode 58mm Restoran (lebih hemat)
};

export function generateKikiRestaurantReceipt(
  order: Order & { orderItems: (OrderItem & { menuItem: { name: string; price: number } })[]; },
  cashierName: string,
  options: ReceiptOptions = {}
): string {
  const paper  = options.paper  ?? '80mm';
  const font   = options.font   ?? 'A';
  const escpos = options.escpos ?? false;
  const compact = options.compact ?? (paper === '58mm');

  const lineWidth = LINE_WIDTH[paper][font];

  // ===== hitung lebar kolom dinamis =====
  const COL_QTY = compact ? 2 : 3;               // 58mm dipersingkat
  const maxUnit = Math.max(
    0,
    ...order.orderItems.map(i => Number((i as any).price ?? i.menuItem?.price ?? 0)),
    Number((order as any).totalPrice ?? 0)
  );
  // Lebar kolom total disesuaikan dengan panjang angka terbesar, dibatasi rentang aman
  const needed = money(maxUnit).length;          // e.g. "Rp 1.000.000" -> 12–14
  const COL_TOTAL = clamp(needed + 1, compact ? 10 : 12, compact ? 12 : 15);
  const COL_GAP = 1;
  const COL_NAME = Math.max(10, lineWidth - COL_QTY - COL_GAP - COL_TOTAL - COL_GAP);

  const divider    = '-'.repeat(lineWidth);
  const strongLine = '='.repeat(lineWidth);

  // ===== Nama kasir rapi =====
  const safeCashier = sanitize(
    cashierName?.includes('@') ? cashierName.split('@')[0] : cashierName
  ).slice(0, 40);

  let out = '';
  if (escpos) out += escposHeader(font);

  // ===== HEADER toko (center di preview & cetak) =====
  const header = [
    'KIKI BEACH ISLAND RESORT',
    'Pasir Gelam, Karas, Pulau Galang',
    'Kota Batam, Kepulauan Riau 29486',
  ];
  if (!compact) header.splice(1, 0, 'Telp: +62 822-8923-0001'); // tampilkan telp hanya non-compact

  if (escpos) out += alignCenter();
  for (const h of header) out += (escpos ? h : centerLine(h, lineWidth)) + '\n';
  if (escpos) out += alignLeft();

  // ===== Info order (label:auto wrap) =====
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
  if (order.roomNumber) out += labelRow('Room', String(order.roomNumber));
  out += labelRow('Nama', sanitize(order.customerName || '-'));
  out += labelRow('Kasir', safeCashier || 'Kasir');

  // ===== Tabel item =====
  out += divider + '\n';
  const headQty   = padRight(compact ? 'Q' : 'Qty', COL_QTY);
  const headMenu  = padRight('Menu', COL_NAME);
  const headTotal = padLeft(compact ? 'Harga' : 'Total', COL_TOTAL);
  out += `${headQty}${' '.repeat(COL_GAP)}${headMenu}${' '.repeat(COL_GAP)}${headTotal}\n`;
  out += divider + '\n';

  let totalItems = 0;
  for (const it of order.orderItems) {
    totalItems += it.quantity;
    const qtyStr    = padRight(String(it.quantity), COL_QTY);
    const unitPrice = Number((it as any).price ?? it.menuItem?.price ?? 0);
    const priceStr  = padLeft(money(unitPrice), COL_TOTAL); // sudah dipastikan muat

    const nameLines = wrapWords(sanitize(it.menuItem?.name || ''), COL_NAME);

    // baris 1: qty + nama + harga
    out += `${qtyStr}${' '.repeat(COL_GAP)}${padRight(nameLines[0], COL_NAME)}${' '.repeat(COL_GAP)}${priceStr}\n`;

    // nama lanjutan
    for (let i = 1; i < nameLines.length; i++) {
      out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nameLines[i], COL_NAME)}\n`;
    }

    // Note tetap ditampilkan pada mode Restoran
    const rawNote = (it as any).note ? `Note: ${sanitize((it as any).note)}` : '';
    if (rawNote && compact) {
      const noteLines = wrapWords(rawNote, COL_NAME);
      for (const nl of noteLines) {
        out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nl, COL_NAME)}\n`;
      }
    }
  }

  // ===== Total =====
  out += divider + '\n';
  out += labelRow('Item', String(totalItems));
  out += labelRow('Total', money(Number((order as any).totalPrice || 0)));
  out += labelRow('Bayar', String(order.paymentMethod || '-'));
  out += labelRow('Status', String(order.status || '-'));

  if (escpos) out += alignCenter();
  out += (escpos ? strongLine : strongLine) + '\n';
  out += (escpos ? 'Terima kasih atas kunjungannya!' : centerLine('Terima kasih atas kunjungannya!', lineWidth)) + '\n';
  out += strongLine + '\n';
  if (escpos) out += alignLeft();

  // feed & cut
  out += '\n\n\n' + '\x1D\x56\x00';
  return out;
}