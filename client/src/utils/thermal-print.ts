/**
 * Thermal printer utility functions
 * Handles dynamic paper size switching for different thermal printer widths
 */

export type ThermalPaperSize = '58mm' | '80mm';

/**
 * Inject thermal printer CSS rules dynamically before printing
 */
export function injectThermalCSS(paperSize: ThermalPaperSize): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = 'thermal-print-css';
  
  if (paperSize === '58mm') {
    style.textContent = `
      @media print {
        @page {
          size: 58mm auto;
          margin: 1mm 2mm; /* Smaller margins for 58mm */
        }
        .kitchen-ticket, .customer-receipt, .admin-receipt {
          font-size: 10px !important;
          padding: 4px !important;
        }
        .receipt-header {
          font-size: 11px !important;
        }
        .receipt-total {
          font-size: 11px !important;
        }
      }
    `;
  } else {
    // 80mm is default, but we can still inject it explicitly
    style.textContent = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 2mm 3mm;
        }
      }
    `;
  }
  
  document.head.appendChild(style);
  return style;
}

/**
 * Remove thermal printer CSS injection
 */
export function removeThermalCSS(): void {
  const existingStyle = document.getElementById('thermal-print-css');
  if (existingStyle) {
    existingStyle.remove();
  }
}

/**
 * Print with thermal printer settings
 */
export function printWithThermalSettings(paperSize: ThermalPaperSize = '80mm'): void {
  // Clean up any existing thermal CSS
  removeThermalCSS();
  
  // Inject new thermal CSS
  injectThermalCSS(paperSize);
  
  // Print
  window.print();
  
  // Clean up after printing
  setTimeout(() => {
    removeThermalCSS();
  }, 1000);
}

/**
 * Get user's saved thermal printer preference
 */
export function getThermalPreference(): ThermalPaperSize {
  const saved = localStorage.getItem('alonica-thermal-size');
  return saved === '58mm' ? '58mm' : '80mm';
}

/**
 * Save user's thermal printer preference
 */
export function saveThermalPreference(paperSize: ThermalPaperSize): void {
  localStorage.setItem('alonica-thermal-size', paperSize);
}