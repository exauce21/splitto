import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {
    //
    it('devrait permettre de régler un simple solde entre deux personnes en une seule opération', () => {
        const result = simplifyDebts({ a: 10, b: -10 });
        expect(result).toEqual([
        { from: 'b', to: 'a', amount: 10 }
        ]);
    });

    it('devrait régler un triangle avec une seule opération', () => {
        const result = simplifyDebts({ a: 10, b: 0, c: -10 });
        expect(result).toEqual([
        { from: 'c', to: 'a', amount: 10 }
        ]);
    });

    it('devrait régler une dette circulaire avec le nombre minimum de règlements', () => {
        const result = simplifyDebts({ a: 30, b: -20, c: -10, d: 0 });
        expect(result).toEqual([
        { from: 'b', to: 'a', amount: 20 },
        { from: 'c', to: 'a', amount: 10 }
        ]);
    });

    it('devrait retourner une liste vide lorsque les soldes sont déjà équilibrés', () => {
        expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
    });

    it('devrait utiliser le nombre minimum de règlements pour des soldes mixtes', () => {
        const result = simplifyDebts({ a: 20, b: -5, c: -15 });
        expect(result).toEqual([
        { from: 'c', to: 'a', amount: 15 },
        { from: 'b', to: 'a', amount: 5 }
        ]);
    });
});