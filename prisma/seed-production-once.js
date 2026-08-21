/**
 * One-time production seed. Runs from the Vercel build step (see
 * package.json) right after the Postgres schema is pushed. Idempotent by
 * design — checks the Lead table first and does nothing if it's not empty,
 * so it's safe to leave wired into every future build rather than needing
 * to be pulled back out.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const existingDealerships = await prisma.dealership.count();
  if (existingDealerships > 0) {
    console.log(`seed-production-once: database already has ${existingDealerships} dealership(s), skipping.`);
    return;
  }

  console.log('seed-production-once: empty database, seeding demo data...');

  const dealership = await prisma.dealership.create({
    data: {
      name: 'Sua Concession\u00e1ria',
      email: 'contato@concessionaria.local',
      phone: '+55 11 99999-9999',
      address: 'S\u00e3o Paulo, SP',
      timezone: 'America/Sao_Paulo',
      settings: JSON.stringify({
        brandName: 'Sua Concession\u00e1ria',
        tagline: 'Seu pr\u00f3ximo carro come\u00e7a aqui.',
        logoUrl: '',
        primaryColor: '#2457d6',
        accentColor: '#e58a1f',
        whatsapp: '5511999999999',
        instagram: '',
        locale: 'pt-BR',
        currency: 'BRL'
      }),
    },
  });

  const teamMember = await prisma.teamMember.create({
    data: {
      dealershipId: dealership.id,
      name: 'Marcos Oliveira',
      email: 'vendas@concessionaria.local',
      role: 'sales',
      permissions: JSON.stringify(['read:leads', 'update:leads', 'create:appointments']),
    },
  });

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        vin: '1HGBH41JXMN109186',
        make: 'Mercedes-Benz',
        model: 'E450',
        year: 2024,
        price: 45000000,
        mileage: 8500,
        color: 'Black',
        body: 'Sedan',
        engine: '3.0L Turbo I6',
        transmission: 'Automatic',
        drivetrain: 'AWD',
        mpg: 24,
        images: JSON.stringify(['/images/vehicles/e450-1.jpg']),
        status: 'active',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: '5UXCR6C0XL9B12345',
        make: 'BMW',
        model: 'X6',
        year: 2024,
        price: 52000000,
        mileage: 6200,
        color: 'Silver',
        body: 'SUV',
        engine: '3.0L Turbo I6',
        transmission: 'Automatic',
        drivetrain: 'AWD',
        mpg: 22,
        images: JSON.stringify(['/images/vehicles/x6-1.jpg']),
        status: 'active',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: 'WP1AA2AY8SDA98765',
        make: 'Porsche',
        model: 'Cayenne',
        year: 2025,
        price: 68000000,
        mileage: 3100,
        color: 'White',
        body: 'SUV',
        engine: '3.0L V6 Turbo',
        transmission: 'Automatic',
        drivetrain: 'AWD',
        mpg: 21,
        images: JSON.stringify(['/images/vehicles/cayenne-1.jpg']),
        status: 'featured',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: 'MOTOHONDA500F24',
        vehicleType: 'motorcycle',
        make: 'Honda',
        model: 'CB 500F',
        year: 2024,
        price: 3890000,
        mileage: 2900,
        color: 'Vermelha',
        body: 'Street',
        engine: '471 cc bicilíndrico',
        transmission: '6 marchas',
        drivetrain: 'Corrente',
        mpg: 0,
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
        ]),
        status: 'featured',
        history: 'Moto revisada, documentação conferida e pronta para venda com atendimento especializado em duas rodas.',
      },
    }),
    prisma.vehicle.create({
      data: {
        vin: 'MOTOYAMAHA07MT23',
        vehicleType: 'motorcycle',
        make: 'Yamaha',
        model: 'MT-07',
        year: 2023,
        price: 4490000,
        mileage: 5600,
        color: 'Cinza',
        body: 'Naked',
        engine: '689 cc CP2',
        transmission: '6 marchas',
        drivetrain: 'Corrente',
        mpg: 0,
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80',
        ]),
        status: 'active',
        history: 'Naked média com visual esportivo, baixa quilometragem e ficha pronta para atender clientes de motos premium.',
      },
    }),
  ]);

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        carId: vehicles[0].id,
        carName: 'Mercedes-Benz E450',
        name: 'Mariana Souza',
        email: 'mariana@example.com',
        phone: '+55 11 98888-1001',
        status: 'NEW',
        source: 'test-drive-modal',
        priority: 'High',
        tags: JSON.stringify(['urgent', 'financing-needed']),
        assignedToId: teamMember.id,
      },
    }),
    prisma.lead.create({
      data: {
        carId: vehicles[1].id,
        carName: 'BMW X6',
        name: 'Carlos Mendes',
        email: 'carlos@example.com',
        phone: '+55 11 98888-1002',
        status: 'CONTACTED',
        source: 'phone-call',
        priority: 'Medium',
        tags: JSON.stringify(['family-vehicle']),
        assignedToId: teamMember.id,
      },
    }),
    prisma.lead.create({
      data: {
        carId: vehicles[2].id,
        carName: 'Porsche Cayenne',
        name: 'Ana Ferreira',
        email: 'ana@example.com',
        phone: '+55 11 98888-1003',
        status: 'QUALIFIED',
        source: 'website',
        priority: 'High',
        tags: JSON.stringify(['premium-buyer', 'test-drive-booked']),
        assignedToId: teamMember.id,
      },
    }),
  ]);

  function atHour(daysFromNow, hour, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  await Promise.all([
    prisma.appointment.create({
      data: { leadId: leads[0].id, vehicleId: vehicles[0].id, type: 'test-drive', dateTime: atHour(1, 9, 0), status: 'scheduled' },
    }),
    prisma.appointment.create({
      data: { leadId: leads[2].id, vehicleId: vehicles[2].id, type: 'test-drive', dateTime: atHour(2, 14, 0), status: 'scheduled' },
    }),
    prisma.appointment.create({
      data: { leadId: leads[1].id, vehicleId: vehicles[1].id, type: 'consultation', dateTime: atHour(0, 11, 0), status: 'scheduled' },
    }),
  ]);

  await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Juliana Costa',
        email: 'juliana.costa@example.com',
        phone: '+55 11 97777-2001',
        address: 'Sao Paulo, SP',
        preferredMakes: JSON.stringify(['Volkswagen', 'Chevrolet']),
        purchaseHistory: JSON.stringify([vehicles[1].id]),
        referralCode: 'JULIANA10',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Rafael Lima',
        email: 'rafael.lima@example.com',
        phone: '+55 11 97777-2002',
        address: 'Campinas, SP',
        preferredMakes: JSON.stringify(['Fiat', 'Hyundai']),
        purchaseHistory: JSON.stringify([vehicles[0].id]),
      },
    }),
  ]);

  console.log('seed-production-once: done.');
}

main()
  .catch((e) => {
    console.error('seed-production-once failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
