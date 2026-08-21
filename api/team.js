const { prisma } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { broadcast } = require('./_lib/events');
const { calculateCommissionCents } = require('./_lib/commission');

const VALID_ROLES = ['owner', 'manager', 'sales', 'bdc'];

function normalizeRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 20 ? rate : null;
}

async function dealershipId() {
  const dealership = await prisma.dealership.findFirst({ orderBy: { createdAt: 'asc' } });
  return dealership?.id || null;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;

  try {
    if (req.method === 'GET') {
      const members = await prisma.teamMember.findMany({
        include: { assignedLeads: true },
        orderBy: { joinedAt: 'asc' },
      });
      const soldVehicleIds = [...new Set(members.flatMap((member) => member.assignedLeads)
        .filter((lead) => lead.status === 'SOLD' && lead.carId)
        .map((lead) => lead.carId))];
      const soldVehicles = soldVehicleIds.length
        ? await prisma.vehicle.findMany({ where: { id: { in: soldVehicleIds } }, select: { id: true, price: true } })
        : [];
      const prices = new Map(soldVehicles.map((vehicle) => [vehicle.id, vehicle.price]));

      const team = members.map((member) => {
        const leads = member.assignedLeads || [];
        const soldLeads = leads.filter((lead) => lead.status === 'SOLD');
        const soldValue = soldLeads.reduce((total, lead) => total + Number(prices.get(lead.carId) || 0), 0);
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          commissionRate: member.commissionRate,
          commissionCents: calculateCommissionCents(soldValue, member.commissionRate),
          soldValueCents: soldValue,
          joinedAt: member.joinedAt,
          active: !member.deactivatedAt,
          assignedLeadCount: leads.length,
          soldCount: soldLeads.length,
          openCount: leads.filter((lead) => !['SOLD', 'LOST'].includes(lead.status)).length,
        };
      });

      return res.status(200).json({ team });
    }

    if (req.method === 'POST') {
      const { name, email, role = 'sales', commissionRate = 1.5 } = req.body || {};
      const rate = normalizeRate(commissionRate);
      if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Informe nome e e-mail do funcionário.' });
      if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Função inválida.' });
      if (rate === null) return res.status(400).json({ error: 'A comissão deve ficar entre 0% e 20%.' });
      const currentDealershipId = await dealershipId();
      if (!currentDealershipId) return res.status(409).json({ error: 'Cadastre os dados da concessionária antes da equipe.' });
      const member = await prisma.teamMember.create({
        data: { dealershipId: currentDealershipId, name: name.trim(), email: email.trim().toLowerCase(), role, commissionRate: rate },
      });
      broadcast('team.created', { id: member.id, name: member.name, role: member.role });
      return res.status(201).json({ member });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Funcionário não informado.' });
      const { name, email, role, commissionRate, active } = req.body || {};
      const data = {};
      if (name !== undefined) data.name = String(name).trim();
      if (email !== undefined) data.email = String(email).trim().toLowerCase();
      if (role !== undefined) {
        if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Função inválida.' });
        data.role = role;
      }
      if (commissionRate !== undefined) {
        const rate = normalizeRate(commissionRate);
        if (rate === null) return res.status(400).json({ error: 'A comissão deve ficar entre 0% e 20%.' });
        data.commissionRate = rate;
      }
      if (active !== undefined) data.deactivatedAt = active ? null : new Date();
      if (!Object.keys(data).length) return res.status(400).json({ error: 'Nenhuma alteração válida.' });
      const member = await prisma.teamMember.update({ where: { id }, data });
      broadcast('team.updated', { id: member.id, name: member.name, role: member.role, active: !member.deactivatedAt });
      return res.status(200).json({ member });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('api/team error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Funcionário não encontrado.' });
    return res.status(500).json({ error: 'Não foi possível salvar a equipe.' });
  }
};
