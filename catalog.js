const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const perPage = 8;
let products = [], activeCategory = 'todas', query = '', sortBy = 'ordem', page = 1;
const variantTimers = new Map();
const message = 'Olá! Gostaria de conhecer melhor as bolsas da Maximos Signature.';
const dialog = document.querySelector('[data-dialog]');
const header = document.querySelector('[data-header]');
const escapeHtml = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const imageVersion = (source, size) => PRODUCT_IMAGES.version(source, size);
const imageSrcset = source => PRODUCT_IMAGES.srcset(source);

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

function variantsFor(product) {
  return product.variantes?.length ? product.variantes : (product.imagens || []).map((image, index) => ({
    cor: product.cores?.[index] || `Modelo ${index + 1}`, imagens: [image], preco: product.preco,
    precoAnterior: product.precoAnterior, disponivel: product.disponivel
  }));
}

function initialVariantIndex(product) {
  const variants = variantsFor(product);
  const available = variants.findIndex(item => item.disponivel);
  return available >= 0 ? available : 0;
}

function card(product) {
  const variants = variantsFor(product);
  const initialIndex = initialVariantIndex(product);
  const initial = variants[initialIndex];
  const old = initial.precoAnterior ? `<del data-card-old="${escapeHtml(product.id)}">${money.format(initial.precoAnterior)}</del>` : `<del data-card-old="${escapeHtml(product.id)}" hidden></del>`;
  const discount = initial.precoAnterior ? Math.round((1 - initial.preco / initial.precoAnterior) * 100) : 0;
  const thumbs = variants.slice(0, 4).map((variant, index) => `<button class="variant-thumb ${index === initialIndex ? 'active' : ''}" type="button" data-card-variant data-product="${escapeHtml(product.id)}" data-variant-index="${index}" title="${escapeHtml(variant.cor)}" aria-label="Visualizar ${escapeHtml(variant.cor)}"><img src="${escapeHtml(imageVersion(variant.imagens?.[0], 'thumb'))}" alt="" loading="lazy"></button>`).join('');
  return `<article class="product-card">
    <a class="product-link" href="produto.html?id=${encodeURIComponent(product.id)}"><div class="product-image" data-card-hover="${escapeHtml(product.id)}" data-manual-index="${initialIndex}"><span class="product-badge" data-card-badge="${escapeHtml(product.id)}">${initial.disponivel ? 'Couro legítimo' : 'Sob consulta'}</span>${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}<img class="card-image-layer is-active" src="${escapeHtml(imageVersion(initial.imagens?.[0] || product.imagens[0], 'card'))}" srcset="${escapeHtml(imageSrcset(initial.imagens?.[0] || product.imagens[0]))}" sizes="(max-width: 700px) 50vw, 600px" alt="${escapeHtml(product.nome)}" data-card-image="${escapeHtml(product.id)}" data-card-layer="0" data-source="${escapeHtml(initial.imagens?.[0] || product.imagens[0])}" loading="lazy"><img class="card-image-layer" src="${escapeHtml(imageVersion(initial.imagens?.[0] || product.imagens[0], 'card'))}" srcset="${escapeHtml(imageSrcset(initial.imagens?.[0] || product.imagens[0]))}" sizes="(max-width: 700px) 50vw, 600px" alt="" data-card-layer="1" data-source="${escapeHtml(initial.imagens?.[0] || product.imagens[0])}" aria-hidden="true"></div></a>
    <div class="variant-row">${thumbs}<span class="variant-count">${variants.length} ${variants.length === 1 ? 'modelo' : 'cores'}</span></div>
    <a class="product-link" href="produto.html?id=${encodeURIComponent(product.id)}"><div class="product-info"><span class="product-material">${escapeHtml(product.colecao)}</span><h2>${escapeHtml(product.nome)}</h2><div class="product-price"><strong data-card-price="${escapeHtml(product.id)}">${money.format(initial.preco)}</strong>${old}</div><span class="product-condition">Condições no atendimento</span><span class="product-action"><span>Ver detalhes</span><b>→</b></span></div></a>
  </article>`;
}

function filtered() {
  const needle = normalize(query);
  const list = products.filter(product => {
    const matchesCategory = activeCategory === 'todas' || normalize(product.colecao) === activeCategory;
    const variantTerms = (product.variantes || []).flatMap(item => [item.cor, item.sku]);
    const haystack = normalize([product.nome, product.colecao, product.categoria, product.resumo, ...(product.materiais || []), ...(product.cores || []), ...variantTerms].join(' '));
    return matchesCategory && (!needle || haystack.includes(needle));
  });
  return list.sort((a, b) => sortBy === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR') : sortBy === 'preco-asc' ? a.preco - b.preco : sortBy === 'preco-desc' ? b.preco - a.preco : Number(b.destaque) - Number(a.destaque) || a.ordem - b.ordem);
}

function renderCategoryFilters() {
  const categories = [...new Set(products.map(product => product.colecao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const filters = document.querySelector('[data-categories]');
  filters.innerHTML = `<button class="filter is-active" type="button" data-category="todas">Todas as categorias</button>${categories.map(category => `<button class="filter" type="button" data-category="${escapeHtml(normalize(category))}">${escapeHtml(category)}</button>`).join('')}`;
  filters.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    filters.querySelectorAll('[data-category]').forEach(item => item.classList.remove('is-active'));
    button.classList.add('is-active');
    activeCategory = button.dataset.category;
    page = 1;
    render();
  }));
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const nav = document.querySelector('[data-pagination]');
  if (total <= perPage) { nav.innerHTML = ''; return; }
  nav.innerHTML = `<button class="page-button" type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>${Array.from({ length: pages }, (_, index) => `<button class="page-button ${page === index + 1 ? 'active' : ''}" type="button" data-page="${index + 1}" ${page === index + 1 ? 'aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button class="page-button" type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Próxima página">→</button>`;
  nav.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { page = Number(button.dataset.page); render(); document.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' }); }));
}

function swapCardImage(productId, source, alt, animate = true) {
  const stage = document.querySelector(`[data-card-hover="${productId}"]`);
  if (!stage || !source) return;
  const layers = [...stage.querySelectorAll('[data-card-layer]')];
  if (layers.length < 2) return;

  const activeIndex = Number(stage.dataset.activeLayer || 0);
  const current = layers[activeIndex];
  const nextIndex = activeIndex === 0 ? 1 : 0;
  const next = layers[nextIndex];
  if (current.dataset.source === source) return;

  const token = String(Number(stage.dataset.swapToken || 0) + 1);
  stage.dataset.swapToken = token;
  const activate = () => {
    if (stage.dataset.swapToken !== token) return;
    if (!animate) stage.classList.add('image-swap-instant');
    next.alt = alt;
    next.dataset.source = source;
    next.classList.add('is-active');
    current.classList.remove('is-active');
    stage.dataset.activeLayer = String(nextIndex);
    if (!animate) requestAnimationFrame(() => stage.classList.remove('image-swap-instant'));
  };

  next.onload = activate;
  next.onerror = () => { next.onload = null; };
  next.srcset = imageSrcset(source);
  next.sizes = '(max-width: 700px) 50vw, 600px';
  next.src = imageVersion(source, 'card');
  if (next.complete && next.naturalWidth) activate();
}

function updateCardVariant(productId, variantIndex, animate = true) {
  const product = products.find(item => item.id === productId);
  const variant = variantsFor(product)[variantIndex];
  if (!variant) return;
  document.querySelectorAll(`[data-card-variant][data-product="${productId}"]`).forEach(item => item.classList.toggle('active', Number(item.dataset.variantIndex) === variantIndex));
  swapCardImage(productId, variant.imagens?.[0], `${product.nome} — ${variant.cor}`, animate);
  document.querySelector(`[data-card-price="${productId}"]`).textContent = money.format(variant.preco);
  const old = document.querySelector(`[data-card-old="${productId}"]`);
  if (variant.precoAnterior) { old.textContent = money.format(variant.precoAnterior); old.hidden = false; } else old.hidden = true;
  document.querySelector(`[data-card-badge="${productId}"]`).textContent = variant.disponivel ? 'Couro legítimo' : 'Sob consulta';
}

function bindVariants() {
  document.querySelectorAll('[data-card-variant]').forEach(button => button.addEventListener('click', () => {
    const productId = button.dataset.product;
    const index = Number(button.dataset.variantIndex);
    document.querySelector(`[data-card-hover="${productId}"]`).dataset.manualIndex = index;
    updateCardVariant(productId, index);
  }));

  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('[data-card-hover]').forEach(area => {
    const productId = area.dataset.cardHover;
    const variants = variantsFor(products.find(item => item.id === productId));
    if (variants.length < 2) return;
    area.addEventListener('mouseenter', () => {
      let index = Number(area.dataset.manualIndex);
      clearInterval(variantTimers.get(productId));
      const timer = setInterval(() => { index = (index + 1) % variants.length; updateCardVariant(productId, index); }, 1800);
      variantTimers.set(productId, timer);
    });
    area.addEventListener('mouseleave', () => {
      clearInterval(variantTimers.get(productId));
      variantTimers.delete(productId);
      updateCardVariant(productId, Number(area.dataset.manualIndex));
    });
  });
}

function render() {
  variantTimers.forEach(timer => clearInterval(timer));
  variantTimers.clear();
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  if (page > pages) page = pages;
  document.querySelector('[data-count]').textContent = list.length;
  const visible = list.slice((page - 1) * perPage, page * perPage);
  const grid = document.querySelector('[data-catalog]');
  grid.innerHTML = visible.length ? visible.map(card).join('') : '<div class="empty-state"><h2>Nenhuma peça encontrada</h2><p>Tente outro termo ou escolha outra categoria.</p></div>';
  grid.setAttribute('aria-busy', 'false');
  bindVariants();
  renderPagination(list.length);
}

document.querySelector('[data-search]').addEventListener('input', event => { query = event.target.value; page = 1; render(); });
document.querySelector('[data-sort]').addEventListener('change', event => { sortBy = event.target.value; page = 1; render(); });

function contact(event) {
  event.preventDefault();
  const number = window.SITE_CONFIG?.whatsapp;
  if (number) { location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`; return; }
  document.querySelector('[data-message]').textContent = message;
  dialog.showModal();
}

document.querySelectorAll('[data-contact]').forEach(item => item.addEventListener('click', contact));
document.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
document.querySelector('[data-copy]')?.addEventListener('click', async event => { await navigator.clipboard.writeText(message); event.currentTarget.textContent = 'Mensagem copiada'; });
fetch('data/products.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { products = data.products; renderCategoryFilters(); render(); }).catch(() => { document.querySelector('[data-catalog]').innerHTML = '<p class="loading">Não foi possível carregar os produtos.</p>'; });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
