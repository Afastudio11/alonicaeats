export const MENU_CATEGORIES = {
  food: 'Makanan',
  drink: 'Minuman'
} as const;

export const ORDER_STATUSES = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed'
} as const;

export const PAYMENT_METHODS = {
  cash: 'Cash',
  qris: 'QRIS'
} as const;

export const INVENTORY_CATEGORIES = [
  'Bahan Pokok',
  'Protein',
  'Bumbu & Minyak',
  'Dairy',
  'Minuman'
] as const;

export const SAMPLE_QRIS_CODE = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021226610014ID.CO.QRIS.WWW0215ID1234567890123450303UMI51440014ID.CO.QRIS.WWW0215ID1234567890123450303UMI520454995802ID5914Merchant%20Name6007Jakarta61051234562070703A0163040B1D";
