import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {
  it('should settle a simple 2-person balance with one settlement', () => {
    const result = simplifyDebts({ a: 10, b: -10 });

    expect(result).toEqual([
      { from: 'b', to: 'a', amount: 10 }
    ]);
  });

  it('should settle a triangle with a single settlement', () => {
    const result = simplifyDebts({ a: 10, b: 0, c: -10 });

    expect(result).toEqual([
      { from: 'c', to: 'a', amount: 10 }
    ]);
  });

  it('should settle a circular debt with the minimum number of settlements', () => {
    const result = simplifyDebts({ a: 30, b: -20, c: -10, d: 0 });

    expect(result).toEqual([
      { from: 'b', to: 'a', amount: 20 },
      { from: 'c', to: 'a', amount: 10 }
    ]);
  });

  it('should return an empty list when balances are already balanced', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it('should use the minimum number of settlements for mixed balances', () => {
    const result = simplifyDebts({ a: 20, b: -5, c: -15 });

    expect(result).toEqual([
      { from: 'c', to: 'a', amount: 15 },
      { from: 'b', to: 'a', amount: 5 }
    ]);
  });
});