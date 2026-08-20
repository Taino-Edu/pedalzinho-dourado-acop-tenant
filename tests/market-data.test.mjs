import { describe, expect, it } from 'vitest';
import { annualToMonthlyRate, parseBrazilianCurrency, pricePayment, analyzeFinancing, normalizeVehicleType } from '../api/_lib/marketData.js';

describe('dados de mercado e financiamento', () => {
  it('separa carros e motos para a consulta FIPE', () => {
    expect(normalizeVehicleType('car')).toBe('car');
    expect(normalizeVehicleType('motorcycle')).toBe('motorcycle');
    expect(normalizeVehicleType('motos')).toBe('motorcycle');
    expect(normalizeVehicleType('valor-invalido')).toBe('car');
  });
  it('converte o valor brasileiro da FIPE para centavos', () => {
    expect(parseBrazilianCurrency('R$ 119.329,00')).toBe(11932900);
  });

  it('converte a taxa anual para a taxa mensal equivalente', () => {
    expect(annualToMonthlyRate(24.36)).toBeCloseTo(1.833, 2);
  });

  it('calcula uma prestação pela Tabela Price', () => {
    expect(pricePayment(8400000, 1.83, 48)).toBeCloseTo(264469, -2);
  });

  it('calcula diferença para FIPE e LTV', () => {
    const result = analyzeFinancing({ askingPrice: 10500000, fipePrice: 10000000, downPaymentPercent: 20, annualRate: 24.36 });
    expect(result.priceDifferencePercent).toBeCloseTo(5);
    expect(result.ltvPercent).toBeCloseTo(84);
    expect(result.risk).toBe('moderado');
    expect(result.installments).toHaveLength(6);
    expect(result.installments.at(-1).months).toBe(72);
  });
});
