(() => {
  const pixelId = String(window.SITE_CONFIG?.metaPixelId || '').trim();
  const consentKey = 'maximos_analytics_consent_v1';
  const trackedProducts = new Set();
  let enabled = false;
  let initialized = false;
  let lastViewContent = null;

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

  function banner() {
    let element = document.querySelector('[data-privacy-consent]');
    if (element) return element;
    element = document.createElement('aside');
    element.className = 'privacy-consent';
    element.dataset.privacyConsent = '';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', 'Preferências de privacidade');
    element.innerHTML = `<p>Usamos o Pixel da Meta para medir visitas e contatos pelo WhatsApp e melhorar futuros anúncios. Ele só será ativado com sua autorização. Saiba mais na <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener">Política de Privacidade da Meta</a>.</p><div class="privacy-consent__actions"><button type="button" data-consent-reject>Continuar sem medição</button><button type="button" data-consent-accept>Aceitar medição</button></div>`;
    document.body.appendChild(element);
    element.querySelector('[data-consent-accept]').addEventListener('click', () => {
      writeConsent('granted');
      element.hidden = true;
      loadPixel();
    });
    element.querySelector('[data-consent-reject]').addEventListener('click', () => {
      writeConsent('denied');
      element.hidden = true;
      disablePixel();
    });
    return element;
  }

  function addPreferencesControl() {
    const footer = document.querySelector('.site-footer');
    if (!footer || footer.querySelector('.privacy-preferences')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'privacy-preferences';
    button.textContent = 'Preferências de privacidade';
    button.addEventListener('click', () => {
      const element = banner();
      element.hidden = false;
      element.querySelector('[data-consent-accept]').focus();
    });
    footer.appendChild(button);
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
    else if (consent !== 'denied') banner();
  });
})();
