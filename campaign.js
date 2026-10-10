(function () {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'];
  const storageKey = 'maximos_campaign_v1';
  const consentKey = 'maximos_analytics_consent_v1';
  const clean = value => String(value || '').replace(/[^\p{L}\p{N} ._\-/]/gu, '').trim().slice(0, 100);
  const read = (storage, key) => { try { return storage.getItem(key); } catch { return null; } };
  const query = new URLSearchParams(location.search);
  let consent = null;
  try { consent = read(localStorage, consentKey); } catch { /* Armazenamento indisponível. */ }
  let campaign = Object.fromEntries(keys.map(key => [key, clean(query.get(key))]).filter(([, value]) => value));
  if (consent === 'granted' && !Object.keys(campaign).length) {
    try {
      const saved = JSON.parse(read(sessionStorage, storageKey) || '{}');
      campaign = Object.fromEntries(keys.map(key => [key, clean(saved[key])]).filter(([, value]) => value));
    } catch { /* Dados antigos ou armazenamento indisponível. */ }
  }
  function decorateUrl(value) {
    const url = new URL(value, document.baseURI);
    if (consent === 'granted' && url.origin === location.origin) {
      for (const [key, content] of Object.entries(campaign)) if (!url.searchParams.has(key)) url.searchParams.set(key, content);
    }
    return url;
  }
  function decorateLinks() {
    if (consent !== 'granted') return;
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || !/^https?:|^[^:]+$/i.test(href)) return;
      const url = decorateUrl(href);
      if (url.origin === location.origin && link.href !== url.href) link.href = url.href;
    });
  }
  function setConsent(value) {
    consent = value;
    try {
      if (value === 'granted' && Object.keys(campaign).length) sessionStorage.setItem(storageKey, JSON.stringify(campaign));
      else if (value !== 'granted') sessionStorage.removeItem(storageKey);
    } catch { /* A navegação continua sem armazenamento. */ }
    if (value !== 'granted') {
      document.querySelectorAll('a[href]').forEach(link => {
        const url = new URL(link.href, document.baseURI);
        if (url.origin !== location.origin) return;
        keys.forEach(key => url.searchParams.delete(key));
        if (url.href !== link.href) link.href = url.href;
      });
    } else decorateLinks();
  }
  function messageSuffix() {
    if (consent !== 'granted') return '';
    const parts = [['Origem', campaign.utm_source], ['Campanha', campaign.utm_campaign], ['Anúncio', campaign.utm_content]];
    const label = parts.filter(([, value]) => value).map(([name, value]) => `${name}: ${value}`).join(' · ');
    return label ? `\n\n${label}` : '';
  }
  window.CAMPAIGN = { decorateUrl, setConsent, messageSuffix };
  document.addEventListener('DOMContentLoaded', () => {
    if (consent) setConsent(consent);
    new MutationObserver(decorateLinks).observe(document.body, { childList: true, subtree: true });
  });
}());
