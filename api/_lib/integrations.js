const https = require('https');
const fs = require('fs');

const WEBMOTORS_URL = 'https://integracao.webmotors.com.br/wsEstoqueRevendedorWebMotors.asmx';

function configured(value) {
  return Boolean(String(value || '').trim());
}

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function encodeXml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function xmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function webmotorsStatus() {
  const enabled = configured(process.env.WEBMOTORS_AUTH_HASH);
  return {
    provider: 'Webmotors',
    enabled,
    mode: enabled ? 'producao' : 'demonstracao',
    label: enabled ? 'Pronta para sincronizar' : 'Aguardando hash de autenticação',
    documentationUrl: 'https://integracao.webmotors.com.br/manualintegracao/index.html',
  };
}

function santanderStatus() {
  const mode = process.env.SANTANDER_MODE === 'producao' ? 'producao' : 'demonstracao';
  const credentials = configured(process.env.SANTANDER_CLIENT_ID) && configured(process.env.SANTANDER_CLIENT_SECRET);
  const endpoint = configured(process.env.SANTANDER_TOKEN_URL) && configured(process.env.SANTANDER_FINANCE_URL);
  const certificate = configured(process.env.SANTANDER_CERT_PATH) && configured(process.env.SANTANDER_KEY_PATH);
  const enabled = mode === 'producao' && credentials && endpoint && certificate;
  return {
    provider: 'Santander Financiamentos',
    enabled,
    mode,
    label: enabled ? 'Homologação configurada' : mode === 'demonstracao' ? 'Simulação comercial ativa' : 'Configuração incompleta',
    checklist: { credentials, endpoint, certificate },
    documentationUrl: 'https://developer.santander.com.br/',
  };
}

async function fetchWebmotorsPage(page = 1, pageSize = 100) {
  const authHash = process.env.WEBMOTORS_AUTH_HASH;
  if (!configured(authHash)) {
    const error = new Error('Informe WEBMOTORS_AUTH_HASH para sincronizar o estoque real.');
    error.code = 'INTEGRATION_NOT_CONFIGURED';
    throw error;
  }
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><ObterEstoqueAtualPaginado xmlns="www.webmotors.com.br/wsEstoqueRevendedorWebMotors"><pHashAutenticacao>${encodeXml(authHash)}</pHashAutenticacao><pPagina>${page}</pPagina><pTamanho>${pageSize}</pTamanho></ObterEstoqueAtualPaginado></soap:Body>
</soap:Envelope>`;
  const response = await fetch(WEBMOTORS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'www.webmotors.com.br/wsEstoqueRevendedorWebMotors/ObterEstoqueAtualPaginado',
    },
    body: envelope,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Webmotors respondeu HTTP ${response.status}.`);
  const xml = decodeXml(body);
  const blocks = xml.match(/<Anuncio(?:\s[^>]*)?>[\s\S]*?<\/Anuncio>/gi) || [];
  return {
    page: Number(xmlValue(xml, 'Pagina')) || page,
    total: Number(xmlValue(xml, 'TotalAnuncios')) || blocks.length,
    listings: blocks.map((block) => ({
      externalId: xmlValue(block, 'CodigoAnuncio'),
      make: xmlValue(block, 'DescricaoMarca') || `Marca ${xmlValue(block, 'CodigoMarca')}`,
      model: xmlValue(block, 'DescricaoModelo') || xmlValue(block, 'DescricaoVersao') || `Modelo ${xmlValue(block, 'CodigoModelo')}`,
      year: Number(xmlValue(block, 'AnoDoModelo') || xmlValue(block, 'AnoFabricacao')) || new Date().getFullYear(),
      price: Math.round(Number((xmlValue(block, 'PrecoVenda') || xmlValue(block, 'PrecoReal')).replace(',', '.')) * 100) || 0,
      mileage: Number(xmlValue(block, 'Km')) || 0,
      color: xmlValue(block, 'DescricaoCor') || 'Não informada',
      transmission: xmlValue(block, 'DescricaoCambio') || 'Não informada',
      notes: xmlValue(block, 'Observacao'),
      plate: xmlValue(block, 'Placa'),
    })).filter((item) => item.externalId),
  };
}

async function synchronizeWebmotors(prisma) {
  const page = await fetchWebmotorsPage(1, 100);
  let imported = 0;
  let updated = 0;
  for (const listing of page.listings) {
    const existing = await prisma.vehicle.findFirst({ where: { externalSource: 'webmotors', externalId: listing.externalId } });
    const data = {
      make: listing.make,
      model: listing.model,
      year: listing.year,
      price: listing.price,
      mileage: listing.mileage,
      color: listing.color,
      transmission: listing.transmission,
      dealerNotes: listing.notes || null,
      externalSource: 'webmotors',
      externalId: listing.externalId,
      status: 'active',
    };
    if (existing) {
      await prisma.vehicle.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.vehicle.create({ data: {
        ...data,
        vin: `WEBMOTORS-${listing.externalId}`,
        body: 'Não informado',
        engine: 'Não informado',
        drivetrain: 'Não informado',
        images: '[]',
      } });
      imported += 1;
    }
  }
  return { imported, updated, received: page.listings.length, total: page.total };
}

function httpsJson(urlString, options, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const request = https.request(url, { ...options, timeout: 20000 }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        let data = {};
        try { data = body ? JSON.parse(body) : {}; } catch { data = { resposta: body }; }
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`Santander respondeu HTTP ${response.statusCode}.`));
        resolve(data);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Tempo limite excedido na comunicação com o Santander.')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function mtlsOptions(headers = {}) {
  return {
    method: 'POST',
    headers,
    cert: fs.readFileSync(process.env.SANTANDER_CERT_PATH),
    key: fs.readFileSync(process.env.SANTANDER_KEY_PATH),
    passphrase: process.env.SANTANDER_CERT_PASSPHRASE || undefined,
  };
}

async function submitSantanderProposal(proposal) {
  const status = santanderStatus();
  if (!status.enabled) return { mode: 'demonstracao', externalId: null, response: { mensagem: 'Proposta registrada para atendimento da concessionária; nenhum dado foi enviado ao banco.' } };
  const credentials = Buffer.from(`${process.env.SANTANDER_CLIENT_ID}:${process.env.SANTANDER_CLIENT_SECRET}`).toString('base64');
  const tokenPayload = 'grant_type=client_credentials';
  const token = await httpsJson(process.env.SANTANDER_TOKEN_URL, mtlsOptions({
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(tokenPayload),
  }), tokenPayload);
  if (!token.access_token) throw new Error('O Santander não retornou um token de acesso.');
  const body = JSON.stringify(proposal);
  const response = await httpsJson(process.env.SANTANDER_FINANCE_URL, mtlsOptions({
    Authorization: `Bearer ${token.access_token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }), body);
  return { mode: 'producao', externalId: response.id || response.proposalId || response.numeroProposta || null, response };
}

module.exports = { webmotorsStatus, santanderStatus, synchronizeWebmotors, submitSantanderProposal };
