(function () {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('.menu-toggle');
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-visible', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
  }
  toggle?.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
  header.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  document.querySelectorAll('[data-contact]').forEach(link => link.addEventListener('click', event => {
    window.prepareWhatsAppLink?.(event.currentTarget, 'Olá! Gostaria de atendimento da Maximos Signature.');
  }));
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
}());
