#!/usr/bin/env node
// Renderiza os mesmos componentes do navegador, sem duplicar o layout dos produtos.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://maximossignature.com.br/';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const jsonScript = value => JSON.stringify(value).replace(/</g, '\\u003c');

function renderContext(script, catalog) {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', dataset: {}, style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener() {}, setAttribute() {}, querySelectorAll() { return []; },
      querySelector: node, showModal() {}, close() {}
    });
    return nodes.get(selector);
  };
  const context = {
    URL, URLSearchParams, Intl, catalogData: catalog,
    document: { querySelector: node, querySelectorAll: () => [], addEventListener() {}, body: node('body'), baseURI: ORIGIN },
    location: { search: '', href: `${ORIGIN}produto.html`, origin: ORIGIN },
    history: { replaceState() {} }, fetch: () => new Promise(() => {}),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    clearTimeout() {}, setTimeout() {}, clearInterval() {}, setInterval() {},
    addEventListener() {}, dispatchEvent() {}, requestAnimationFrame() {},
    CustomEvent: class {}, IntersectionObserver: class { observe() {} },
    scrollY: 0, innerHeight: 900
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('image-utils.js'), context);
  vm.runInContext(read('seo.js'), context);
  context.PRODUCT_SEO.update = () => {};
  vm.runInContext(read(script), context);
  return { context, node };
}

function metadata(data) {
  return `<title>${escape(data.title)}</title>
<meta name="description" content="${escape(data.description)}">
<link rel="canonical" href="${escape(data.url)}">
<meta property="og:title" content="${escape(data.title)}">
<meta property="og:description" content="${escape(data.description)}">
<meta property="og:image" content="${escape(data.image)}">
<meta property="og:image:alt" content="${escape(data.title)}">
<meta property="og:url" content="${escape(data.url)}">
<meta property="og:type" content="product">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Maximos Signature">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(data.title)}">
<meta name="twitter:description" content="${escape(data.description)}">
<meta name="twitter:image" content="${escape(data.image)}">
<script type="application/ld+json" data-product-schema>${jsonScript(data.structured)}</script>`;
}

function versionAssets(html, generated = new Map()) {
  return html.replace(/((?:src|href)=")([^"?]+\.(?:js|css))(?:\?v=[^" ]*)?"/g, (_, prefix, file) => {
    const source = path.join(ROOT, file);
    if (!generated.has(file) && !fs.existsSync(source)) return `${prefix}${file}"`;
    const hash = crypto.createHash('sha256').update(generated.get(file) || fs.readFileSync(source)).digest('hex').slice(0, 12);
    return `${prefix}${file}?v=${hash}"`;
  }).replace(/[ \t]+$/gm, '');
}

function generate(catalog) {
  const outputs = new Map();
  const bundle = (html, filename) => {
    const links = html.match(/<link rel="stylesheet"[^>]*>/g) || [];
    const files = links.flatMap(link => {
      const source = link.match(/data-source-styles="([^"]+)"/);
      return source ? source[1].split(' ') : [link.match(/href="([^"?]+)/)[1]];
    });
    outputs.set(filename, files.map(file => `/* ${file} */\n${read(file)}`).join('\n'));
    let first = true;
    return html.replace(/<link rel="stylesheet"[^>]*>/g, () => {
      if (!first) return '';
      first = false;
      return `<link rel="stylesheet" href="${filename}" data-source-styles="${files.join(' ')}">`;
    });
  };
  const renderer = renderContext('product.js', catalog);
  const template = bundle(read('produto.html'), 'product-bundle.css');
  for (const product of catalog.products) {
    for (let index = 0; index < product.variantes.length; index++) {
      const variant = product.variantes[index];
      if (!/^[a-z0-9-]+$/.test(product.id) || !/^[A-Z0-9._-]+$/.test(variant.sku)) throw new Error('ID/SKU inválido para página pública');
      renderer.context.selectedProduct = product;
      renderer.context.selectedIndex = index;
      vm.runInContext('render(selectedProduct, catalogData.products, selectedIndex)', renderer.context);
      const data = renderer.context.PRODUCT_SEO.details(product, variant);
      const file = renderer.context.PRODUCT_IMAGES.productUrl(product, variant);
      let html = template
        .replace('<head>', '<head><base href="../"><!-- Página gerada por generate_public_pages.cjs -->')
        .replace(/<title>.*?<\/title>/, '')
        .replace(/<meta name="description"[^>]*>/, '')
        .replace('</head>', `${metadata(data)}</head>`)
        .replace(/<main id="produto"[^>]*>[\s\S]*?<\/main>/, `<main id="produto" data-product-page data-product-id="${escape(product.id)}" data-sku="${escape(variant.sku)}">${renderer.node('[data-product-page]').innerHTML}</main>`)
        .replace('<div class="related-grid" data-related></div>', `<div class="related-grid" data-related>${renderer.node('[data-related]').innerHTML}</div>`)
        .replace('data-related-section hidden', 'data-related-section');
      // O link funciona também quando JavaScript está desativado.
      const message = PRODUCT_MESSAGE(product, variant);
      html = html.replace('href="https://wa.me/5514991488234" data-buy', `href="https://wa.me/5514991488234?text=${encodeURIComponent(message)}" data-buy`);
      outputs.set(file, versionAssets(html, outputs));
    }
  }
  const home = renderContext('home.js', catalog);
  vm.runInContext('renderProducts([...catalogData.products].sort((a,b) => a.ordem-b.ordem))', home.context);
  let homeHtml = bundle(read('index.html'), 'home-bundle.css').replace(/(<div class="home-products" data-home-products>)[\s\S]*?(<\/div>\s*<\/section>)/, (_, start, end) => `${start}${home.node('[data-home-products]').innerHTML}${end}`);
  if (!homeHtml.includes('data-organization-schema')) {
    homeHtml = homeHtml.replace('</head>', `<script type="application/ld+json" data-organization-schema>${jsonScript({
      '@context': 'https://schema.org', '@type': 'Organization', name: 'Maximos Signature', url: ORIGIN,
      logo: `${ORIGIN}assets/logo-assinatura-preta-web.webp`, email: 'maximos.signature@gmail.com',
      telephone: '+5514991488234', sameAs: ['https://www.instagram.com/maximos.signature/']
    })}</script></head>`);
  }
  outputs.set('index.html', versionAssets(homeHtml, outputs));
  const catalogRenderer = renderContext('catalog.js', catalog);
  vm.runInContext('products = catalogData.products; renderCategoryFilters(); render()', catalogRenderer.context);
  const catalogHtml = bundle(read('catalogo.html'), 'catalog-bundle.css')
    .replace(/(<div class="product-grid" data-catalog[^>]*>)[\s\S]*?(<\/div>\s*<nav class="pagination")/, (_, start, end) => `${start.replace('aria-busy="true"', 'aria-busy="false"')}${catalogRenderer.node('[data-catalog]').innerHTML}${end}`)
    .replace(/(<div class="filters category-filters"[^>]*>)[\s\S]*?(<\/div><\/div>)/, (_, start, end) => `${start}${catalogRenderer.node('[data-categories]').innerHTML}${end}`)
    .replace(/<strong data-count>[^<]*<\/strong>/, `<strong data-count>${catalog.products.length}</strong>`);
  outputs.set('catalogo.html', versionAssets(catalogHtml, outputs));
  outputs.set('produto.html', versionAssets(template, outputs));
  for (const file of ['como-comprar.html', 'trocas-e-envios.html', 'privacidade.html', 'termos.html']) outputs.set(file, versionAssets(bundle(read(file), 'information-bundle.css'), outputs));
  const pages = ['', 'catalogo.html', 'como-comprar.html', 'trocas-e-envios.html', 'privacidade.html', 'termos.html', ...[...outputs.keys()].filter(file => file.startsWith('bolsas/'))];
  outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(file => `  <url><loc>${escape(ORIGIN + file)}</loc></url>`).join('\n')}\n</urlset>\n`);
  outputs.set('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /scripts/\nDisallow: /.local-backups/\nSitemap: ${ORIGIN}sitemap.xml\n`);
  return outputs;
}

function PRODUCT_MESSAGE(product, variant) {
  const available = variant.disponivel !== false && Number(variant.estoque ?? 1) > 0;
  return available
    ? `Olá! Tenho interesse na ${product.nome} (${variant.cor} — ${variant.sku}). Poderia calcular o frete e me enviar o link de pagamento?`
    : `Olá! Gostaria de saber sobre a reposição da ${product.nome} (${variant.cor} — ${variant.sku}).`;
}

function main() {
  const outputs = generate(JSON.parse(read('data/products.json')));
  const check = process.argv.includes('--check');
  let different = false;
  for (const [file, content] of outputs) {
    const target = path.join(ROOT, file);
    if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) continue;
    if (check) { console.error(`Desatualizado: ${file}`); different = true; }
    else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
  }
  const folder = path.join(ROOT, 'bolsas');
  if (fs.existsSync(folder)) for (const file of fs.readdirSync(folder)) {
    const relative = `bolsas/${file}`;
    if (outputs.has(relative) || !file.endsWith('.html') || !read(relative).includes('Página gerada por generate_public_pages.cjs')) continue;
    if (check) { console.error(`Página removida ainda publicada: ${relative}`); different = true; }
    else fs.unlinkSync(path.join(ROOT, relative));
  }
  if (different) { process.exitCode = 1; return; }
  console.log(`Páginas públicas ${check ? 'validadas' : 'geradas'}: ${outputs.size}; 1 página por SKU.`);
}

module.exports = { generate, renderContext, versionAssets };
if (require.main === module) main();
