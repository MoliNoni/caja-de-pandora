import { bundleDiscount } from '../lib/bundle';

const pick = { bookId: 'b', vinylId: 'v', discount: 0.1 };
const book = { id: 'b', precio: 20, cantidad: 1 };
const record = { id: 'v', precio: 35.55, cantidad: 1 };

describe('bundleDiscount (mirrors place_order)', () => {
  it('takes 10% off a complete pair, rounded to cents', () => {
    expect(bundleDiscount([book, record], pick)).toBe(5.56);
  });

  it('counts only complete pairs', () => {
    expect(bundleDiscount([{ ...book, cantidad: 3 }, { ...record, cantidad: 2 }], pick)).toBeCloseTo(11.12);
  });

  it('gives nothing without the pair or without a server pick', () => {
    expect(bundleDiscount([book], pick)).toBe(0);
    expect(bundleDiscount([book, record], null)).toBe(0);
  });
});
