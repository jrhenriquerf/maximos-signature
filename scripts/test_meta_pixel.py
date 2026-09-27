import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLIC_PAGES = ('index.html', 'catalogo.html', 'produto.html')


class MetaPixelIntegrationTest(unittest.TestCase):
    def test_public_pages_load_consent_assets(self):
        for page in PUBLIC_PAGES:
            html = (ROOT / page).read_text(encoding='utf-8')
            with self.subTest(page=page):
                self.assertIn('analytics.css', html)
                self.assertIn('analytics.js', html)
                self.assertLess(html.index('config.js'), html.index('analytics.js'))

    def test_pixel_requires_consent(self):
        script = (ROOT / 'analytics.js').read_text(encoding='utf-8')
        self.assertIn("consent === 'granted'", script)
        self.assertIn("window.fbq('consent', 'grant')", script)
        self.assertNotIn('<noscript', script)

    def test_expected_events_only(self):
        script = (ROOT / 'analytics.js').read_text(encoding='utf-8')
        product = (ROOT / 'product.js').read_text(encoding='utf-8')
        self.assertIn("'PageView'", script)
        self.assertIn("'ViewContent'", script)
        self.assertIn("'Contact'", script)
        self.assertNotIn("'Purchase'", script)
        self.assertIn('content_ids: [variant.sku || product.id]', product)
        self.assertIn("currency: 'BRL'", product)

    def test_pixel_id_is_centralized(self):
        config = (ROOT / 'config.js').read_text(encoding='utf-8')
        self.assertIn("metaPixelId: '1011169471576704'", config)

    def test_privacy_control_is_floating_and_accessible(self):
        script = (ROOT / 'analytics.js').read_text(encoding='utf-8')
        styles = (ROOT / 'analytics.css').read_text(encoding='utf-8')
        self.assertNotIn("querySelector('.site-footer')", script)
        self.assertIn('document.body.appendChild(button)', script)
        self.assertIn("aria-controls', 'privacy-consent-panel", script)
        self.assertIn("aria-haspopup', 'dialog", script)
        self.assertIn("event.key === 'Escape'", script)
        self.assertIn('previousFocus.focus()', script)
        self.assertIn('position:fixed', styles)
        self.assertIn('left:max(1rem,env(safe-area-inset-left))', styles)
        self.assertIn('@media(max-width:700px)', styles)
        self.assertIn('.has-social-float .privacy-preferences', styles)

    def test_whatsapp_opens_secure_new_tab(self):
        config = (ROOT / 'config.js').read_text(encoding='utf-8')
        self.assertIn("link.target = '_blank'", config)
        self.assertIn("link.rel = 'noopener noreferrer'", config)
        self.assertNotIn('window.open(', config)
        for filename in ('home.js', 'catalog.js', 'product.js', 'script.js'):
            script = (ROOT / filename).read_text(encoding='utf-8')
            with self.subTest(filename=filename):
                self.assertIn('window.prepareWhatsAppLink?.(', script)
                self.assertNotIn('location.href = `https://wa.me/', script)
                self.assertNotIn('window.open(', script)


if __name__ == '__main__':
    unittest.main()
