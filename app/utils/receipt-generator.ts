import { Order, OrderItem } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ Base64 encoded PNG logo (resized 384px width, thermal printer friendly)
const LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAYAAAADdCAAAAACXy/r+AAAi50lEQVR4nO19eYxkW3nf7zv33LXWru6e3mfmvQePiNixQiDmeUlig+3IsZNYAiVKDALZCVEi4kVgHBbbLHnewCsytkOMTCKcWCEkQVZCCERgES8QHBswi9+8WXqb6aW6a7v7PV/+uPdWVXdXdddMb++9'; // Potong panjangnya kalau terlalu besar

// ✅ Konversi waktu ke WIB
function formatToWIB(dateInput: Date | string): string {
  return dayjs.utc(dateInput).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
}

// ✅ Fungsi pembuat struk
export function generateKikiRestaurantReceipt(
  order: Order & {
    orderItems: (OrderItem & {
      menuItem: {
        name: string;
        price: number;
      };
    })[];
  }
): string {
  const padRight = (text: string, width: number) => text.padEnd(width, ' ');
  const padLeft = (text: string, width: number) => text.padStart(width, ' ');
  const divider = '='.repeat(48);
  const subDivider = '-'.repeat(48);

  const centerText = (text: string) => {
    const lineWidth = 48;
    const leftPadding = Math.floor((lineWidth - text.length) / 2);
    return ' '.repeat(leftPadding) + text;
  };

  let result = '';

  result += `[img]${LOGO_BASE64}[/img]\n`;
  // Header informasi restoran
  result += centerText('KIKI RESTAURANT') + '\n';
  result += centerText('Telp: (0778) 123456') + '\n';
  result += centerText('Jl. Pantai Marina, Batam - 29467') + '\n';
  result += `${divider}\n`;
  result += `Tanggal   : ${formatToWIB(order.createdAt)}\n`;
  result += `No. Order : #${String(order.id).padStart(5, '0')}\n`;
  result += `Tipe Pesan: ${order.orderType.replace(/_/g, ' ')}\n`;
  if (order.roomNumber) result += `Room No.  : ${order.roomNumber}\n`;
  result += `Nama      : ${order.customerName}\n`;

  result += `${subDivider}\n`;
  result += `Qty  Menu${' '.repeat(30)}Total\n`;
  result += `${'-'.repeat(48)}\n`;

  let totalItems = 0;
  for (const item of order.orderItems) {
    totalItems += item.quantity;
    const name = item.menuItem.name;
    const price = item.price.toLocaleString('id-ID');
    result += `${padRight(String(item.quantity), 4)} ${padRight(name, 30)} Rp ${padLeft(price, 9)}\n`;
    if (item.note) {
      result += `      Note: ${item.note}\n`;
    }
  }

  result += `${subDivider}\n`;
  result += `Total Item  : ${totalItems}\n`;
  result += `Total Harga : Rp ${order.totalPrice.toLocaleString('id-ID')}\n`;
  result += `Metode Bayar: ${order.paymentMethod}\n`;
  result += `Status      : ${order.status}\n`;
  result += `${divider}\n`;
  result += centerText('Terima kasih atas kunjungannya!') + '\n';
  result += `${divider}\n`;

  // Tambahkan baris kosong agar kertas keluar cukup
  result += '\n\n\n';

  // Perintah potong kertas ESC/POS
  result += '\x1D\x56\x00'; // GS V 0 - full cut

  return result;
}
