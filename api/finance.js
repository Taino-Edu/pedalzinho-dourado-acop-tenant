const { prisma } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { broadcast } = require('./_lib/events');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      const applications = await prisma.financeApplication.findMany({ orderBy: { createdAt: 'desc' } });
      return res.status(200).json({ applications });
    }

    if (req.method === 'POST') {
      const { name, email, phone, carName, vehicleId, downPayment, loanTerm, apr, monthlyPayment } = req.body || {};

      if (!name || !email || !phone || !carName || monthlyPayment === undefined) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
      }

      const lead = await prisma.lead.create({
        data: {
          carId: vehicleId || null,
          carName,
          name,
          email,
          phone,
          source: 'simulador-financiamento',
        },
      });

      const application = await prisma.financeApplication.create({
        data: {
          leadId: lead.id,
          vehicleId: vehicleId || null,
          downPayment: Math.round(downPayment) || 0,
          loanTerm: parseInt(loanTerm) || 60,
          apr: parseFloat(apr) || 0,
          monthlyPayment: Math.round(monthlyPayment),
          provider: 'Simulador interno',
          status: 'pending',
          approvalDetails: JSON.stringify({ mode: 'estimativa', disclaimer: 'Sujeito a análise de crédito e CET da instituição escolhida.' }),
        },
      });

      broadcast('lead.created', { id: lead.id, name: lead.name, carName: lead.carName, status: lead.status });
      return res.status(201).json({ id: application.id, leadId: lead.id, provider: 'Simulador interno', mode: 'estimativa', message: 'Simulação registrada. A concessionária entrará em contato para continuar o atendimento.' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('Erro na API de financiamento:', err);
    return res.status(500).json({ error: 'Não foi possível registrar a proposta de financiamento.' });
  }
};
