export const money = (value: number, currency = 'NGN') =>
  currency.toUpperCase() === 'NGN' ? `₦${value.toLocaleString()}` : `${currency.toUpperCase()} ${value.toLocaleString()}`;
