const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = name => fs.readFileSync(`${__dirname}/../${name}`, 'utf8');
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const catalog = read('catalog.js');
const context = vm.createContext({
  money: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  escapeHtml: value => String(value ?? ''), imageVersion: value => value, imageSrcset: value => value
});
vm.runInContext(section(catalog, 'function variantsFor(', 'function filtered('), context);
const product = {
  id: 'test', nome: 'Nome original', imagens: ['a.webp'], linha: 'Clássicos', porte: 'Médio',
  variantes: [
    { sku: 'SKU-1', cor: 'Vinho', disponivel: false, estoque: 1, preco: 100, imagens: ['a.webp'] },
    { sku: 'SKU-2', cor: 'Caramelo', disponivel: true, estoque: 1, preco: 100, imagens: ['b.webp'] }
  ]
};
context.product = product;
assert.equal(vm.runInContext('isAvailable(product.variantes[0])', context), false);
assert.equal(vm.runInContext('initialVariantIndex(product)', context), 1);
assert.equal(vm.runInContext('variantLink(product, product.variantes[0])', context), 'produto.html?id=test&sku=SKU-1');
let html = vm.runInContext('card(product)', context);
assert.match(html, /href="produto.html\?id=test&sku=SKU-2"/);
assert.match(html, /Vinho — Indisponível/);
assert.match(html, /<h2>Nome original<\/h2>/);
product.variantes[1].estoque = 0;
html = vm.runInContext('card(product)', context);
assert.match(html, /Este modelo está indisponível/);
assert.match(html, /data-card-badge="test">Indisponível/);
const links = [{}, {}];
const badge = { classList: { toggle() {} } };
context.products = [product];
context.swapCardImage = () => {};
context.document = {
  querySelectorAll: selector => selector.includes('.product-link') ? links : [],
  querySelector: () => badge
};
vm.runInContext(section(catalog, 'function updateCardVariant(', 'function bindVariants('), context);
vm.runInContext('updateCardVariant("test", 0)', context);
assert.ok(links.every(link => link.href === 'produto.html?id=test&sku=SKU-1'));
assert.equal(badge.textContent, 'Este modelo está indisponível');

const checkbox = { checked: false };
const adminContext = vm.createContext({
  refreshVariantCard() {}, updateStockSummary() {}
});
vm.runInContext(section(read('admin.js'), 'function handleVariantInput(', 'function handleVariantAction('), adminContext);
const event = { target: { name: 'variant-estoque', value: '2', closest: () => ({ querySelector: () => checkbox }) } };
adminContext.event = event;
vm.runInContext('handleVariantInput(event)', adminContext);
assert.equal(checkbox.checked, false, 'Editar estoque não deve reativar uma versão desmarcada');
checkbox.checked = true;
event.target.value = '0';
vm.runInContext('handleVariantInput(event)', adminContext);
assert.equal(checkbox.checked, false, 'Zerar estoque deve desativar a versão');
console.log('Disponibilidade, preservação do nome e links por SKU: OK');
