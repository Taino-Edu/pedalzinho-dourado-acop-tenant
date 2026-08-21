const { prisma } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { POPULAR_CARS, POPULAR_CARS_REFERENCE, getFipeBrands, getFipeModels, getFipeYears, getFipePrice, getVehicleMarketRate, analyzeFinancing } = require('./_lib/marketData');

const FALLBACK_RATE = { annualPercent: 24, referenceDate: null, source: 'Taxa de contingência do simulador' };

async function safeRate() {
  try { return await getVehicleMarketRate(prisma); } catch { return FALLBACK_RATE; }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const action = req.query?.action || 'overview';
      const vehicleType = req.query?.vehicleType || 'car';
      if (action === 'popular') return res.status(200).json({ cars: POPULAR_CARS, reference: POPULAR_CARS_REFERENCE });
      if (action === 'brands') return res.status(200).json({ brands: await getFipeBrands(prisma, vehicleType) });
      if (action === 'models') {
        if (!req.query.brandCode) return res.status(400).json({ error: 'Informe a marca.' });
        return res.status(200).json({ models: await getFipeModels(prisma, req.query.brandCode, vehicleType) });
      }
      if (action === 'years') {
        if (!req.query.brandCode || !req.query.modelCode) return res.status(400).json({ error: 'Informe marca e modelo.' });
        return res.status(200).json({ years: await getFipeYears(prisma, req.query.brandCode, req.query.modelCode, vehicleType) });
      }
      if (action === 'price') {
        const { brandCode, modelCode, yearCode } = req.query;
        if (!brandCode || !modelCode || !yearCode) return res.status(400).json({ error: 'Informe marca, modelo e ano.' });
        return res.status(200).json({ fipe: await getFipePrice(prisma, brandCode, modelCode, yearCode, vehicleType) });
      }

      const vehicles = await prisma.vehicle.findMany({ where: { status: { in: ['active', 'featured'] } }, orderBy: { createdAt: 'desc' } });
      const rate = await safeRate();
      return res.status(200).json({
        rate,
        vehicles: vehicles.map((vehicle) => ({
          id: vehicle.id, vehicleType: vehicle.vehicleType, make: vehicle.make, model: vehicle.model, year: vehicle.year, price: vehicle.price,
          fipeCode: vehicle.fipeCode, fipePrice: vehicle.fipePrice, fipeModel: vehicle.fipeModel,
          fipeReferenceMonth: vehicle.fipeReferenceMonth, fipeUpdatedAt: vehicle.fipeUpdatedAt,
          analysis: analyzeFinancing({ askingPrice: vehicle.price, fipePrice: vehicle.fipePrice, annualRate: rate.annualPercent }),
        })),
      });
    }

    if (req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const { vehicleId, brandCode, modelCode, yearCode } = req.body || {};
      if (!vehicleId || !brandCode || !modelCode || !yearCode) return res.status(400).json({ error: 'Informe o veículo e a versão FIPE.' });
      const currentVehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { vehicleType: true } });
      if (!currentVehicle) return res.status(404).json({ error: 'Veículo não encontrado.' });
      const fipe = await getFipePrice(prisma, brandCode, modelCode, yearCode, currentVehicle.vehicleType);
      const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: {
        fipeCode: fipe.CodigoFipe,
        fipePrice: fipe.priceCents,
        fipeModel: fipe.Modelo,
        fipeReferenceMonth: fipe.MesReferencia,
        fipeUpdatedAt: new Date(),
      } });
      const rate = await safeRate();
      return res.status(200).json({ vehicle, fipe, rate, analysis: analyzeFinancing({ askingPrice: vehicle.price, fipePrice: vehicle.fipePrice, annualRate: rate.annualPercent }) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de dados de mercado:', error);
    const status = error.code === 'P2025' ? 404 : 502;
    return res.status(status).json({ error: status === 404 ? 'Veículo não encontrado.' : 'Não foi possível consultar os dados de mercado agora.' });
  }
};
