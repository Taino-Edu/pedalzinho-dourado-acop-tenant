const { PrismaClient } = require('@prisma/client');
const { POPULAR_CARS } = require('../api/_lib/marketData');

const prisma = new PrismaClient();

const DETAILS = [
  { vin: 'BRDEMOPOLO2025001', color: 'Cinza', body: 'Hatch', engine: '1.0 TSI Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 18400, status: 'featured' },
  { vin: 'BRDEMOTCROSS25002', color: 'Branco', body: 'SUV', engine: '1.0 TSI Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 22100, status: 'active' },
  { vin: 'BRDEMOARGO2025003', color: 'Vermelho', body: 'Hatch', engine: '1.0 Flex', transmission: 'Manual', drivetrain: 'Dianteira', mileage: 27600, status: 'active' },
  { vin: 'BRDEMOONIX2025004', color: 'Prata', body: 'Hatch', engine: '1.0 Turbo Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 19300, status: 'active' },
  { vin: 'BRDEMOTERA2026005', color: 'Cinza', body: 'SUV', engine: '1.0 TSI Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 6200, status: 'active' },
  { vin: 'BRDEMOHB202025006', color: 'Azul', body: 'Hatch', engine: '1.0 Turbo Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 24800, status: 'active' },
  { vin: 'BRDEMODOLPHIN2507', color: 'Branco', body: 'Hatch elétrico', engine: 'Elétrico', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 17200, status: 'featured' },
  { vin: 'BRDEMOMOBI2025008', color: 'Preto', body: 'Hatch', engine: '1.0 Flex', transmission: 'Manual', drivetrain: 'Dianteira', mileage: 31100, status: 'active' },
  { vin: 'BRDEMOKWID2025009', color: 'Laranja', body: 'Hatch', engine: '1.0 Flex', transmission: 'Manual', drivetrain: 'Dianteira', mileage: 26800, status: 'active' },
  { vin: 'BRDEMOTRACKER2510', color: 'Azul', body: 'SUV', engine: '1.0 Turbo Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 21400, status: 'active' },
  { vin: 'BRDEMOCOMPASS2511', color: 'Cinza', body: 'SUV', engine: '1.3 Turbo Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 28900, status: 'active' },
  { vin: 'BRDEMOPULSE2026012', color: 'Vermelho', body: 'SUV', engine: '1.0 Turbo Flex', transmission: 'Automático', drivetrain: 'Dianteira', mileage: 8400, status: 'active' },
];

async function main() {
  const existing = await prisma.vehicle.findMany({ orderBy: { createdAt: 'asc' } });
  const vehicles = [];

  for (let index = 0; index < POPULAR_CARS.length; index += 1) {
    const car = POPULAR_CARS[index];
    const details = DETAILS[index];
    const data = {
      ...details,
      make: car.make,
      model: car.model,
      year: car.year,
      price: car.fipePrice,
      fipeCode: car.fipeCode,
      fipePrice: car.fipePrice,
      fipeModel: car.fipeModel,
      fipeReferenceMonth: 'agosto de 2026',
      fipeUpdatedAt: new Date(),
      images: '[]',
      history: `${car.make} ${car.model} selecionado entre os modelos mais emplacados do Brasil em 2026.`,
      dealerNotes: 'Veículo de demonstração com preço alinhado à Tabela FIPE.',
    };

    const vehicle = existing[index]
      ? await prisma.vehicle.update({ where: { id: existing[index].id }, data })
      : await prisma.vehicle.upsert({ where: { vin: details.vin }, update: data, create: data });
    vehicles.push(vehicle);

    await prisma.lead.updateMany({ where: { carId: vehicle.id }, data: { carName: `${car.make} ${car.model}` } });
  }

  console.log(`Estoque brasileiro atualizado: ${vehicles.map((vehicle) => `${vehicle.make} ${vehicle.model}`).join(', ')}`);
}

main().finally(() => prisma.$disconnect());
