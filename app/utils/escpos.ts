import escpos from 'escpos';
escpos.Network = require('escpos-network');

export function connectPrinter(ip: string, port = 9100) {
  const device = new escpos.Network(ip, port);
  const printer = new escpos.Printer(device);
  return { device, printer };
}
