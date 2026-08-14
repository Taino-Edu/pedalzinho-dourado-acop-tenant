function calculateCommissionCents(soldValueCents, commissionRate) {
  const value = Number(soldValueCents);
  const rate = Number(commissionRate);
  if (!Number.isFinite(value) || !Number.isFinite(rate) || value <= 0 || rate <= 0) return 0;
  return Math.round(value * (rate / 100));
}

module.exports = { calculateCommissionCents };
