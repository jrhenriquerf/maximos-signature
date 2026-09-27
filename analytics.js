(() => {
  const pixelId = String(window.SITE_CONFIG?.metaPixelId || '').trim();
  const consentKey = 'maximos_analytics_consent_v1';
  const trackedProducts = new Set();
  let enabled = false;
  let initialized = false;
  let lastViewContent = null;
  let previousFocus = null;

  function readConsent() {
    try { return localStorage.getItem(consentKey); } catch { return null; }
  }

  function writeConsent(value) {
    try { localStorage.setItem(consentKey, value); } catch { /* Navegação privada pode bloquear o armazenamento. */ }
  }

  function loadPixel() {
    if (enabled || !pixelId) return;
    enabled = true;
    if (!window.fbq) {
      const fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.fbq('consent', 'grant');
    if (!initialized) {
      window.fbq('init', pixelId);
      initialized = true;
    }
    window.fbq('track', 'PageView');
    if (lastViewContent) trackViewContent(lastViewContent);
  }

  function disablePixel() {
    if (!enabled) return;
    enabled = false;
    trackedProducts.clear();
    window.fbq?.('consent', 'revoke');
  }

  function trackViewContent(detail) {
    if (!enabled || !detail) return;
    const productKey = String(detail.content_ids?.[0] || detail.content_name || 'product');
    if (trackedProducts.has(productKey)) return;
    trackedProducts.add(productKey);
    window.fbq('track', 'ViewContent', detail);
  }

  function trackContact() {
    if (!enabled) return;
    window.fbq('track', 'Contact', { contact_channel: 'WhatsApp' });
  }

  function showConsentView(element, detailed) {
    element.dataset.consentView = detailed ? 'details' : 'summary';
    element.querySelector('[data-consent-summary]').hidden = detailed;
    element.querySelector('[data-consent-detail]').hidden = !detailed;
    element.querySelector('[data-consent-details]').hidden = detailed;
    const title = element.querySelector('[data-consent-title]');
    title.textContent = detailed ? 'Cookies opcionais e medição' : 'Sua privacidade';
    element.setAttribute('aria-label', title.textContent);
  }

  function banner(detailed = false) {
    let element = document.querySelector('[data-privacy-consent]');
    if (element) { showConsentView(element, detailed); return element; }
    element = document.createElement('aside');
    element.className = 'privacy-consent';
    element.dataset.privacyConsent = '';
    element.id = 'privacy-consent-panel';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', 'Preferências de privacidade');
    element.innerHTML = `<div class="privacy-consent__copy"><h2 data-consent-title tabindex="-1">Sua privacidade</h2><p data-consent-summary>Usamos cookies e tecnologias semelhantes opcionais para entender como o site é usado, medir resultados e melhorar sua experiência. Você pode aceitar ou recusar esses recursos.</p><p data-consent-detail hidden>Atualmente usamos o Meta Pixel, uma tecnologia opcional de medição e marketing, para registrar os eventos PageView (visita à página), ViewContent (visualização de produto) e Contact (contato pelo WhatsApp). O Pixel permanece bloqueado até você aceitar. Saiba mais na <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Política de Privacidade da Meta</a>.</p><button type="button" class="privacy-consent__details" data-consent-details>Ver detalhes</button></div><div class="privacy-consent__actions"><button type="button" data-consent-reject>Recusar opcionais</button><button type="button" data-consent-accept>Aceitar opcionais</button></div>`;
    document.body.appendChild(element);
    const hideBanner = () => {
      element.hidden = true;
      const focusTarget = previousFocus?.isConnected ? previousFocus : document.querySelector('.privacy-preferences');
      previousFocus = null;
      focusTarget?.focus();
    };
    element.querySelector('[data-consent-details]').addEventListener('click', () => {
      showConsentView(element, true);
      element.querySelector('[data-consent-title]').focus();
    });
    element.querySelector('[data-consent-accept]').addEventListener('click', () => {
      writeConsent('granted');
      hideBanner();
      loadPixel();
    });
    element.querySelector('[data-consent-reject]').addEventListener('click', () => {
      writeConsent('denied');
      hideBanner();
      disablePixel();
    });
    element.addEventListener('keydown', event => {
      if (event.key === 'Escape') hideBanner();
    });
    showConsentView(element, detailed);
    return element;
  }

  function addPreferencesControl() {
    if (document.querySelector('.privacy-preferences')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'privacy-preferences';
    button.setAttribute('aria-label', 'Abrir preferências de privacidade');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'privacy-consent-panel');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z"/><path d="M9.5 12.2 11.2 14l3.7-4"/></svg><span>Privacidade</span>';
    button.addEventListener('click', () => {
      previousFocus = document.activeElement;
      const element = banner(true);
      element.hidden = false;
      element.querySelector('[data-consent-accept]').focus();
    });
    document.body.appendChild(button);
  }

  addEventListener('maximos:viewcontent', event => {
    lastViewContent = event.detail;
    trackViewContent(lastViewContent);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-whatsapp],[data-contact],[data-buy],.js-whatsapp')) trackContact();
  }, { capture: true });

  document.addEventListener('DOMContentLoaded', () => {
    addPreferencesControl();
    const consent = readConsent();
    if (consent === 'granted') loadPixel();
    else if (consent !== 'denied') {
      const element = banner();
      element.querySelector('[data-consent-reject]').focus();
    }
  });
})();
