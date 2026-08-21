/**
 * Modo vitrine (exibição pública).
 *
 * Este repositório é o modelo de demonstração do produto: o painel da
 * concessionária e o painel geral da 3esysten ficam abertos para quem
 * receber o link, sem HTTP Basic Auth.
 *
 * Para reativar as senhas em uma instalação real, defina a variável de
 * ambiente SHOWCASE_MODE=false e configure DASHBOARD_PASSWORD /
 * PLATFORM_ADMIN_PASSWORD.
 */
function showcaseMode() {
  const flag = process.env.SHOWCASE_MODE;
  if (flag === undefined || flag === '') return true;
  return !/^(0|false|off|no|nao|não)$/i.test(String(flag).trim());
}

module.exports = { showcaseMode };
