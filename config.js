window.SITE_CONFIG = {
  // Somente números, com país + DDD. Exemplo: 5511999999999
  whatsapp: '5514991488234',
  metaPixelId: '1011169471576704',
  instagram: 'https://www.instagram.com/maximos.signature/',
  email: 'maximos.signature@gmail.com'
};

window.prepareWhatsAppLink = (link, message) => {
  const number = window.SITE_CONFIG?.whatsapp;
  if (!number || !link) return false;
  link.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return true;
};
