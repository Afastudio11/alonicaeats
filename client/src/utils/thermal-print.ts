/**
 * Thermal receipt printing utility
 * Supports both Windows print dialog and direct Bluetooth printing
 */

// Web Bluetooth API Type Definitions
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
      getAvailability(): Promise<boolean>;
    };
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: {
      connected: boolean;
      connect(): Promise<{
        getPrimaryServices(): Promise<any[]>;
        getPrimaryService(service: string): Promise<{
          getCharacteristics(): Promise<any[]>;
          getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
        }>;
      }>;
      disconnect(): void;
    };
  }

  interface BluetoothRemoteGATTCharacteristic {
    properties: {
      write: boolean;
      writeWithoutResponse: boolean;
    };
    writeValue(value: Uint8Array): Promise<void>;
  }
}

// Global printer state
let connectedBluetoothDevice: BluetoothDevice | null = null;
let bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Escape HTML to prevent injection
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// Build simple HTML receipt
function buildReceiptHTML(order: any): string {
  const orderDate = new Date(order.createdAt);
  const orderTime = orderDate.toLocaleTimeString('id-ID');
  
  let itemsHTML = '';
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);
      itemsHTML += `
        <div class="item">
          <div style="display: flex; justify-content: space-between;">
            <span>${escapeHTML(item.name || 'Item')}</span>
            <span>${formatCurrency(itemTotal)}</span>
          </div>
          <div style="font-size: 10px; color: #666;">
            ${item.quantity || 0}x ${formatCurrency(item.price || 0)}
          </div>
          ${item.notes ? `<div style="font-size: 9px; color: #888; font-style: italic;">Catatan: ${escapeHTML(item.notes)}</div>` : ''}
        </div>
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.id?.slice(-6)?.toUpperCase() || 'ORDER'}</title>
        <style>
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: 240px;
            max-width: 300px;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .item {
            margin-bottom: 6px;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">Alonica Restaurant</div>
          <div>Jl. Ratulangi No.14, Bantaeng</div>
          <div>Telp: 0515-4545</div>
        </div>
        
        <div class="row">
          <span>Tanggal:</span>
          <span>${formatDate(orderDate)}</span>
        </div>
        <div class="row">
          <span>Waktu:</span>
          <span>${orderTime}</span>
        </div>
        <div class="row">
          <span>Customer:</span>
          <span>${escapeHTML(order.customerName || 'N/A')}</span>
        </div>
        <div class="row">
          <span>Meja:</span>
          <span>${escapeHTML(order.tableNumber || 'N/A')}</span>
        </div>
        <div class="row">
          <span>Order ID:</span>
          <span>#${escapeHTML(order.id?.slice(-8)?.toUpperCase() || 'N/A')}</span>
        </div>
        
        <div class="separator"></div>
        
        <div style="font-weight: bold; margin-bottom: 8px;">Detail Pesanan:</div>
        ${itemsHTML}
        
        <div class="separator"></div>
        
        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(order.subtotal || 0)}</span>
        </div>
        
        <div class="row total">
          <span>Total:</span>
          <span>${formatCurrency(order.total || 0)}</span>
        </div>
        
        <div class="separator"></div>
        
        <div class="row">
          <span>Metode Pembayaran:</span>
          <span>${order.paymentMethod === 'cash' ? 'TUNAI' : 'QRIS'}</span>
        </div>
        
        <div class="row">
          <span>Status:</span>
          <span>${order.status === 'completed' ? 'Selesai' : order.status === 'ready' ? 'Siap' : order.status === 'preparing' ? 'Diproses' : 'Pending'}</span>
        </div>
        
        <div class="footer">
          <div>Terima kasih telah berkunjung!</div>
          <div>Alonica Restaurant - Cita Rasa Nusantara</div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;
}

// ESC/POS Commands for thermal printers
const ESC = '\x1b';
const GS = '\x1d';

const ESC_POS_COMMANDS = {
  INIT: ESC + '@',                    // Initialize printer
  CENTER: ESC + 'a' + '\x01',         // Center align
  LEFT: ESC + 'a' + '\x00',           // Left align
  RIGHT: ESC + 'a' + '\x02',          // Right align
  BOLD_ON: ESC + 'E' + '\x01',        // Bold on
  BOLD_OFF: ESC + 'E' + '\x00',       // Bold off
  UNDERLINE_ON: ESC + '-' + '\x01',   // Underline on
  UNDERLINE_OFF: ESC + '-' + '\x00',  // Underline off
  DOUBLE_HEIGHT: GS + '!' + '\x01',   // Double height
  NORMAL_SIZE: GS + '!' + '\x00',     // Normal size
  CUT_PAPER: GS + 'V' + '\x42' + '\x00', // Cut paper
  LINE_FEED: '\n',
  FORM_FEED: '\x0c'
};

/**
 * Connect to Bluetooth thermal printer
 */
export async function connectBluetoothPrinter(): Promise<boolean> {
  try {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.');
      return false;
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Printer Service
        '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute Service
        '00001800-0000-1000-8000-00805f9b34fb'  // Generic Access Service
      ]
    });

    if (!device) return false;

    const server = await device.gatt?.connect();
    if (!server) return false;

    // Find writable characteristic
    const services = await server.getPrimaryServices();
    let characteristic = null;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          characteristic = char;
          break;
        }
      }
      if (characteristic) break;
    }

    if (characteristic) {
      connectedBluetoothDevice = device;
      bluetoothCharacteristic = characteristic;
      
      // Store connection info in localStorage
      localStorage.setItem('bluetooth_printer_connected', 'true');
      localStorage.setItem('bluetooth_printer_name', device.name || 'Unknown Printer');
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    alert('Gagal terhubung ke printer Bluetooth. Pastikan printer dalam mode pairing.');
    return false;
  }
}

/**
 * Check if Bluetooth printer is connected
 */
export function isBluetoothPrinterConnected(): boolean {
  return connectedBluetoothDevice !== null && bluetoothCharacteristic !== null;
}

/**
 * Get connected Bluetooth printer name
 */
export function getConnectedPrinterName(): string {
  return localStorage.getItem('bluetooth_printer_name') || 'No printer connected';
}

/**
 * Disconnect Bluetooth printer
 */
export function disconnectBluetoothPrinter(): void {
  if (connectedBluetoothDevice && connectedBluetoothDevice.gatt?.connected) {
    connectedBluetoothDevice.gatt.disconnect();
  }
  connectedBluetoothDevice = null;
  bluetoothCharacteristic = null;
  localStorage.removeItem('bluetooth_printer_connected');
  localStorage.removeItem('bluetooth_printer_name');
}

/**
 * Convert order to ESC/POS thermal printer commands
 */
function buildReceiptCommands(order: any): string {
  const orderDate = new Date(order.createdAt);
  
  let commands = '';
  
  // Initialize printer
  commands += ESC_POS_COMMANDS.INIT;
  
  // Header
  commands += ESC_POS_COMMANDS.CENTER;
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += ESC_POS_COMMANDS.DOUBLE_HEIGHT;
  commands += 'ALONICA RESTAURANT\n';
  commands += ESC_POS_COMMANDS.NORMAL_SIZE;
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += 'Jl. Ratulangi No.14, Bantaeng\n';
  commands += 'Telp: 0515-4545\n';
  commands += '================================\n';
  
  // Order info
  commands += ESC_POS_COMMANDS.LEFT;
  commands += `Tanggal: ${formatDate(orderDate)}\n`;
  commands += `Customer: ${order.customerName || 'N/A'}\n`;
  commands += `Meja: ${order.tableNumber || 'N/A'}\n`;
  commands += `Order ID: #${order.id?.slice(-8)?.toUpperCase() || 'N/A'}\n`;
  commands += '================================\n';
  
  // Items
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += 'DETAIL PESANAN:\n';
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += '--------------------------------\n';
  
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);
      const itemName = (item.name || 'Item').substring(0, 20);
      const qty = item.quantity || 0;
      const price = formatCurrency(item.price || 0);
      const total = formatCurrency(itemTotal);
      
      commands += `${itemName}\n`;
      commands += `  ${qty}x ${price}${' '.repeat(Math.max(0, 16 - total.length))}${total}\n`;
      
      if (item.notes) {
        commands += `  Catatan: ${item.notes}\n`;
      }
    });
  }
  
  commands += '--------------------------------\n';
  
  // Totals
  commands += `Subtotal:${' '.repeat(16)}${formatCurrency(order.subtotal || 0)}\n`;
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += `TOTAL:${' '.repeat(18)}${formatCurrency(order.total || 0)}\n`;
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += '================================\n';
  
  // Payment info
  commands += `Metode: ${order.paymentMethod === 'cash' ? 'TUNAI' : 'QRIS'}\n`;
  commands += `Status: ${order.status === 'completed' ? 'Selesai' : order.status === 'ready' ? 'Siap' : order.status === 'preparing' ? 'Diproses' : 'Pending'}\n`;
  commands += '================================\n';
  
  // Footer
  commands += ESC_POS_COMMANDS.CENTER;
  commands += '\nTerima kasih telah berkunjung!\n';
  commands += 'Alonica Restaurant\n';
  commands += 'Cita Rasa Nusantara\n';
  
  // Cut paper and feed
  commands += '\n\n\n';
  commands += ESC_POS_COMMANDS.CUT_PAPER;
  
  return commands;
}

/**
 * Print receipt via Bluetooth (direct printing)
 */
export async function printReceiptBluetooth(order: any): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    const connected = await connectBluetoothPrinter();
    if (!connected) {
      alert('Tidak dapat terhubung ke printer Bluetooth. Menggunakan print dialog Windows.');
      printReceipt(order);
      return false;
    }
  }

  try {
    const commands = buildReceiptCommands(order);
    const encoder = new TextEncoder();
    const data = encoder.encode(commands);
    
    await bluetoothCharacteristic!.writeValue(data);
    
    return true;
  } catch (error) {
    console.error('Bluetooth print error:', error);
    alert('Error saat print via Bluetooth. Menggunakan print dialog.');
    printReceipt(order);
    return false;
  }
}

/**
 * Simple receipt printing - open new window and print (fallback)
 */
export function printReceipt(order: any): void {
  try {
    const receiptHTML = buildReceiptHTML(order);
    const printWindow = window.open('', '_blank', 'width=300,height=600,scrollbars=yes');
    
    if (!printWindow) {
      alert('Print blocked! Please allow popups for this site.');
      return;
    }
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  } catch (error) {
    console.error('Print error:', error);
    alert('Error saat print. Silakan coba lagi.');
  }
}

/**
 * Smart print function - tries Bluetooth first, fallback to Windows dialog
 */
export async function smartPrintReceipt(order: any): Promise<void> {
  if (isBluetoothPrinterConnected()) {
    const success = await printReceiptBluetooth(order);
    if (success) {
      return; // Success with Bluetooth
    }
  }
  
  // Fallback to Windows print dialog
  printReceipt(order);
}

// Legacy functions for compatibility (deprecated)
export type ThermalPaperSize = '58mm' | '80mm';

export function getThermalPreference(): ThermalPaperSize {
  const saved = localStorage.getItem('alonica-thermal-size');
  return saved === '58mm' ? '58mm' : '80mm';
}

export function saveThermalPreference(paperSize: ThermalPaperSize): void {
  localStorage.setItem('alonica-thermal-size', paperSize);
}

/**
 * Build kitchen ticket HTML for printing
 */
function buildKitchenTicketHTML(order: any, station?: string, filteredItems?: any[]): string {
  const orderDate = new Date(order.createdAt);
  const stationName = station === 'bar' ? 'BAR' : 'KITCHEN';
  const itemsLabel = station === 'bar' ? 'DRINKS TO PREPARE:' : 'ITEMS TO PREPARE:';
  const copyLabel = station === 'bar' ? '** BAR COPY **' : '** KITCHEN COPY **';
  const instructions = station === 'bar' ? 'Please prepare drinks as ordered' : 'Please prepare items as ordered';
  
  // Use filtered items if provided, otherwise use all items
  const itemsToShow = filteredItems || order.items || [];
  
  let itemsHTML = '';
  itemsToShow.forEach((item: any) => {
    itemsHTML += `
      <div class="item">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${item.quantity}x ${escapeHTML(item.name || 'Item')}</span>
        </div>
        ${item.notes ? `<div style="font-size: 10px; color: #666; font-style: italic; margin-top: 2px;">Note: ${escapeHTML(item.notes)}</div>` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Kitchen Ticket #${order.id?.slice(-6)?.toUpperCase() || 'ORDER'}</title>
        <style>
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: 280px;
            max-width: 320px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .station-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .copy-label {
            font-size: 12px;
            font-weight: bold;
            margin-top: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 12px;
          }
          .item {
            margin-bottom: 12px;
            padding: 8px;
            border: 1px dashed #666;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 12px 0;
          }
          .instructions {
            text-align: center;
            font-size: 11px;
            margin-top: 12px;
            border: 1px solid #000;
            padding: 6px;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="station-name">ALONICA ${stationName}</div>
          <div>${stationName} ORDER TICKET</div>
          <div class="copy-label">${copyLabel}</div>
        </div>
        
        <div class="row">
          <span>Order ID:</span>
          <span style="font-weight: bold;">${order.id?.slice(-8) || 'N/A'}</span>
        </div>
        <div class="row">
          <span>Customer:</span>
          <span style="font-weight: bold;">${escapeHTML(order.customerName || 'N/A')}</span>
        </div>
        <div class="row">
          <span>Table:</span>
          <span style="font-weight: bold;">${escapeHTML(order.tableNumber || 'N/A')}</span>
        </div>
        <div class="row">
          <span>Time:</span>
          <span>${formatDate(orderDate)}</span>
        </div>
        
        <div class="separator"></div>
        
        <div style="font-weight: bold; margin-bottom: 8px;">${itemsLabel}</div>
        ${itemsHTML}
        
        <div class="instructions">
          ${instructions}
        </div>
        
        <div class="footer">
          <div>Kitchen Ticket - ${new Date().toLocaleTimeString('id-ID')}</div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;
}

/**
 * Convert order to ESC/POS kitchen ticket commands
 */
function buildKitchenTicketCommands(order: any, station?: string, filteredItems?: any[]): string {
  const orderDate = new Date(order.createdAt);
  const stationName = station === 'bar' ? 'BAR' : 'KITCHEN';
  const itemsLabel = station === 'bar' ? 'DRINKS TO PREPARE:' : 'ITEMS TO PREPARE:';
  const copyLabel = station === 'bar' ? '** BAR COPY **' : '** KITCHEN COPY **';
  
  const itemsToShow = filteredItems || order.items || [];
  
  let commands = '';
  
  // Initialize printer
  commands += ESC_POS_COMMANDS.INIT;
  
  // Header
  commands += ESC_POS_COMMANDS.CENTER;
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += ESC_POS_COMMANDS.DOUBLE_HEIGHT;
  commands += `ALONICA ${stationName}\n`;
  commands += ESC_POS_COMMANDS.NORMAL_SIZE;
  commands += `${stationName} ORDER TICKET\n`;
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += copyLabel + '\n';
  commands += '================================\n';
  
  // Order info
  commands += ESC_POS_COMMANDS.LEFT;
  commands += `Order ID: ${order.id?.slice(-8) || 'N/A'}\n`;
  commands += `Customer: ${order.customerName || 'N/A'}\n`;
  commands += `Table: ${order.tableNumber || 'N/A'}\n`;
  commands += `Time: ${formatDate(orderDate)}\n`;
  commands += '================================\n';
  
  // Items
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += itemsLabel + '\n';
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += '--------------------------------\n';
  
  itemsToShow.forEach((item: any) => {
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += `${item.quantity}x ${item.name || 'Item'}\n`;
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    
    if (item.notes) {
      commands += `Note: ${item.notes}\n`;
    }
    commands += '--------------------------------\n';
  });
  
  // Instructions
  commands += ESC_POS_COMMANDS.CENTER;
  commands += '********************************\n';
  commands += station === 'bar' ? 'Please prepare drinks as ordered\n' : 'Please prepare items as ordered\n';
  commands += '********************************\n';
  
  // Footer
  commands += ESC_POS_COMMANDS.CENTER;
  commands += `Kitchen Ticket - ${new Date().toLocaleTimeString('id-ID')}\n`;
  
  // Cut paper and feed
  commands += '\n\n\n';
  commands += ESC_POS_COMMANDS.CUT_PAPER;
  
  return commands;
}

/**
 * Print kitchen ticket via Bluetooth (direct printing)
 */
export async function printKitchenTicketBluetooth(order: any, station?: string, filteredItems?: any[]): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    const connected = await connectBluetoothPrinter();
    if (!connected) {
      alert('Tidak dapat terhubung ke printer Bluetooth. Menggunakan print dialog Windows.');
      printKitchenTicket(order, station, filteredItems);
      return false;
    }
  }

  try {
    const commands = buildKitchenTicketCommands(order, station, filteredItems);
    const encoder = new TextEncoder();
    const data = encoder.encode(commands);
    
    await bluetoothCharacteristic!.writeValue(data);
    
    return true;
  } catch (error) {
    console.error('Bluetooth kitchen print error:', error);
    alert('Error saat print kitchen ticket via Bluetooth. Menggunakan print dialog.');
    printKitchenTicket(order, station, filteredItems);
    return false;
  }
}

/**
 * Print kitchen ticket for specific station (fallback)
 */
export function printKitchenTicket(order: any, station?: string, filteredItems?: any[]): void {
  try {
    const ticketHTML = buildKitchenTicketHTML(order, station, filteredItems);
    const printWindow = window.open('', '_blank', 'width=320,height=600,scrollbars=yes');
    
    if (!printWindow) {
      alert('Print blocked! Please allow popups for this site.');
      return;
    }
    
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
  } catch (error) {
    console.error('Kitchen ticket print error:', error);
    alert('Error saat print kitchen ticket. Silakan coba lagi.');
  }
}

/**
 * Smart kitchen print function - tries Bluetooth first, fallback to Windows dialog
 */
export async function smartPrintKitchenTicket(order: any, station?: string, filteredItems?: any[]): Promise<void> {
  if (isBluetoothPrinterConnected()) {
    const success = await printKitchenTicketBluetooth(order, station, filteredItems);
    if (success) {
      return; // Success with Bluetooth
    }
  }
  
  // Fallback to Windows print dialog
  printKitchenTicket(order, station, filteredItems);
}

// Redirect old function to new kitchen print
export function printWithThermalSettings(_paperSize?: ThermalPaperSize): void {
  // This function is now deprecated and should not be used
  // Kitchen printing should use printKitchenTicket directly
  alert('Please use the dedicated kitchen ticket printing system.');
}