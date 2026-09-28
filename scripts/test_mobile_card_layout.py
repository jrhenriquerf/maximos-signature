import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class MobileCardLayoutTest(unittest.TestCase):
    def test_catalog_card_keeps_semantic_content_separate(self):
        script = (ROOT / 'catalog.js').read_text(encoding='utf-8')
        self.assertIn('class="product-material"', script)
        self.assertIn('<h2>${escapeHtml(product.nome)}</h2>', script)
        self.assertIn('class="product-price"', script)
        self.assertIn('data-card-old=', script)
        self.assertIn('data-card-condition=', script)

    def test_mobile_catalog_uses_explicit_vertical_hierarchy(self):
        styles = (ROOT / 'mobile-polish.css').read_text(encoding='utf-8')
        self.assertIn('grid-template-areas: "name" "category" "price" "condition" "action"', styles)
        self.assertIn('.product-info h2 { grid-area: name;', styles)
        self.assertIn('.product-material { grid-area: category;', styles)
        self.assertIn('.product-price { grid-area: price;', styles)
        self.assertIn('.product-price strong { display: block;', styles)
        self.assertIn('white-space: nowrap', styles)

    def test_home_and_related_cards_stack_price_on_mobile(self):
        home = (ROOT / 'home.js').read_text(encoding='utf-8')
        product = (ROOT / 'product.js').read_text(encoding='utf-8')
        styles = (ROOT / 'mobile-polish.css').read_text(encoding='utf-8')
        self.assertIn('class="home-card-meta"', home)
        self.assertIn('class="related-card"', product)
        self.assertIn('.home-card-meta { display: grid;', styles)
        self.assertIn('.home-card strong { display: block;', styles)
        self.assertIn('.related-card div { display: grid;', styles)
        self.assertIn('.related-card span { display: block;', styles)


if __name__ == '__main__':
    unittest.main()
