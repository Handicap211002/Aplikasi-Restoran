// receipt-generator.ts
import { Order, OrderItem } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ================== Waktu ==================
function formatToWIB(dateInput: Date | string): string {
  return dayjs.utc(dateInput).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
}

// ================== Opsi kertas & font ==================
type Paper = '58mm' | '80mm';
type Font  = 'A' | 'B';

// Perkiraan kolom yang umum di printer ESC/POS
const LINE_WIDTH: Record<Paper, Record<Font, number>> = {
  '58mm': { A: 32, B: 42 },
  '80mm': { A: 48, B: 64 },
};

// ================== Helpers teks ==================
const padRight = (s: string, w: number) => (s.length >= w ? s : s + ' '.repeat(w - s.length));
const padLeft  = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s);

function wrapWords(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line.length) line = w;
    else if ((line + ' ' + w).length <= width) line += ' ' + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function money(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

// label: value yang auto-wrap dan di-indent rapi
function labelValue(label: string, value: string, lineWidth: number) {
  const left = `${label.padEnd(10)}: `;            // "Tanggal   : "
  const rightWidth = Math.max(1, lineWidth - left.length);
  const lines = wrapWords(value, rightWidth);
  let out = `${left}${lines[0]}\n`;
  for (let i = 1; i < lines.length; i++) out += `${' '.repeat(left.length)}${lines[i]}\n`;
  return out;
}

// Sanitasi input bebas user (hindari control char aneh)
function sanitize(text: string) {
  return String(text ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');
}

// ================== ESC/POS helpers ==================
const ESC = '\x1B';
const GS  = '\x1D';
const alignLeft   = () => ESC + 'a' + '\x00';
const alignCenter = () => ESC + 'a' + '\x01';

// Init printer + pilih font A/B, ukuran normal
function escposHeader(font: Font) {
  const init = ESC + '@';
  const setFont = ESC + 'M' + (font === 'A' ? '\x00' : '\x01'); // 0=A, 1=B
  const sizeNormal = GS + '!' + '\x00';
  return init + setFont + sizeNormal;
}

// ================== Generator Struk ==================
type ReceiptOptions = { paper?: Paper; font?: Font };

export function generateKikiRestaurantReceipt(
  order: Order & {
    orderItems: (OrderItem & { menuItem: { name: string; price: number } })[];
  },
  cashierName: string,
  options: ReceiptOptions = {}
): string {
  const paper = options.paper ?? '80mm';
  const font  = options.font ?? 'A';
  const lineWidth = LINE_WIDTH[paper][font];

  // Layout kolom dinamis
  const COL_QTY   = 4;
  const COL_TOTAL = lineWidth <= 32 ? 10 : lineWidth <= 42 ? 11 : 12; // ruang "Rp 123.456"
  const COL_GAP   = 1;
  const COL_NAME  = Math.max(10, lineWidth - COL_QTY - COL_GAP - COL_TOTAL - COL_GAP);

  const divider    = '='.repeat(lineWidth);
  const subDivider = '-'.repeat(lineWidth);

  // Siapkan nama kasir yang rapi (displayName dulu, kalau email pakai bagian sebelum "@")
  const safeCashier = sanitize(
    cashierName?.includes('@') ? cashierName.split('@')[0] : cashierName
  ).slice(0, 40);

  let out = '';
  out += escposHeader(font);

  // ---------- HEADER (center + auto-wrap) ----------
  out += alignCenter();
  for (const l of wrapWords('KIKI BEACH ISLAND RESORT', lineWidth)) out += l + '\n';
  for (const l of wrapWords('Telp: +62 822-8923-0001', lineWidth)) out += l + '\n';
  for (const l of wrapWords('Pasir Gelam, Karas, Pulau Galang', lineWidth)) out += l + '\n';
  for (const l of wrapWords('Kota Batam, Kepulauan Riau 29486', lineWidth)) out += l + '\n';
  out += alignLeft();

  // ---------- Info Order ----------
  out += divider + '\n';
  out += labelValue('Tanggal',   formatToWIB(order.createdAt), lineWidth);
  out += labelValue('No. Order', `#${String(order.id).padStart(5, '0')}`, lineWidth);
  out += labelValue('Tipe Pesan', String(order.orderType).replace(/_/g, ' '), lineWidth);
  if (order.roomNumber) out += labelValue('Room No.', String(order.roomNumber), lineWidth);
  out += labelValue('Nama',  sanitize(order.customerName || '-'), lineWidth);
  out += labelValue('Kasir', safeCashier || 'Kasir', lineWidth);

  // ---------- Tabel item ----------
  out += subDivider + '\n';
  const headQty   = padRight('Qty', COL_QTY);
  const headMenu  = padRight('Menu', COL_NAME);
  const headTotal = padLeft('Total', COL_TOTAL);
  out += `${headQty}${' '.repeat(COL_GAP)}${headMenu}${' '.repeat(COL_GAP)}${headTotal}\n`;
  out += subDivider + '\n';

  let totalItems = 0;

  for (const item of order.orderItems) {
    totalItems += item.quantity;

    const qtyStr    = padRight(String(item.quantity), COL_QTY);
    const unitPrice = Number((item as any).price ?? item.menuItem?.price ?? 0);
    const priceStr  = padLeft(money(unitPrice), COL_TOTAL);

    const nameLines = wrapWords(sanitize(item.menuItem?.name || ''), COL_NAME);

    // baris pertama (qty + nama + harga satuan)
    out += `${qtyStr}${' '.repeat(COL_GAP)}${padRight(nameLines[0], COL_NAME)}${' '.repeat(COL_GAP)}${priceStr}\n`;

    // baris lanjutan untuk nama panjang
    for (let i = 1; i < nameLines.length; i++) {
      out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nameLines[i], COL_NAME)}\n`;
    }

    // Note (jika ada) ikut di-wrap + indent
    const rawNote = (item as any).note ? `Note: ${sanitize((item as any).note)}` : '';
    if (rawNote) {
      const noteLines = wrapWords(rawNote, COL_NAME);
      for (const nl of noteLines) {
        out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nl, COL_NAME)}\n`;
      }
    }
  }

  // ---------- Total ----------
  out += subDivider + '\n';
  out += labelValue('Total Item',  String(totalItems), lineWidth);
  out += labelValue('Total Harga', money(Number((order as any).totalPrice || 0)), lineWidth);
  out += labelValue('Metode Bayar', String(order.paymentMethod || '-'), lineWidth);
  out += labelValue('Status', String(order.status || '-'), lineWidth);

  out += divider + '\n';
  out += alignCenter() + wrapWords('Terima kasih atas kunjungannya!', lineWidth).join('\n') + '\n' + alignLeft();
  out += divider + '\n';

  // feed extra lines biar kertas keluar, lalu full cut
  out += '\n\n\n' + '\x1D\x56\x00';
  return out;
}