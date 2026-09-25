const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const mobileShowcase = matchMedia('(max-width: 620px)');
let showcaseItems = [];
let activeStage = 0;
let activeMessage = '';

const header = document.querySelector('[data-header]');
const menu = document.querySelector('.menu-toggle');
const dialog = document.querySelector('[data-dialog]');
const escapeHtml = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));

const imageVersion = (source, size) => PRODUCT_IMAGES.version(source, size);
const imageSrcset = source => PRODUCT_IMAGES.srcset(source);
const showcaseSrcset = source => `${imageVersion(source, 'card')} 900w, ${source} 1200w`;

function setMenu(open) {
  header.classList.toggle('menu-open', open);
  document.body.classList.toggle('menu-visible', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fechar navegacao' : 'Abrir navegacao');
  menu.querySelector('.visually-hidden').textContent = open ? 'Fechar navegacao' : 'Abrir navegacao';
}

menu.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenu(false);
});

function productCover(product) {
  const variant = product.variantes?.find(item => item.disponivel) || product.variantes?.[0];
  return variant?.imagens?.[0] || product.imagens?.[0] || '';
}

function featuredFromProducts(products) {
  const palette = [
    'radial-gradient(circle at 73% 42%, #eadfd2 0, #f8f3ed 32%, #e9dfd5 100%)',
    'radial-gradient(circle at 74% 40%, #e4ddd5 0, #f7f3ee 34%, #ded5cc 100%)',
    'radial-gradient(circle at 72% 42%, #ead8d3 0, #faf3ef 32%, #e7d7ce 100%)',
    'radial-gradient(circle at 74% 41%, #ddc8bd 0, #f5ece6 34%, #d8c5b9 100%)'
  ];
  return products.filter(product => product.destaque).sort((a, b) => a.ordem - b.ordem).map((product, index) => ({
    productId: product.id,
    linha: `Destaque · ${product.colecao || product.categoria}`,
    titulo: product.nome,
    texto: product.resumo,
    imagem: product.imagemDestaque || productCover(product),
    editorial: ['maximos-urban', 'maximos-origem'].includes(product.id),
    fundo: palette[index % palette.length]
  }));
}

function setStage(index) {
  if (!showcaseItems.length) return;
  activeStage = Math.max(0, Math.min(index, showcaseItems.length - 1));
  document.querySelectorAll('.showcase-info,.showcase-stage img,.showcase-step').forEach((element, itemIndex) => {
    element.classList.toggle('active', itemIndex % showcaseItems.length === activeStage);
  });
  document.querySelector('[data-current]').textContent = String(activeStage + 1).padStart(2, '0');
  document.querySelector('.showcase-sticky').style.background = showcaseItems[activeStage].fundo;
}

function renderShowcase(items) {
  showcaseItems = items;
  const container = document.querySelector('[data-showcase]');
  const copy = document.querySelector('[data-showcase-copy]');
  const stage = document.querySelector('[data-showcase-stage]');
  const steps = document.querySelector('[data-showcase-steps]');
  container.style.setProperty('--showcase-count', Math.max(items.length, 1));
  copy.innerHTML = items.map((item, index) => `<article class="showcase-info ${index === 0 ? 'active' : ''}"><span class="showcase-kicker">${escapeHtml(item.linha)}</span><h2>${escapeHtml(item.titulo)}</h2><p>${escapeHtml(item.texto)}</p><a class="text-link" href="produto.html?id=${encodeURIComponent(item.productId)}">Conhecer a peça ↗</a></article>`).join('');
  stage.innerHTML = items.map((item, index) => `<img class="showcase-product ${item.editorial ? 'editorial' : 'cutout'} ${index === 0 ? 'active' : ''}" src="${escapeHtml(item.imagem)}" srcset="${escapeHtml(showcaseSrcset(item.imagem))}" sizes="(max-width: 620px) 900px, 1200px" alt="${escapeHtml(item.titulo)}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('');
  steps.innerHTML = items.map((item, index) => `<button class="showcase-step ${index === 0 ? 'active' : ''}" type="button" data-stage="${index}" aria-label="Ver ${escapeHtml(item.titulo)}"><span>${escapeHtml(item.titulo)}</span></button>`).join('');
  document.querySelector('[data-total]').textContent = String(items.length).padStart(2, '0');

  steps.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.stage);
    if (mobileShowcase.matches) { setStage(index); return; }
    const target = index / Math.max(items.length - 1, 1);
    scrollTo({ top: container.offsetTop + target * (container.offsetHeight - innerHeight), behavior: 'smooth' });
  }));

  let touchStartX = null;
  stage.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (touchStartX === null || !mobileShowcase.matches) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    setStage(distance < 0 ? (activeStage + 1) % items.length : (activeStage - 1 + items.length) % items.length);
  }, { passive: true });

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', event => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      stage.style.setProperty('--tilt-y', `${x * 9}deg`);
      stage.style.setProperty('--tilt-x', `${y * -7}deg`);
      stage.style.setProperty('--shift-x', `${x * 13}px`);
      stage.style.setProperty('--shift-y', `${y * 9}px`);
      stage.style.setProperty('--shine-x', `${50 + x * 28}%`);
      stage.style.setProperty('--shine-y', `${42 + y * 24}%`);
    });
    stage.addEventListener('pointerleave', () => {
      ['--tilt-x', '--tilt-y'].forEach(property => stage.style.setProperty(property, '0deg'));
      ['--shift-x', '--shift-y'].forEach(property => stage.style.setProperty(property, '0px'));
      stage.style.setProperty('--shine-x', '50%');
      stage.style.setProperty('--shine-y', '42%');
    });
  }
}

function renderProducts(products) {
  document.querySelector('[data-home-products]').innerHTML = products.slice(0, 6).map(product => `<article class="home-card reveal"><a href="produto.html?id=${encodeURIComponent(product.id)}"><div class="home-card-visual"><img src="${escapeHtml(imageVersion(productCover(product), 'card'))}" srcset="${escapeHtml(imageSrcset(productCover(product)))}" sizes="(max-width: 700px) 100vw, 33vw" alt="${escapeHtml(product.nome)}" loading="lazy"><span>${product.disponivel ? 'Disponível' : 'Indisponível'}</span></div><div class="home-card-meta"><div><h3>${escapeHtml(product.nome)}</h3><p>${escapeHtml(product.colecao)}</p></div><strong>${money.format(product.preco)}</strong></div></a></article>`).join('');
  observeReveals();
}

function handleScroll() {
  header.classList.toggle('scrolled', scrollY > 40);
  if (mobileShowcase.matches) return;
  const container = document.querySelector('[data-showcase]');
  if (!container || !showcaseItems.length) return;
  const rect = container.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - innerHeight)));
  setStage(Math.min(showcaseItems.length - 1, Math.floor(progress * showcaseItems.length)));
}

function observeReveals() {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(item => observer.observe(item));
}

function contact(event) {
  event.preventDefault();
  activeMessage = 'Olá! Conheci a coleção no site da Maximos Signature e gostaria de saber quais peças estão disponíveis.';
  const number = window.SITE_CONFIG?.whatsapp;
  if (number) { location.href = `https://wa.me/${number}?text=${encodeURIComponent(activeMessage)}`; return; }
  document.querySelector('[data-message]').textContent = activeMessage;
  dialog.showModal();
}

document.querySelectorAll('[data-whatsapp]').forEach(link => link.addEventListener('click', contact));
document.querySelector('[data-close]').addEventListener('click', () => dialog.close());
document.querySelector('[data-copy]').addEventListener('click', async event => { await navigator.clipboard.writeText(activeMessage); event.currentTarget.textContent = 'Mensagem copiada'; });

fetch('data/products.json').then(response => response.json()).then(data => {
  const ordered = [...data.products].sort((a, b) => a.ordem - b.ordem);
  renderShowcase(featuredFromProducts(ordered));
  renderProducts(ordered);
  handleScroll();
}).catch(() => {
  document.querySelector('[data-showcase-stage]').innerHTML = '<p>Não foi possível carregar a vitrine.</p>';
  document.querySelector('[data-home-products]').innerHTML = '<p>Não foi possível carregar a coleção.</p>';
});

addEventListener('scroll', handleScroll, { passive: true });
mobileShowcase.addEventListener('change', () => { setStage(0); handleScroll(); });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
observeReveals();
