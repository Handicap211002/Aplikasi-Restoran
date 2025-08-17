import { Order, OrderItem } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ===== Helpers waktu =====
function formatToWIB(dateInput: Date | string): string {
  return dayjs.utc(dateInput).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
}

// ====== NEW: opsi kertas & font ======
type Paper = '58mm' | '80mm';
type Font  = 'A' | 'B';

const LINE_WIDTH: Record<Paper, Record<Font, number>> = {
  // angka umum untuk ESC/POS: 58mm ≈ 32 (Font A) / 42 (Font B), 80mm ≈ 48 (A) / 64 (B)
  '58mm': { A: 32, B: 42 },
  '80mm': { A: 48, B: 64 },
};

type ReceiptOptions = {
  paper?: Paper;  // default '80mm'
  font?: Font;    // default 'A'
};

// ===== Helpers teks =====
const padRight = (s: string, w: number) => (s.length >= w ? s : s + ' '.repeat(w - s.length));
const padLeft  = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s);

function center(text: string, width: number) {
  if (text.length >= width) return text;
  const left = Math.floor((width - text.length) / 2);
  return ' '.repeat(left) + text;
}

function wrapWords(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line.length) {
      line = w;
      continue;
    }
    if ((line + ' ' + w).length <= width) {
      line += ' ' + w;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// ===== ESC/POS helpers (opsional, agar printer pakai font yang sesuai) =====
// ESC @ (init), ESC M n (font A/B), GS ! n (size normal)
function escposHeader(font: Font) {
  const ESC = '\x1B', GS = '\x1D';
  const init = ESC + '@';
  const setFont = ESC + 'M' + (font === 'A' ? '\x00' : '\x01'); // 0=A, 1=B
  const sizeNormal = GS + '!' + '\x00';
  return init + setFont + sizeNormal;
}

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

  // Kolom dinamis:
  const COL_QTY = 4;
  const COL_TOTAL = lineWidth <= 32 ? 10 : lineWidth <= 42 ? 11 : 12; // ruang untuk "Rp 123.456"
  const COL_GAP = 1;
  const COL_NAME = Math.max(10, lineWidth - COL_QTY - COL_GAP - COL_TOTAL - COL_GAP);

  const divider = '='.repeat(lineWidth);
  const subDivider = '-'.repeat(lineWidth);

  const money = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  let out = '';
  // Set font/size printer (bisa di-skip kalau RawBT mengabaikannya)
  out += escposHeader(font);

  out += center('KIKI BEACH ISLAND RESORT', lineWidth) + '\n';
  out += center('Telp: +62 822-8923-0001', lineWidth) + '\n';
  out += center('Pasir Gelam, Karas, Pulau Galang', lineWidth) + '\n';
  out += center('Kota Batam, Kepulauan Riau 29486', lineWidth) + '\n';

  out += divider + '\n';
  out += `Tanggal   : ${formatToWIB(order.createdAt)}\n`;
  out += `No. Order : #${String(order.id).padStart(5, '0')}\n`;
  out += `Tipe Pesan: ${order.orderType.replace(/_/g, ' ')}\n`;
  if (order.roomNumber) out += `Room No.  : ${order.roomNumber}\n`;
  out += `Nama      : ${order.customerName}\n`;
  out += `Kasir     : ${cashierName}\n`;

  out += subDivider + '\n';
  // header baris item
  const headQty = padRight('Qty', COL_QTY);
  const headMenu = padRight('Menu', COL_NAME);
  const headTotal = padLeft('Total', COL_TOTAL);
  out += `${headQty}${' '.repeat(COL_GAP)}${headMenu}${' '.repeat(COL_GAP)}${headTotal}\n`;
  out += subDivider + '\n';

  let totalItems = 0;

  for (const item of order.orderItems) {
    totalItems += item.quantity;

    const qtyStr = padRight(String(item.quantity), COL_QTY);
    const priceStr = padLeft(money(item.price), COL_TOTAL);

    // wrap nama menu
    const nameLines = wrapWords(item.menuItem.name, COL_NAME);

    // baris pertama (qty + name + total)
    out += `${qtyStr}${' '.repeat(COL_GAP)}${padRight(nameLines[0], COL_NAME)}${' '.repeat(COL_GAP)}${priceStr}\n`;

    // baris lanjutan untuk nama yang kepanjangan
    for (let i = 1; i < nameLines.length; i++) {
      out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nameLines[i], COL_NAME)}\n`;
    }

    // Note (dibungkus juga)
    if (item.note) {
      const noteLines = wrapWords(`Note: ${item.note}`, COL_NAME);
      for (const nl of noteLines) {
        out += `${' '.repeat(COL_QTY)}${' '.repeat(COL_GAP)}${padRight(nl, COL_NAME)}\n`;
      }
    }
  }

  out += subDivider + '\n';
  out += `Total Item  : ${totalItems}\n`;
  out += `Total Harga : ${money(order.totalPrice)}\n`;
  out += `Metode Bayar: ${order.paymentMethod}\n`;
  out += `Status      : ${order.status}\n`;
  out += divider + '\n';
  out += center('Terima kasih atas kunjungannya!', lineWidth) + '\n';
  out += divider + '\n';

  // feed extra lines biar kertas keluar
  out += '\n\n\n';
  // Full cut
  out += '\x1D\x56\x00';

  return out;
}