const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const mobileShowcase = matchMedia('(max-width: 620px)');
let showcaseItems = [];
let activeStage = 0;
let activeMessage = '';

const header = document.querySelector('[data-header]');
const menu = document.querySelector('.menu-toggle');
const dialog = document.querySelector('[data-dialog]');

menu.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open');
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Fechar' : 'Menu';
});
header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => header.classList.remove('menu-open')));

function setStage(index) {
  if (!showcaseItems.length) return;
  activeStage = Math.max(0, Math.min(index, showcaseItems.length - 1));
  document.querySelectorAll('.showcase-info,.showcase-stage img,.showcase-step').forEach((element, itemIndex) => {
    element.classList.toggle('active', itemIndex % showcaseItems.length === activeStage);
  });
  document.querySelector('[data-current]').textContent = String(activeStage + 1).padStart(2, '0');
  document.querySelector('.showcase-sticky').style.background = showcaseItems[activeStage].fundo || '#f8f5f1';
}

function renderShowcase(items) {
  showcaseItems = items;
  const copy = document.querySelector('[data-showcase-copy]');
  const stage = document.querySelector('[data-showcase-stage]');
  const steps = document.querySelector('[data-showcase-steps]');
  copy.innerHTML = items.map((item, index) => `<article class="showcase-info ${index === 0 ? 'active' : ''}"><span class="showcase-kicker">${item.linha}</span><h2>${item.titulo}</h2><p>${item.texto}</p><a class="text-link" href="produto.html?id=${item.productId}">Conhecer a peça ↗</a></article>`).join('');
  stage.innerHTML = items.map((item, index) => `<img class="${index === 0 ? 'active' : ''}" src="${item.imagem}" alt="${item.titulo}">`).join('');
  steps.innerHTML = items.map((item, index) => `<button class="showcase-step ${index === 0 ? 'active' : ''}" type="button" data-stage="${index}" aria-label="Ver ${item.titulo}"><span>${item.titulo}</span></button>`).join('');
  document.querySelector('[data-total]').textContent = String(items.length).padStart(2, '0');

  steps.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.stage);
    if (mobileShowcase.matches) {
      setStage(index);
      return;
    }
    const container = document.querySelector('[data-showcase]');
    const target = index / (items.length - 1);
    scrollTo({ top: container.offsetTop + target * (container.offsetHeight - innerHeight), behavior: 'smooth' });
  }));

  let touchStartX = null;
  stage.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (touchStartX === null || !mobileShowcase.matches) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    const next = distance < 0 ? (activeStage + 1) % items.length : (activeStage - 1 + items.length) % items.length;
    setStage(next);
  }, { passive: true });
}

function renderProducts(products) {
  document.querySelector('[data-home-products]').innerHTML = products.slice(0, 6).map(product => `<article class="home-card reveal"><a href="produto.html?id=${product.id}"><div class="home-card-visual"><img src="${product.imagens[0]}" alt="${product.nome}" loading="lazy"><span>${product.disponivel ? 'Disponível' : 'Indisponível'}</span></div><div class="home-card-meta"><div><h3>${product.nome}</h3><p>${product.colecao}</p></div><strong>${money.format(product.preco)}</strong></div></a></article>`).join('');
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
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(item => observer.observe(item));
}

function contact(event) {
  event.preventDefault();
  activeMessage = 'Olá! Conheci a coleção no site da Maximos Signature e gostaria de saber quais peças estão disponíveis.';
  const number = window.SITE_CONFIG?.whatsapp;
  if (number) {
    location.href = `https://wa.me/${number}?text=${encodeURIComponent(activeMessage)}`;
    return;
  }
  document.querySelector('[data-message]').textContent = activeMessage;
  dialog.showModal();
}

document.querySelectorAll('[data-whatsapp]').forEach(link => link.addEventListener('click', contact));
document.querySelector('[data-close]').addEventListener('click', () => dialog.close());
document.querySelector('[data-copy]').addEventListener('click', async event => {
  await navigator.clipboard.writeText(activeMessage);
  event.currentTarget.textContent = 'Mensagem copiada';
});

fetch('data/products.json')
  .then(response => response.json())
  .then(data => {
    renderShowcase(data.showcase);
    renderProducts(data.products.sort((a, b) => a.ordem - b.ordem));
    handleScroll();
  })
  .catch(() => {
    document.querySelector('[data-showcase-stage]').innerHTML = '<p>Não foi possível carregar a vitrine.</p>';
    document.querySelector('[data-home-products]').innerHTML = '<p>Não foi possível carregar a coleção.</p>';
  });

addEventListener('scroll', handleScroll, { passive: true });
mobileShowcase.addEventListener('change', () => { setStage(0); handleScroll(); });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
observeReveals();
