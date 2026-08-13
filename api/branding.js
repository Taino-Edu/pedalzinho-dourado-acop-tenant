const { prisma } = require('./_lib/db');

const DEFAULT_BRANDING = Object.freeze({
  brandName: 'Sua Concession\u00e1ria',
  tagline: 'Seu pr\u00f3ximo carro come\u00e7a aqui.',
  logoUrl: '',
  primaryColor: '#2457d6',
  accentColor: '#e58a1f',
  whatsapp: '',
  instagram: '',
  locale: 'pt-BR',
  currency: 'BRL'
});

function parseSettings(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function publicBranding(settings) {
  const keys = [
    'brandName', 'tagline', 'logoUrl', 'primaryColor', 'accentColor',
    'whatsapp', 'instagram', 'locale', 'currency'
  ];
  return Object.fromEntries(keys.filter((key) => settings[key] !== undefined).map((key) => [key, settings[key]]));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dealership = await prisma.dealership.findFirst({
      select: { name: true, email: true, phone: true, address: true, settings: true }
    });
    const settings = dealership ? parseSettings(dealership.settings) : {};
    return res.status(200).json({
      branding: {
        ...DEFAULT_BRANDING,
        ...publicBranding(settings),
        brandName: settings.brandName || dealership?.name || DEFAULT_BRANDING.brandName,
        contactEmail: dealership?.email || '',
        contactPhone: dealership?.phone || '',
        address: dealership?.address || ''
      }
    });
  } catch (err) {
    console.error('api/branding error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
