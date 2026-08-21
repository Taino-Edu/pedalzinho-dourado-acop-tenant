const FIPE_API_URL = 'https://parallelum.com.br/fipe/api/v1';
const BCB_VEHICLE_RATE_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.20749/dados/ultimos/1?formato=json';

const POPULAR_CARS = [
  { rank: 1, make: 'Volkswagen', model: 'Polo', year: 2025, fipeModel: 'Polo 1.0 TSI Flex 12V 5p', fipeCode: '005534-4', fipePrice: 8977900, registrations: 54091 },
  { rank: 2, make: 'Volkswagen', model: 'T-Cross', year: 2025, fipeModel: 'T-Cross Comfortline 200 TSI 1.0 Flex Aut.', fipeCode: '005509-3', fipePrice: 13130700, registrations: 48048 },
  { rank: 3, make: 'Fiat', model: 'Argo', year: 2025, fipeModel: 'Argo Drive 1.0 Flex', fipeCode: '001494-0', fipePrice: 7087500, registrations: 46029 },
  { rank: 4, make: 'Chevrolet', model: 'Onix', year: 2025, fipeModel: 'Onix Hatch 1.0 Turbo Flex Aut.', fipeCode: '004511-0', fipePrice: 8270500, registrations: 45109 },
  { rank: 5, make: 'Volkswagen', model: 'Tera', year: 2026, fipeModel: 'Tera Comfort 1.0 170 TSI Flex Aut.', fipeCode: '005555-7', fipePrice: 11824100, registrations: 41420 },
  { rank: 6, make: 'Hyundai', model: 'HB20', year: 2025, fipeModel: 'HB20 Comfort Plus 1.0 Turbo Flex Aut.', fipeCode: '015236-6', fipePrice: 9171400, registrations: 38930 },
  { rank: 8, make: 'BYD', model: 'Dolphin Mini', year: 2025, fipeModel: 'Dolphin Mini GS Elétrico', fipeCode: '095010-6', fipePrice: 10566500, registrations: 35669 },
  { rank: 9, make: 'Fiat', model: 'Mobi', year: 2025, fipeModel: 'Mobi Like 1.0 Fire Flex', fipeCode: '001461-3', fipePrice: 6153000, registrations: 33492 },
  { rank: 11, make: 'Renault', model: 'Kwid', year: 2025, fipeModel: 'Kwid Iconic 1.0 Flex', fipeCode: '025333-2', fipePrice: 6450400, registrations: 30564 },
  { rank: 12, make: 'Chevrolet', model: 'Tracker', year: 2025, fipeModel: 'Tracker LT 1.0 Turbo Flex Aut.', fipeCode: '004522-5', fipePrice: 10570400, registrations: 29223 },
  { rank: 14, make: 'Jeep', model: 'Compass', year: 2025, fipeModel: 'Compass Limited T270 1.3 Turbo Flex Aut.', fipeCode: '017070-4', fipePrice: 17053200, registrations: 27038 },
  { rank: 15, make: 'Fiat', model: 'Pulse', year: 2026, fipeModel: 'Pulse 1.0 Turbo 200 Flex Aut.', fipeCode: '001592-0', fipePrice: 10640400, registrations: 25913 },
];

const POPULAR_CARS_REFERENCE = {
  ranking: 'Fenabrave — emplacamentos acumulados até junho de 2026',
  prices: 'Tabela FIPE — agosto de 2026',
  sourceUrl: 'https://www.fenabrave.org.br/portal/files/2026_06_02.pdf',
};

function parseBrazilianCurrency(value) {
  const normalized = String(value || '').replace(/[^\d,]/g, '').replace(',', '.');
  return Math.round((Number(normalized) || 0) * 100);
}

function annualToMonthlyRate(annualPercent) {
  return (Math.pow(1 + Number(annualPercent) / 100, 1 / 12) - 1) * 100;
}

function pricePayment(principal, monthlyPercent, months) {
  const rate = Number(monthlyPercent) / 100;
  if (!rate) return principal / months;
  return principal * rate / (1 - Math.pow(1 + rate, -months));
}

function analyzeFinancing({ askingPrice, fipePrice, downPaymentPercent = 20, annualRate, terms = [12, 24, 36, 48, 60, 72] }) {
  const downPayment = Math.round(askingPrice * Number(downPaymentPercent) / 100);
  const financedAmount = Math.max(askingPrice - downPayment, 0);
  const monthlyRate = annualToMonthlyRate(annualRate);
  const priceDifferencePercent = fipePrice ? ((askingPrice - fipePrice) / fipePrice) * 100 : null;
  const ltvPercent = fipePrice ? (financedAmount / fipePrice) * 100 : null;
  return {
    askingPrice,
    fipePrice: fipePrice || null,
    downPayment,
    financedAmount,
    downPaymentPercent: Number(downPaymentPercent),
    annualRate: Number(annualRate),
    monthlyRate,
    priceDifferencePercent,
    ltvPercent,
    risk: ltvPercent == null ? 'sem-fipe' : ltvPercent <= 80 ? 'baixo' : ltvPercent <= 100 ? 'moderado' : 'alto',
    installments: terms.map((months) => ({ months, amount: Math.round(pricePayment(financedAmount, monthlyRate, months)) })),
  };
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'PedalzinhoDourado/1.0' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Serviço externo respondeu HTTP ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function cached(prisma, key, ttlMs, loader) {
  const existing = await prisma.externalCache.findUnique({ where: { key } });
  if (existing && existing.expiresAt > new Date()) return JSON.parse(existing.payload);
  try {
    const payload = await loader();
    await prisma.externalCache.upsert({
      where: { key },
      create: { key, provider: key.split(':')[0], payload: JSON.stringify(payload), expiresAt: new Date(Date.now() + ttlMs) },
      update: { payload: JSON.stringify(payload), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return payload;
  } catch (error) {
    if (existing) return JSON.parse(existing.payload);
    throw error;
  }
}

function normalizeVehicleType(value) {
  return value === 'motorcycle' || value === 'motos' ? 'motorcycle' : 'car';
}

const fipeCategory = (vehicleType) => normalizeVehicleType(vehicleType) === 'motorcycle' ? 'motos' : 'carros';
const fipePath = (path, vehicleType) => `${FIPE_API_URL}/${fipeCategory(vehicleType)}${path}`;

async function getFipeBrands(prisma, vehicleType = 'car') {
  const category = fipeCategory(vehicleType);
  return cached(prisma, `fipe:${category}:brands`, 24 * 3600000, () => fetchJson(fipePath('/marcas', vehicleType)));
}

async function getFipeModels(prisma, brandCode, vehicleType = 'car') {
  const category = fipeCategory(vehicleType);
  return cached(prisma, `fipe:${category}:models:${brandCode}`, 24 * 3600000, async () => (await fetchJson(fipePath(`/marcas/${encodeURIComponent(brandCode)}/modelos`, vehicleType))).modelos || []);
}

async function getFipeYears(prisma, brandCode, modelCode, vehicleType = 'car') {
  const category = fipeCategory(vehicleType);
  return cached(prisma, `fipe:${category}:years:${brandCode}:${modelCode}`, 24 * 3600000, () => fetchJson(fipePath(`/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(modelCode)}/anos`, vehicleType)));
}

async function getFipePrice(prisma, brandCode, modelCode, yearCode, vehicleType = 'car') {
  const category = fipeCategory(vehicleType);
  return cached(prisma, `fipe:${category}:price:${brandCode}:${modelCode}:${yearCode}`, 7 * 24 * 3600000, async () => {
    const raw = await fetchJson(fipePath(`/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(modelCode)}/anos/${encodeURIComponent(yearCode)}`, vehicleType));
    return { ...raw, priceCents: parseBrazilianCurrency(raw.Valor) };
  });
}

async function getVehicleMarketRate(prisma) {
  return cached(prisma, 'bcb:vehicle-rate:20749', 12 * 3600000, async () => {
    const rows = await fetchJson(BCB_VEHICLE_RATE_URL);
    const latest = Array.isArray(rows) ? rows[0] : null;
    if (!latest?.valor) throw new Error('O Banco Central não retornou a taxa de veículos.');
    return { annualPercent: Number(String(latest.valor).replace(',', '.')), referenceDate: latest.data, source: 'Banco Central do Brasil — SGS 20749' };
  });
}

module.exports = { POPULAR_CARS, POPULAR_CARS_REFERENCE, normalizeVehicleType, parseBrazilianCurrency, annualToMonthlyRate, pricePayment, analyzeFinancing, getFipeBrands, getFipeModels, getFipeYears, getFipePrice, getVehicleMarketRate };
