import { describe, expect, it } from 'vitest';
import commission from '../api/_lib/commission.js';

const { calculateCommissionCents } = commission;

describe('cálculo de comissão', () => {
  it('calcula 1,5% sobre uma venda de R$ 100.000', () => {
    expect(calculateCommissionCents(10_000_000, 1.5)).toBe(150_000);
  });

  it('soma sobre o valor em centavos sem perder precisão', () => {
    expect(calculateCommissionCents(8_977_900, 2)).toBe(179_558);
  });

  it('retorna zero para valor ou percentual inválido', () => {
    expect(calculateCommissionCents(0, 1.5)).toBe(0);
    expect(calculateCommissionCents(10_000_000, 0)).toBe(0);
  });
});
