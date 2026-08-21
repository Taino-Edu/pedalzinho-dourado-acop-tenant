const { prisma } = require('../api/_lib/db');
const { getFipeBrands, getFipeModels, getFipeYears, getVehicleMarketRate } = require('../api/_lib/marketData');

(async () => {
  const [brands, rate, vehicles] = await Promise.all([getFipeBrands(prisma), getVehicleMarketRate(prisma), prisma.vehicle.findMany({ select: { make: true, model: true } })]);
  let matchedModels = 0;
  for (const vehicle of vehicles) {
    const brand = brands.find((item) => item.nome.toLowerCase().includes(vehicle.make.toLowerCase()) || vehicle.make.toLowerCase().includes(item.nome.toLowerCase()));
    if (!brand) continue;
    const models = await getFipeModels(prisma, brand.codigo);
    const model = models.find((item) => item.nome.toLowerCase().includes(vehicle.model.toLowerCase()));
    if (!model) continue;
    await getFipeYears(prisma, brand.codigo, model.codigo);
    matchedModels += 1;
  }
  console.log(`Cache de mercado atualizado: ${brands.length} marcas FIPE; ${matchedModels} modelos do estoque; taxa BCB ${rate.annualPercent}% a.a. (${rate.referenceDate}).`);
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error('Não foi possível aquecer o cache de mercado:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
