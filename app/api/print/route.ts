import { NextResponse } from 'next/server';
import net from 'net';

export async function POST(request: Request) {
  try {
    const { receiptText, target } = await request.json();

    if (!receiptText) {
      return NextResponse.json(
        { success: false, message: 'Receipt text is required' },
        { status: 400 }
      );
    }

    // Implementasi print ke printer jaringan
    const printerIP = target === 'kitchen' 
      ? process.env.KITCHEN_PRINTER_IP 
      : process.env.RESTAURANT_PRINTER_IP;

    if (!printerIP) {
      throw new Error('Printer IP not configured');
    }

    await printToPrinter(receiptText, printerIP);

    return NextResponse.json({
      success: true,
      message: 'Print command sent successfully'
    });

  } catch (error) {
    console.error('Print error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Print failed' },
      { status: 500 }
    );
  }
}

async function printToPrinter(text: string, ip: string, port = 9100): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.connect(port, ip, () => {
      socket.write(text, 'utf8', (err) => {
        socket.destroy();
        if (err) reject(err);
        else resolve();
      });
    });

    socket.on('error', reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}