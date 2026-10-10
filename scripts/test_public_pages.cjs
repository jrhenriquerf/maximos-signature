const assert = require('node:assert/strict');
const fs = require('node:fs');
const { generate } = require('./generate_public_pages.cjs');
const catalog = JSON.parse(fs.readFileSync(`${__dirname}/../data/products.json`, 'utf8'));
const output = generate(catalog);
for (const product of catalog.products) for (const variant of product.variantes) {
  const filename = `bolsas/${product.id}-${variant.sku.toLowerCase()}.html`;
  const html = output.get(filename);
  assert.ok(html, `Página ausente: ${variant.sku}`);
  assert.ok(html.includes(`data-sku="${variant.sku}"`));
  assert.match(html, /<h1>[^<]+<\/h1>/);
  assert.ok(html.includes(variant.cor.replace(/&/g, '&amp;')));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json" data-product-schema>(.*?)<\/script>/s)[1]);
  const data = schema['@graph'][0];
  assert.equal(data.sku, variant.sku);
  assert.equal(data.offers.price, Number(variant.preco).toFixed(2));
  assert.equal(data.offers.availability.endsWith('/InStock'), variant.disponivel !== false && Number(variant.estoque) > 0);
  assert.ok(data.offers.url.endsWith(filename));
  assert.ok(output.get('sitemap.xml').includes(data.offers.url));
  assert.ok(html.includes('https://wa.me/5514991488234?text='));
}
assert.equal(output.get('index.html').match(/class="home-card /g).length, 6);
assert.equal(output.get('catalogo.html').match(/data-product-card=/g).length, 8);
// Mudança de catálogo precisa se refletir na página e no sitemap, inclusive novos SKUs.
const changed = JSON.parse(JSON.stringify(catalog));
const product = changed.products[0];
const variant = product.variantes[0];
variant.preco = 123.45;
variant.disponivel = false;
variant.cor = 'Teste <seguro> & novo';
variant.sku = 'MX-NEW';
const changedHtml = generate(changed).get(`bolsas/${product.id}-mx-new.html`);
assert.match(changedHtml, /Teste &lt;seguro&gt; &amp; novo/);
assert.match(changedHtml, /"price":"123.45"/);
assert.match(changedHtml, /"availability":"https:\/\/schema.org\/OutOfStock"/);
assert.ok(!changedHtml.includes('Teste <seguro>'));
console.log('Páginas por SKU: conteúdo, preços, estoque, sitemap e escape de HTML: OK');
