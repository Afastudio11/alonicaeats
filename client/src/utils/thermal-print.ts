/**
 * Simple thermal receipt printing utility
 * No complex CSS - just open new window and print plain HTML
 */

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

/**
 * Simple receipt printing - open new window and print
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

// Legacy functions for compatibility (deprecated)
export type ThermalPaperSize = '58mm' | '80mm';

export function getThermalPreference(): ThermalPaperSize {
  const saved = localStorage.getItem('alonica-thermal-size');
  return saved === '58mm' ? '58mm' : '80mm';
}

export function saveThermalPreference(paperSize: ThermalPaperSize): void {
  localStorage.setItem('alonica-thermal-size', paperSize);
}

// Redirect old function to new simple print
export function printWithThermalSettings(_paperSize?: ThermalPaperSize): void {
  alert('Please use the new simple print system.');
}