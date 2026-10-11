const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync(`${__dirname}/../${name}`, 'utf8');

function setup(savedConsent = null) {
  const events = new Map(), nodes = new Map(), scripts = [], session = new Map();
  const consent = new Map(savedConsent ? [['maximos_analytics_consent_v1', savedConsent]] : []);
  class Node {
    constructor() { this.dataset = {}; this.listeners = new Map(); this.isConnected = true; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    querySelector(selector) { return get(selector); }
    setAttribute() {}
    focus() {}
    click() { this.listeners.get('click')?.({ currentTarget: this }); }
  }
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, new Node()); return nodes.get(selector); };
  const document = {
    baseURI: 'https://maximossignature.com.br/bolsas/modelo-sku',
    querySelector: selector => nodes.get(selector) || null,
    querySelectorAll: () => [],
    createElement: () => new Node(),
    head: { appendChild: script => scripts.push(script) },
    body: { appendChild: node => {
      if (node.className === 'privacy-consent') nodes.set('[data-privacy-consent]', node);
      if (node.className === 'privacy-preferences') nodes.set('.privacy-preferences', node);
    } },
    addEventListener: (name, callback) => { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); }
  };
  const context = {
    URL, URLSearchParams, document, location: { search: '?utm_source=instagram', origin: 'https://maximossignature.com.br' },
    localStorage: { getItem: key => consent.get(key), setItem: (key, value) => consent.set(key, value) },
    sessionStorage: { getItem: key => session.get(key), setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) },
    MutationObserver: class { observe() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    addEventListener: document.addEventListener,
    dispatchEvent: event => (events.get(event.type) || []).forEach(callback => callback(event))
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['campaign.js', 'config.js', 'analytics.js']) vm.runInContext(read(file), context);
  const dispatch = (type, detail) => context.dispatchEvent({ type, detail });
  dispatch('DOMContentLoaded');
  const click = selector => {
    if (!nodes.has('[data-privacy-consent]')) get('.privacy-preferences').click();
    get(selector).click();
  };
  return { context, scripts, session, dispatch, click, events };
}

const detail = { content_ids: ['MX-BAG-007'], content_name: 'Aura', value: 100, currency: 'BRL' };
const app = setup();
app.dispatch('maximos:viewcontent', detail);
app.dispatch('maximos:contact', detail);
assert.equal(app.scripts.length, 0);
assert.equal(app.context.fbq, undefined);
app.click('[data-consent-reject]');
assert.equal(app.scripts.length, 0);
assert.equal(app.session.size, 0);
app.click('[data-consent-accept]');
assert.equal(app.scripts.length, 1);
const queue = app.context.fbq.queue;
const auto = queue.findIndex(args => args[0] === 'set' && args[1] === 'autoConfig');
const init = queue.findIndex(args => args[0] === 'init');
assert.ok(auto >= 0 && auto < init);
assert.equal(queue[auto][2], false);
assert.deepEqual(Array.from(queue.filter(args => args[0] === 'track'), args => args[1]), ['PageView', 'ViewContent']);
// Revogação enquanto o SDK carrega: nenhum evento deve aguardar reenvio.
app.click('[data-consent-reject]');
assert.equal(app.context.fbq.queue.filter(args => args[0] === 'track').length, 0);
assert.equal(app.context.fbq.queue.at(-1)[1], 'revoke');
assert.equal(app.session.size, 0);
const calls = [];
app.context.fbq.callMethod = (...args) => calls.push(args);
app.dispatch('maximos:viewcontent', { ...detail, content_ids: ['MX-BAG-008'] });
app.dispatch('maximos:contact', detail);
assert.equal(calls.length, 0);
app.click('[data-consent-accept]');
assert.equal(app.scripts.length, 1);
assert.equal(app.context.fbq.queue.filter(args => args[0] === 'init').length, 1);
assert.deepEqual(calls.map(args => args[1]), ['grant', 'PageView', 'ViewContent']);
app.click('[data-consent-accept]');
assert.deepEqual(calls.map(args => args[1]), ['grant', 'PageView', 'ViewContent']);
const link = { dataset: { sku: 'MX-BAG-007', productName: 'Aura', price: '100' } };
app.context.prepareWhatsAppLink(link, 'Olá');
const contacts = calls.filter(args => args[0] === 'track' && args[1] === 'Contact');
assert.equal(contacts.length, 1);
assert.equal(contacts[0][2].content_ids[0], 'MX-BAG-007');
assert.equal(contacts[0][2].value, 100);
assert.equal(contacts[0][2].currency, 'BRL');
app.click('[data-consent-reject]');
const count = calls.length;
app.context.prepareWhatsAppLink(link, 'Olá');
app.dispatch('maximos:viewcontent', detail);
assert.equal(calls.length, count);
assert.equal(app.session.size, 0);
assert.equal(app.events.get('maximos:contact').length, 1);
const denied = setup('denied');
denied.dispatch('maximos:viewcontent', detail);
assert.equal(denied.scripts.length, 0);
const granted = setup('granted');
assert.equal(granted.scripts.length, 1);
assert.equal(granted.session.size, 1);
granted.click('[data-consent-reject]');
assert.equal(granted.session.size, 0);
console.log('Consentimento: bloqueio, autoConfig antes de init, revogação com SDK pendente, reaceitação e Contact único: OK');
