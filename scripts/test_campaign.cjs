const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../campaign.js`, 'utf8');
function setup(consent, search = '?utm_source=instagram&utm_campaign=colecao&utm_content=video1&email=private@example.com') {
  const session = new Map();
  const context = {
    URL, URLSearchParams, location: { search, origin: 'https://example.com' },
    document: { baseURI: 'https://example.com/', querySelectorAll: () => [], addEventListener() {} },
    localStorage: { getItem: () => consent },
    sessionStorage: { getItem: key => session.get(key), setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) },
    MutationObserver: class { observe() {} }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { campaign: context.CAMPAIGN, session, context };
}
const pending = setup(null);
assert.equal(pending.session.size, 0);
assert.equal(pending.campaign.messageSuffix(), '');
assert.equal(pending.campaign.decorateUrl('catalogo.html').search, '');
pending.campaign.setConsent('granted');
assert.equal(pending.session.size, 1);
assert.match(pending.campaign.messageSuffix(), /Origem: instagram · Campanha: colecao · Anúncio: video1/);
const product = pending.campaign.decorateUrl('bolsas/aura-mx-001.html');
assert.equal(product.searchParams.get('utm_source'), 'instagram');
assert.equal(product.searchParams.get('email'), null);
assert.equal(pending.campaign.decorateUrl('https://wa.me/5514').search, '');
pending.campaign.setConsent('denied');
assert.equal(pending.session.size, 0);
assert.equal(pending.campaign.messageSuffix(), '');
assert.equal(pending.campaign.decorateUrl('catalogo.html').search, '');
const denied = setup('denied');
assert.equal(denied.session.size, 0);
assert.equal(denied.campaign.messageSuffix(), '');
denied.context.sessionStorage.setItem = () => { throw new Error('blocked'); };
assert.doesNotThrow(() => denied.campaign.setConsent('granted'));
const unsafe = setup('granted', '?utm_source=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
assert.ok(!unsafe.campaign.messageSuffix().includes('<'));
console.log('Campanhas: consentimento, revogação, parâmetros permitidos e armazenamento bloqueado: OK');
