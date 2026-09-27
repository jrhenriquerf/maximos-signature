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


if __name__ == '__main__':
    unittest.main()
