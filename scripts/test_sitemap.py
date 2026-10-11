import pathlib
import unittest
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
import json
import csv

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORIGIN = 'https://maximossignature.com.br/'


class SitemapTest(unittest.TestCase):
    def test_sitemap_matches_public_pages(self):
        tree = ET.fromstring((ROOT / 'sitemap.xml').read_bytes())
        namespace = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
        self.assertEqual(tree.tag, namespace + 'urlset')
        urls = [node.text for node in tree.findall(namespace + 'url/' + namespace + 'loc')]
        catalog = json.loads((ROOT / 'data/products.json').read_text())
        expected = {ORIGIN + page for page in ['', 'catalogo', 'como-comprar',
                    'trocas-e-envios', 'privacidade', 'termos']}
        expected.update(ORIGIN + f"bolsas/{product['id']}-{variant['sku'].lower()}"
                        for product in catalog['products'] for variant in product['variantes'])
        self.assertEqual(set(urls), expected)
        self.assertEqual(len(urls), len(expected))
        with (ROOT / 'data/meta-commerce.csv').open() as source:
            rows = list(csv.DictReader(source))
        product_urls = {url for url in expected if '/bolsas/' in url}
        self.assertEqual({row['link'] for row in rows}, product_urls)
        self.assertEqual(len(rows), len(product_urls))
        for url in urls:
            parsed = urlparse(url)
            self.assertEqual(parsed.scheme, 'https')
            self.assertEqual(parsed.netloc, 'maximossignature.com.br')
            self.assertFalse(parsed.query or parsed.fragment)
            self.assertFalse(parsed.path.endswith('.html'))
            physical = parsed.path.lstrip('/') + '.html' if parsed.path != '/' else 'index.html'
            self.assertTrue((ROOT / physical).is_file(), physical)
        self.assertIn('Sitemap: ' + ORIGIN + 'sitemap.xml', (ROOT / 'robots.txt').read_text())


if __name__ == '__main__':
    unittest.main()
