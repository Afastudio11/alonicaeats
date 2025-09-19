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
          margin: 2mm;
        }
        
        /* Hide everything first */
        html, body, body * {
          visibility: hidden !important;
          position: static !important;
        }
        
        /* Show only receipt content */
        .customer-receipt {
          visibility: visible !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 54mm !important;
          font-size: 9px !important;
          line-height: 1.2 !important;
          padding: 2mm !important;
          margin: 0 !important;
          background: white !important;
          color: black !important;
        }
        
        .customer-receipt * {
          visibility: visible !important;
          font-size: inherit !important;
          color: black !important;
          background: transparent !important;
        }
        
        /* Hide dialog elements */
        .print-hide, [role="dialog"], .fixed, .absolute {
          display: none !important;
        }
        
        /* Receipt-specific styling */
        .customer-receipt h2 {
          font-size: 12px !important;
          font-weight: bold !important;
          margin: 0 0 2px 0 !important;
        }
        
        .customer-receipt h3 {
          font-size: 10px !important;
          font-weight: bold !important;
          margin: 2px 0 !important;
        }
        
        .customer-receipt .text-sm {
          font-size: 8px !important;
        }
        
        .customer-receipt .text-xs {
          font-size: 7px !important;
        }
      }
    `;
  } else {
    // 80mm is default, but we can still inject it explicitly
    style.textContent = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 3mm;
        }
        
        /* Hide everything first */
        html, body, body * {
          visibility: hidden !important;
          position: static !important;
        }
        
        /* Show only receipt content */
        .customer-receipt {
          visibility: visible !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 74mm !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          padding: 3mm !important;
          margin: 0 !important;
          background: white !important;
          color: black !important;
        }
        
        .customer-receipt * {
          visibility: visible !important;
          font-size: inherit !important;
          color: black !important;
          background: transparent !important;
        }
        
        /* Hide dialog elements */
        .print-hide, [role="dialog"], .fixed, .absolute {
          display: none !important;
        }
        
        /* Receipt-specific styling */
        .customer-receipt h2 {
          font-size: 14px !important;
          font-weight: bold !important;
          margin: 0 0 3px 0 !important;
        }
        
        .customer-receipt h3 {
          font-size: 12px !important;
          font-weight: bold !important;
          margin: 3px 0 !important;
        }
        
        .customer-receipt .text-sm {
          font-size: 10px !important;
        }
        
        .customer-receipt .text-xs {
          font-size: 9px !important;
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