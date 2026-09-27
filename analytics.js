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

  function banner() {
    let element = document.querySelector('[data-privacy-consent]');
    if (element) return element;
    element = document.createElement('aside');
    element.className = 'privacy-consent';
    element.dataset.privacyConsent = '';
    element.id = 'privacy-consent-panel';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', 'Preferências de privacidade');
    element.innerHTML = `<p>Usamos o Pixel da Meta para medir visitas e contatos pelo WhatsApp e melhorar futuros anúncios. Ele só será ativado com sua autorização. Saiba mais na <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener">Política de Privacidade da Meta</a>.</p><div class="privacy-consent__actions"><button type="button" data-consent-reject>Continuar sem medição</button><button type="button" data-consent-accept>Aceitar medição</button></div>`;
    document.body.appendChild(element);
    const hideBanner = () => {
      element.hidden = true;
      if (previousFocus?.isConnected) previousFocus.focus();
      previousFocus = null;
    };
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
      const element = banner();
      element.hidden = false;
      element.querySelector('[data-consent-accept]').focus();
    });
    if (document.querySelector('.social-float')) document.body.classList.add('has-social-float');
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
    else if (consent !== 'denied') banner();
  });
})();
