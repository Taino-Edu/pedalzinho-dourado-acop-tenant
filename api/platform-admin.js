const { prisma } = require('./_lib/db');
const { requirePlatformAuth } = require('./_lib/platformAuth');

const CLIENT_STATUSES = new Set(['lead', 'onboarding', 'active', 'suspended', 'cancelled']);
const DEPLOYMENT_STATUSES = new Set(['pending', 'building', 'healthy', 'degraded', 'offline']);

function text(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function cents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function slug(value) {
  return text(value, 60).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function snapshot() {
  const [clients, services, deployments] = await Promise.all([
    prisma.platformClient.findMany({
      orderBy: { createdAt: 'desc' },
      include: { subscriptions: { include: { service: true } }, deployments: true },
    }),
    prisma.platformService.findMany({ orderBy: [{ active: 'desc' }, { priceCents: 'asc' }] }),
    prisma.platformDeployment.findMany({ include: { client: { select: { name: true, slug: true } } }, orderBy: { updatedAt: 'desc' } }),
  ]);
  const activeClients = clients.filter((client) => client.status === 'active');
  const mrrCents = activeClients.reduce((total, client) => {
    const servicesMrr = client.subscriptions.filter((item) => item.status === 'active' && item.service.billingType === 'monthly')
      .reduce((sum, item) => sum + (item.priceOverrideCents ?? item.service.priceCents), 0);
    return total + client.monthlyFeeCents + servicesMrr;
  }, 0);
  return {
    metrics: {
      totalClients: clients.length,
      activeClients: activeClients.length,
      onboardingClients: clients.filter((client) => client.status === 'onboarding').length,
      healthyDeployments: deployments.filter((item) => item.status === 'healthy').length,
      mrrCents,
    },
    clients,
    services,
    deployments,
  };
}

module.exports = async function handler(req, res) {
  if (!requirePlatformAuth(req, res)) return;

  if (req.method === 'GET') return res.status(200).json(await snapshot());

  if (req.method === 'POST') {
    const action = text(req.body.action, 40);
    if (action === 'client') {
      const clientSlug = slug(req.body.slug || req.body.name);
      const name = text(req.body.name);
      const domain = text(req.body.domain, 253).toLowerCase();
      if (!name || !clientSlug || !domain) return res.status(400).json({ error: 'Nome, slug e dominio sao obrigatorios' });
      const status = CLIENT_STATUSES.has(req.body.status) ? req.body.status : 'lead';
      const client = await prisma.platformClient.create({ data: {
        name, slug: clientSlug, domain, status,
        contactName: text(req.body.contactName) || null,
        contactEmail: text(req.body.contactEmail, 254) || null,
        contactPhone: text(req.body.contactPhone, 40) || null,
        setupFeeCents: cents(req.body.setupFeeCents),
        monthlyFeeCents: cents(req.body.monthlyFeeCents),
        notes: text(req.body.notes, 2000) || null,
      } });
      return res.status(201).json(client);
    }
    if (action === 'service') {
      const name = text(req.body.name);
      const code = slug(req.body.code || name);
      if (!name || !code) return res.status(400).json({ error: 'Nome e codigo sao obrigatorios' });
      const service = await prisma.platformService.create({ data: {
        name, code,
        description: text(req.body.description, 800) || null,
        billingType: req.body.billingType === 'one_time' ? 'one_time' : 'monthly',
        priceCents: cents(req.body.priceCents),
      } });
      return res.status(201).json(service);
    }
    if (action === 'subscription') {
      const clientId = text(req.body.clientId);
      const serviceId = text(req.body.serviceId);
      if (!clientId || !serviceId) return res.status(400).json({ error: 'Cliente e servico sao obrigatorios' });
      const subscription = await prisma.platformSubscription.upsert({
        where: { clientId_serviceId: { clientId, serviceId } },
        update: { status: 'active', cancelledAt: null, priceOverrideCents: req.body.priceOverrideCents === '' ? null : cents(req.body.priceOverrideCents) },
        create: { clientId, serviceId, priceOverrideCents: req.body.priceOverrideCents === '' ? null : cents(req.body.priceOverrideCents) },
      });
      return res.status(201).json(subscription);
    }
    if (action === 'deployment') {
      const clientId = text(req.body.clientId);
      const domain = text(req.body.domain, 253).toLowerCase();
      const projectName = slug(req.body.projectName);
      if (!clientId || !domain || !projectName) return res.status(400).json({ error: 'Cliente, dominio e projeto sao obrigatorios' });
      const deployment = await prisma.platformDeployment.upsert({
        where: { clientId_environment: { clientId, environment: 'production' } },
        update: { domain, projectName, appContainer: `concessionaria_${projectName}_app`, status: 'pending' },
        create: { clientId, domain, projectName, appContainer: `concessionaria_${projectName}_app` },
      });
      return res.status(201).json(deployment);
    }
    return res.status(400).json({ error: 'Acao invalida' });
  }

  if (req.method === 'PATCH') {
    const type = text(req.body.type, 30);
    const id = text(req.body.id);
    if (!id) return res.status(400).json({ error: 'ID obrigatorio' });
    if (type === 'client') {
      const status = CLIENT_STATUSES.has(req.body.status) ? req.body.status : null;
      if (!status) return res.status(400).json({ error: 'Status invalido' });
      return res.status(200).json(await prisma.platformClient.update({ where: { id }, data: { status } }));
    }
    if (type === 'deployment') {
      const status = DEPLOYMENT_STATUSES.has(req.body.status) ? req.body.status : null;
      if (!status) return res.status(400).json({ error: 'Status invalido' });
      return res.status(200).json(await prisma.platformDeployment.update({ where: { id }, data: {
        status,
        lastHealthAt: status === 'healthy' ? new Date() : undefined,
        deployedAt: status === 'healthy' ? new Date() : undefined,
        version: text(req.body.version, 80) || undefined,
      } }));
    }
    return res.status(400).json({ error: 'Tipo invalido' });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Metodo nao permitido' });
};
