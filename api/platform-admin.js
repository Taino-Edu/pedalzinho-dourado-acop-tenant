const { prisma } = require('./_lib/db');
const { requirePlatformAuth } = require('./_lib/platformAuth');
const { DOMAIN_MODES, DOMAIN_STATUSES, normalizeDomain, resolveDomains, slugify } = require('./_lib/platformDomains');

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
  return slugify(value);
}

function port(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : null;
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
      activeDomains: clients.filter((client) => client.domainStatus === 'active').length,
      mrrCents,
    },
    config: { baseDomain: normalizeDomain(process.env.PLATFORM_BASE_DOMAIN || '3esysten.com.br') },
    clients,
    services,
    deployments,
  };
}

module.exports = async function handler(req, res) {
  if (!requirePlatformAuth(req, res)) return;

  try {
    if (req.method === 'GET') return res.status(200).json(await snapshot());

    if (req.method === 'POST') {
      const action = text(req.body.action, 40);
      if (action === 'client') {
        const name = text(req.body.name);
        const domains = resolveDomains({ ...req.body, name }, process.env.PLATFORM_BASE_DOMAIN);
        if (!name) return res.status(400).json({ error: 'Nome da concessionária é obrigatório.' });
        const status = CLIENT_STATUSES.has(req.body.status) ? req.body.status : 'lead';
        const client = await prisma.platformClient.create({ data: {
          name, ...domains, status,
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
      const projectName = slug(req.body.projectName);
      const client = clientId ? await prisma.platformClient.findUnique({ where: { id: clientId } }) : null;
      const domain = normalizeDomain(req.body.domain || client?.domain);
      if (!client || !domain || !projectName) return res.status(400).json({ error: 'Cliente, domínio e projeto são obrigatórios.' });
      const appPort = port(req.body.appPort);
      const postgresPort = port(req.body.postgresPort);
      if ((req.body.appPort && !appPort) || (req.body.postgresPort && !postgresPort)) return res.status(400).json({ error: 'Use portas entre 1024 e 65535.' });
      const deploymentData = {
        domain,
        projectName,
        appContainer: `concessionaria_${projectName}_app`,
        appPort,
        postgresPort,
        installPath: text(req.body.installPath, 500) || `/opt/concessionarias/${projectName}`,
        status: 'pending',
        lastError: null,
      };
      const deployment = await prisma.platformDeployment.upsert({
        where: { clientId_environment: { clientId, environment: 'production' } },
        update: deploymentData,
        create: { clientId, ...deploymentData },
      });
      return res.status(201).json(deployment);
      }
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    if (req.method === 'PATCH') {
    const type = text(req.body.type, 30);
    const id = text(req.body.id);
    if (!id) return res.status(400).json({ error: 'ID obrigatorio' });
    if (type === 'client') {
      const client = await prisma.platformClient.findUnique({ where: { id } });
      if (!client) return res.status(404).json({ error: 'Concessionária não encontrada.' });
      const data = {};
      if (req.body.status !== undefined) {
        if (!CLIENT_STATUSES.has(req.body.status)) return res.status(400).json({ error: 'Status inválido.' });
        data.status = req.body.status;
      }
      if (req.body.domainMode !== undefined || req.body.customDomain !== undefined) {
        const domainMode = DOMAIN_MODES.has(req.body.domainMode) ? req.body.domainMode : client.domainMode;
        Object.assign(data, resolveDomains({ slug: client.slug, domainMode, customDomain: req.body.customDomain ?? client.customDomain }, process.env.PLATFORM_BASE_DOMAIN));
      }
      if (req.body.domainStatus !== undefined) {
        if (!DOMAIN_STATUSES.has(req.body.domainStatus)) return res.status(400).json({ error: 'Estado de domínio inválido.' });
        data.domainStatus = req.body.domainStatus;
      }
      if (req.body.monthlyFeeCents !== undefined) data.monthlyFeeCents = cents(req.body.monthlyFeeCents);
      if (req.body.setupFeeCents !== undefined) data.setupFeeCents = cents(req.body.setupFeeCents);
      if (req.body.contactName !== undefined) data.contactName = text(req.body.contactName) || null;
      if (req.body.contactEmail !== undefined) data.contactEmail = text(req.body.contactEmail, 254) || null;
      if (req.body.contactPhone !== undefined) data.contactPhone = text(req.body.contactPhone, 40) || null;
      if (req.body.notes !== undefined) data.notes = text(req.body.notes, 2000) || null;
      return res.status(200).json(await prisma.platformClient.update({ where: { id }, data }));
    }
    if (type === 'deployment') {
      const status = DEPLOYMENT_STATUSES.has(req.body.status) ? req.body.status : null;
      if (!status) return res.status(400).json({ error: 'Status invalido' });
      return res.status(200).json(await prisma.platformDeployment.update({ where: { id }, data: {
        status,
        lastHealthAt: status === 'healthy' ? new Date() : undefined,
        deployedAt: status === 'healthy' ? new Date() : undefined,
        version: text(req.body.version, 80) || undefined,
        lastError: status === 'degraded' || status === 'offline' ? text(req.body.lastError, 1000) || undefined : null,
      } }));
    }
    return res.status(400).json({ error: 'Tipo invalido' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Slug ou domínio já cadastrado.' });
    if (/domínio|obrigatórios/i.test(error.message || '')) return res.status(400).json({ error: error.message });
    console.error('api/platform-admin error:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar a central agora.' });
  }
};
