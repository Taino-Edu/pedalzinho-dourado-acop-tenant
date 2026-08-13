const { prisma } = require('./_lib/db');

const DEMO_MEDIA = {
  'Mercedes-Benz E450': {
    horsepower: 375,
    gallery: ['mercedes-e450-2024-1.jpg', 'mercedes-e450-2024-2.jpg', 'mercedes-e450-2024-3.jpg'],
  },
  'BMW X6': {
    horsepower: 335,
    gallery: [
      '2024-x6-exterior1.jpg', '2024-x6-exterior2.jpg', '2024-x6-exterior3.jpg',
      '2024-x6-exterior4.jpg', '2024-x6-exterior5.jpg', '2024-x6-interior1.jpg',
      '2024-x6-interior2.jpg', '2024-x6-interior3.jpg', '2024-x6-interior4.jpg',
      '2024-x6-interior5.jpg', '2024-x6-interior6.jpg',
    ],
  },
  'Porsche Cayenne': {
    horsepower: 348,
    gallery: [
      'porsche-cayenne-exterior1.jpg', 'porsche-cayenne-exterior2.jpg',
      'porsche-cayenne-exterior3.jpg', 'porsche-cayenne-exterior4.jpg',
      'porsche-cayenne-exterior5.jpg', 'porsche-cayenne-interior1.jpg',
      'porsche-cayenne-interior2.jpg', 'porsche-cayenne-interior3.jpg',
      'porsche-cayenne-interior4.jpg', 'porsche-cayenne-interior5.jpg',
    ],
  },
};

function parseImages(value, fallback) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (fallback.length && parsed.some((item) => typeof item === 'string' && item.startsWith('/images/vehicles/'))) {
      return fallback;
    }
    const usable = parsed
      .filter((item) => typeof item === 'string')
      .map((item) => item.replace(/^.*\/assets\/web\//, '').replace(/^.*\/images\/vehicles\//, ''))
      .filter(Boolean);
    return usable.length ? usable : fallback;
  } catch {
    return fallback;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: { in: ['active', 'featured'] } },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    });

    const cars = vehicles.map((vehicle) => {
      const key = `${vehicle.make} ${vehicle.model}`;
      const media = DEMO_MEDIA[key] || { horsepower: null, gallery: [] };
      const gallery = parseImages(vehicle.images, media.gallery);
      return {
        id: vehicle.id,
        brand: vehicle.make,
        name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        year: vehicle.year,
        price: vehicle.price,
        mileage: `${Number(vehicle.mileage).toLocaleString('pt-BR')} km`,
        engine: vehicle.engine,
        horsepower: media.horsepower || '—',
        drivetrain: vehicle.drivetrain,
        transmission: vehicle.transmission,
        color: vehicle.color,
        featured: vehicle.status === 'featured',
        image: gallery[0] || 'car-placeholder.jpg',
        gallery,
        bodyStyle: vehicle.body,
        overview: vehicle.history || `${vehicle.make} ${vehicle.model} dispon\u00edvel para visita e test-drive. Entre em contato para confirmar condi\u00e7\u00f5es e disponibilidade.`,
        whatsNew: '',
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.status(200).json({ cars });
  } catch (err) {
    console.error('api/catalog error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
