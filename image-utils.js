(function () {
  const version = (source, size) => String(source || '').replace(/\.webp(?:\?.*)?$/i, `-${size}.webp`);
  const srcset = source => /\.webp(?:\?.*)?$/i.test(source)
    ? `${version(source, 'thumb')} 360w, ${version(source, 'card')} 900w, ${source} 1800w`
    : source;
  window.PRODUCT_IMAGES = { version, srcset };
}());
