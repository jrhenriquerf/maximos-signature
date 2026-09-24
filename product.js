const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const id = new URLSearchParams(location.search).get('id');
const page = document.querySelector('[data-product-page]');
const dialog = document.querySelector('[data-dialog]');
let activeMessage = '';

const escapeHtml = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
const whatsappIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8.2 7.6c.5 4.3 3.2 7 7.5 7.5l1.1-1.6-2.5-1.2-.9 1c-1.6-.7-2.9-2-3.6-3.6l1-1-1.1-2.4-1.5 1.3Z"/></svg>';

const menuToggle = document.querySelector('.menu-toggle');
function setStoreMenu(open) {
  const storeHeader = document.querySelector('[data-header]');
  storeHeader.classList.toggle('menu-open', open);
  document.body.classList.toggle('menu-visible', open);
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuToggle?.setAttribute('aria-label', open ? 'Fechar navegacao' : 'Abrir navegacao');
  const label = menuToggle?.querySelector('.visually-hidden');
  if (label) label.textContent = open ? 'Fechar navegacao' : 'Abrir navegacao';
}
menuToggle?.addEventListener('click', () => setStoreMenu(!document.querySelector('[data-header]').classList.contains('menu-open')));
document.querySelector('[data-header] nav')?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setStoreMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setStoreMenu(false);
});

function productVariants(product) {
  if (product.variantes?.length) return product.variantes;
  return [{
    id: `${product.id}-principal`, sku: '', cor: product.cores?.[0] || 'Modelo principal',
    preco: product.preco, precoAnterior: product.precoAnterior, disponivel: product.disponivel,
    medidas: product.medidas, imagens: product.imagens || []
  }];
}

function render(product, all, variantIndex = 0) {
  const variants = productVariants(product);
  const variant = variants[variantIndex] || variants[0];
  const images = variant.imagens?.length ? variant.imagens : product.imagens;
  const price = Number(variant.preco ?? product.preco);
  const previousPrice = Number(variant.precoAnterior ?? product.precoAnterior) || null;
  const available = variant.disponivel ?? product.disponivel;
  const measuresData = variant.medidas || product.medidas;
  const old = previousPrice ? `<del>${money.format(previousPrice)}</del>` : '';
  const discount = previousPrice ? Math.round((1 - price / previousPrice) * 100) : 0;
  const materials = (product.materiais || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const colors = (product.cores || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const measures = measuresData ? `${measuresData.largura} × ${measuresData.altura} × ${measuresData.profundidade} cm` : 'Confirme as dimensões no atendimento';
  const thumbs = images.map((image, index) => `<button class="thumb ${index === 0 ? 'active' : ''}" type="button" data-image="${escapeHtml(image)}" data-index="${index}" aria-label="Ver imagem ${index + 1}"><img src="${escapeHtml(image)}" alt=""></button>`).join('');
  const variationOptions = variants.map((item, index) => `<button class="variation ${index === variantIndex ? 'active' : ''}" type="button" data-variant-index="${index}" title="${escapeHtml(item.cor)}${item.sku ? ` — ${escapeHtml(item.sku)}` : ''}" aria-label="Selecionar ${escapeHtml(item.cor)}"><img src="${escapeHtml(item.imagens?.[0] || product.imagens?.[0])}" alt=""><span>${escapeHtml(item.cor)}</span></button>`).join('');

  document.title = `${product.nome} — Maximos Signature`;
  document.querySelector('meta[name="description"]').content = product.resumo;
  page.innerHTML = `<article class="product-shell">
    <p class="breadcrumb"><a href="index.html">Início</a> / <a href="catalogo.html">Bolsas</a> / ${escapeHtml(product.nome)}</p>
    <div class="gallery">
      <div class="thumbs">${thumbs}</div>
      <figure class="main-photo" data-zoom-area>
        <img src="${escapeHtml(images[0])}" alt="${escapeHtml(product.nome)} — ${escapeHtml(variant.cor)}" data-main-image>
        ${product.imagemConceitual ? '<span class="concept-badge">Imagem conceitual</span>' : ''}
        <span class="zoom-hint" aria-hidden="true">＋ Passe o mouse para ampliar</span>
        <span class="photo-count"><b data-current>1</b> / ${images.length}</span>
      </figure>
    </div>
    <div class="product-panel">
      <div class="product-tag"><span class="tag">Couro legítimo</span>${discount ? `<span class="tag sale">-${discount}%</span>` : ''}</div>
      <h1>${escapeHtml(product.nome)}</h1>
      <p class="summary">${escapeHtml(product.resumo)}</p>
      <div class="price-row"><strong>${money.format(price)}</strong>${old}</div>
      <p class="payment-note">Consulte formas de pagamento e entrega no atendimento.</p>
      <span class="availability ${available ? '' : 'no'}">${available ? 'Disponível' : 'Disponibilidade sob consulta'}</span>
      ${variants.length > 1 ? `<div class="variation-title"><span>Cor: <strong>${escapeHtml(variant.cor)}</strong></span><span>${variants.length} opções</span></div><div class="variation-options">${variationOptions}</div>` : `<p class="single-variant">Cor: <strong>${escapeHtml(variant.cor)}</strong>${variant.sku ? `<span>SKU ${escapeHtml(variant.sku)}</span>` : ''}</p>`}
      <a class="buy-button" href="#" data-buy><span class="button-label">${whatsappIcon}${available ? 'Comprar pelo WhatsApp' : 'Consultar disponibilidade'}</span><b>→</b></a>
      <div class="benefits"><span>Atendimento direto</span><span>Feito no Brasil</span><span>Pequena escala</span></div>
      <div class="details">
        <details open><summary>Descrição</summary><p>${escapeHtml(product.descricao)}</p></details>
        <details><summary>Material e acabamento</summary><ul>${materials}</ul></details>
        <details><summary>Cores disponíveis</summary><ul>${colors}</ul></details>
        <details><summary>Dimensões</summary><p>${measures}${variant.pesoKg ? `<br>Peso informado: ${escapeHtml(variant.pesoKg)} kg` : ''}${variant.sku ? `<br>SKU: ${escapeHtml(variant.sku)}` : ''}</p></details>
      </div>
    </div>
  </article>`;

  document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => selectImage(button)));
  document.querySelectorAll('[data-variant-index]').forEach(button => button.addEventListener('click', () => {
    const scrollY = window.scrollY;
    render(product, all, Number(button.dataset.variantIndex));
    window.scrollTo(0, scrollY);
  }));
  document.querySelector('[data-buy]').addEventListener('click', event => contact(event, product, variant));
  setupZoom();
  renderRelated(all.filter(item => item.id !== product.id).slice(0, 4));
}

function selectImage(button) {
  document.querySelectorAll('.thumb').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const image = document.querySelector('[data-main-image]');
  image.style.opacity = '0';
  setTimeout(() => {
    image.src = button.dataset.image;
    image.style.opacity = '1';
  }, 160);
  document.querySelector('[data-current]').textContent = Number(button.dataset.index) + 1;
}

function setupZoom() {
  const area = document.querySelector('[data-zoom-area]');
  if (!area || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  area.addEventListener('pointerenter', () => area.classList.add('is-zoomed'));
  area.addEventListener('pointermove', event => {
    const rect = area.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    area.style.setProperty('--zoom-x', `${x}%`);
    area.style.setProperty('--zoom-y', `${y}%`);
  });
  area.addEventListener('pointerleave', () => area.classList.remove('is-zoomed'));
}

function renderRelated(items) {
  const section = document.querySelector('[data-related-section]');
  if (!items.length) { section.hidden = true; return; }
  section.hidden = false;
  document.querySelector('[data-related]').innerHTML = items.map(item => `<a class="related-card" href="produto.html?id=${encodeURIComponent(item.id)}"><figure><img src="${escapeHtml(item.imagens[0])}" alt="${escapeHtml(item.nome)}" loading="lazy"></figure><div><h3>${escapeHtml(item.nome)}</h3><span>A partir de ${money.format(item.preco)}</span></div></a>`).join('');
}

function contact(event, product, variant) {
  event.preventDefault();
  const selection = [variant.cor, variant.sku].filter(Boolean).join(' — ');
  activeMessage = variant.disponivel
    ? `Olá! Tenho interesse na ${product.nome}${selection ? ` (${selection})` : ''}. Poderia me confirmar as formas de pagamento e entrega?`
    : `Olá! Gostaria de consultar a disponibilidade da ${product.nome}${selection ? ` (${selection})` : ''}.`;
  const number = window.SITE_CONFIG?.whatsapp;
  if (number) { location.href = `https://wa.me/${number}?text=${encodeURIComponent(activeMessage)}`; return; }
  document.querySelector('[data-message]').textContent = activeMessage;
  dialog.showModal();
}

fetch('data/products.json')
  .then(response => { if (!response.ok) throw new Error(); return response.json(); })
  .then(data => {
    const product = data.products.find(item => item.id === id);
    if (!product) throw new Error();
    render(product, data.products);
  })
  .catch(() => { page.innerHTML = '<div class="loading"><div><h1>Produto não encontrado</h1><a href="catalogo.html">Voltar às bolsas</a></div></div>'; });

document.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
document.querySelector('[data-copy]')?.addEventListener('click', async event => { await navigator.clipboard.writeText(activeMessage); event.currentTarget.textContent = 'Mensagem copiada'; });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
