const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const perPage = 4;
let products = [], activeFilter = 'todos', query = '', sortBy = 'ordem', page = 1;
const message = 'Olá! Gostaria de conhecer melhor as bolsas da Maximos Signature.';
const dialog = document.querySelector('[data-dialog]');
const header = document.querySelector('[data-header]');
const escapeHtml = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

document.querySelector('.menu-toggle')?.addEventListener('click', event => {
  const open = header.classList.toggle('menu-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
  event.currentTarget.textContent = open ? 'Fechar' : 'Menu';
});

function variantsFor(product) {
  return product.variantes?.length ? product.variantes : (product.imagens || []).map((image, index) => ({
    cor: product.cores?.[index] || `Modelo ${index + 1}`, imagens: [image], preco: product.preco,
    precoAnterior: product.precoAnterior, disponivel: product.disponivel
  }));
}

function card(product) {
  const variants = variantsFor(product);
  const initial = variants.find(item => item.disponivel) || variants[0];
  const old = initial.precoAnterior ? `<del data-card-old="${escapeHtml(product.id)}">${money.format(initial.precoAnterior)}</del>` : `<del data-card-old="${escapeHtml(product.id)}" hidden></del>`;
  const discount = initial.precoAnterior ? Math.round((1 - initial.preco / initial.precoAnterior) * 100) : 0;
  const thumbs = variants.slice(0, 4).map((variant, index) => `<button class="variant-thumb ${variant === initial ? 'active' : ''}" type="button" data-card-variant data-product="${escapeHtml(product.id)}" data-image="${escapeHtml(variant.imagens?.[0])}" data-price="${variant.preco}" data-old="${variant.precoAnterior || ''}" data-available="${variant.disponivel}" title="${escapeHtml(variant.cor)}" aria-label="Visualizar ${escapeHtml(variant.cor)}"><img src="${escapeHtml(variant.imagens?.[0])}" alt=""></button>`).join('');
  return `<article class="product-card">
    <a class="product-link" href="produto.html?id=${encodeURIComponent(product.id)}"><div class="product-image"><span class="product-badge" data-card-badge="${escapeHtml(product.id)}">${initial.disponivel ? 'Couro legítimo' : 'Sob consulta'}</span>${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}<img src="${escapeHtml(initial.imagens?.[0] || product.imagens[0])}" alt="${escapeHtml(product.nome)}" data-card-image="${escapeHtml(product.id)}" loading="lazy"></div></a>
    <div class="variant-row">${thumbs}<span class="variant-count">${variants.length} ${variants.length === 1 ? 'modelo' : 'cores'}</span></div>
    <a class="product-link" href="produto.html?id=${encodeURIComponent(product.id)}"><div class="product-info"><span class="product-material">${escapeHtml(product.colecao)}</span><h2>${escapeHtml(product.nome)}</h2><div class="product-price"><strong data-card-price="${escapeHtml(product.id)}">${money.format(initial.preco)}</strong>${old}</div><span class="product-condition">Condições no atendimento</span><span class="product-action"><span>Ver detalhes</span><b>→</b></span></div></a>
  </article>`;
}

function filtered() {
  const needle = normalize(query);
  const list = products.filter(product => {
    const matchesFilter = activeFilter === 'disponiveis' ? product.disponivel : activeFilter === 'destaques' ? product.destaque : true;
    const variantTerms = (product.variantes || []).flatMap(item => [item.cor, item.sku]);
    const haystack = normalize([product.nome, product.colecao, product.categoria, product.resumo, ...(product.materiais || []), ...(product.cores || []), ...variantTerms].join(' '));
    return matchesFilter && (!needle || haystack.includes(needle));
  });
  return list.sort((a, b) => sortBy === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR') : sortBy === 'preco-asc' ? a.preco - b.preco : sortBy === 'preco-desc' ? b.preco - a.preco : a.ordem - b.ordem);
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const nav = document.querySelector('[data-pagination]');
  if (total <= perPage) { nav.innerHTML = ''; return; }
  nav.innerHTML = `<button class="page-button" type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>${Array.from({ length: pages }, (_, index) => `<button class="page-button ${page === index + 1 ? 'active' : ''}" type="button" data-page="${index + 1}" ${page === index + 1 ? 'aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button class="page-button" type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Próxima página">→</button>`;
  nav.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { page = Number(button.dataset.page); render(); document.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' }); }));
}

function bindVariants() {
  document.querySelectorAll('[data-card-variant]').forEach(button => button.addEventListener('click', () => {
    const productId = button.dataset.product;
    document.querySelectorAll(`[data-card-variant][data-product="${productId}"]`).forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const image = document.querySelector(`[data-card-image="${productId}"]`);
    image.style.opacity = '.2';
    setTimeout(() => { image.src = button.dataset.image; image.style.opacity = '1'; }, 120);
    document.querySelector(`[data-card-price="${productId}"]`).textContent = money.format(Number(button.dataset.price));
    const old = document.querySelector(`[data-card-old="${productId}"]`);
    if (button.dataset.old) { old.textContent = money.format(Number(button.dataset.old)); old.hidden = false; } else old.hidden = true;
    document.querySelector(`[data-card-badge="${productId}"]`).textContent = button.dataset.available === 'true' ? 'Couro legítimo' : 'Sob consulta';
  }));
}

function render() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  if (page > pages) page = pages;
  document.querySelector('[data-count]').textContent = list.length;
  const visible = list.slice((page - 1) * perPage, page * perPage);
  const grid = document.querySelector('[data-catalog]');
  grid.innerHTML = visible.length ? visible.map(card).join('') : '<div class="empty-state"><h2>Nenhuma peça encontrada</h2><p>Tente outro termo ou remova os filtros.</p></div>';
  grid.setAttribute('aria-busy', 'false');
  bindVariants();
  renderPagination(list.length);
}

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('is-active')); button.classList.add('is-active'); activeFilter = button.dataset.filter; page = 1; render(); }));
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
fetch('data/products.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { products = data.products; render(); }).catch(() => { document.querySelector('[data-catalog]').innerHTML = '<p class="loading">Não foi possível carregar os produtos.</p>'; });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
