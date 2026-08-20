const { PrismaClient } = require('@prisma/client');
const { platformDomainFor } = require('../api/_lib/platformDomains');

const prisma = new PrismaClient();

const services = [
  { code: 'plataforma-essencial', name: 'Plataforma Essencial', description: 'Site white-label, estoque, CRM de leads e simulador de financiamento.', billingType: 'monthly', priceCents: 29700 },
  { code: 'plataforma-profissional', name: 'Plataforma Profissional', description: 'Personalização completa, domínio próprio, implantação assistida e suporte prioritário.', billingType: 'monthly', priceCents: 59700 },
  { code: 'implantacao-white-label', name: 'Implantação White-label', description: 'Configuração do domínio, identidade visual, carga inicial e treinamento.', billingType: 'one_time', priceCents: 99000 },
  { code: 'integracao-webmotors', name: 'Integração Webmotors', description: 'Sincronização de estoque após contratação e homologação da revenda.', billingType: 'monthly', priceCents: 14900 },
  { code: 'gestao-trafego', name: 'Gestão de Tráfego', description: 'Campanhas locais para gerar oportunidades e levar clientes ao estoque.', billingType: 'monthly', priceCents: 69000 },
  { code: 'conteudo-redes', name: 'Conteúdo para Redes', description: 'Pacote mensal de criativos e publicações para a concessionária.', billingType: 'monthly', priceCents: 39000 },
];

async function main() {
  for (const service of services) {
    await prisma.platformService.upsert({ where: { code: service.code }, update: service, create: service });
  }

  const domain = process.env.PLATFORM_DEMO_DOMAIN;
  if (domain) {
    const platformDomain = platformDomainFor('demonstracao-3esysten', process.env.PLATFORM_BASE_DOMAIN);
    const client = await prisma.platformClient.upsert({
      where: { slug: 'demonstracao-3esysten' },
      update: { domain, platformDomain, domainStatus: 'active', status: 'active' },
      create: { name: 'Demonstracao 3esysten', slug: 'demonstracao-3esysten', domain, platformDomain, domainStatus: 'active', status: 'active', notes: 'Ambiente comercial de demonstracao.' },
    });
    await prisma.platformDeployment.upsert({
      where: { clientId_environment: { clientId: client.id, environment: 'production' } },
      update: { domain, projectName: 'autos', appContainer: 'concessionaria_autos_app' },
      create: { clientId: client.id, domain, projectName: 'autos', appContainer: 'concessionaria_autos_app', status: 'pending' },
    });
  }
  console.log(`Catalogo da plataforma atualizado com ${services.length} servicos.`);
}

main().finally(() => prisma.$disconnect());
