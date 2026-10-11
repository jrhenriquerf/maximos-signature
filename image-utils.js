(function () {
  const version = (source, size) => String(source || '').replace(/\.webp(?:\?.*)?$/i, `-${size}.webp`);
  const srcset = source => /\.webp(?:\?.*)?$/i.test(source)
    ? `${version(source, 'thumb')} 360w, ${version(source, 'card')} 900w, ${source} 1800w`
    : source;
  const available = variant => variant?.disponivel !== false && Number(variant?.estoque ?? 1) > 0;
  const preferredVariant = product => product.variantes?.find(available) || product.variantes?.[0];
  const productUrl = (product, variant = preferredVariant(product)) => variant?.sku
    ? `bolsas/${product.id}-${variant.sku.toLowerCase()}.html`
    : `produto.html?id=${encodeURIComponent(product.id)}`;
  // Caminho físico usado na geração e navegação local; URL final usada em SEO/feed.
  const publicProductUrl = (product, variant = preferredVariant(product)) => productUrl(product, variant).replace(/\.html(?=$|\?)/, '');
  window.PRODUCT_IMAGES = { version, srcset, available, preferredVariant, productUrl, publicProductUrl };
}());
