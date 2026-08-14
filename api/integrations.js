const { prisma } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { webmotorsStatus, santanderStatus, synchronizeWebmotors } = require('./_lib/integrations');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const lastWebmotorsSync = await prisma.integrationEvent.findFirst({ where: { provider: 'webmotors' }, orderBy: { createdAt: 'desc' } });
      return res.status(200).json({ webmotors: { ...webmotorsStatus(), lastSync: lastWebmotorsSync }, santander: santanderStatus() });
    }
    if (req.method === 'POST' && req.body?.action === 'sincronizar-webmotors') {
      try {
        const result = await synchronizeWebmotors(prisma);
        const event = await prisma.integrationEvent.create({ data: { provider: 'webmotors', action: 'sincronizacao-estoque', status: 'sucesso', message: `${result.imported} importados e ${result.updated} atualizados`, details: JSON.stringify(result) } });
        return res.status(200).json({ ok: true, result, event });
      } catch (error) {
        await prisma.integrationEvent.create({ data: { provider: 'webmotors', action: 'sincronizacao-estoque', status: 'erro', message: error.message } });
        const status = error.code === 'INTEGRATION_NOT_CONFIGURED' ? 409 : 502;
        return res.status(status).json({ error: error.message });
      }
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de integrações:', error);
    return res.status(500).json({ error: 'Não foi possível consultar as integrações.' });
  }
};
