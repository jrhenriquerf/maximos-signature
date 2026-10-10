(function () {
  const origin = 'https://maximossignature.com.br/';
  function details(product, variant) {
    const url = new URL(PRODUCT_IMAGES.productUrl(product, variant), origin).href;
    const title = `${product.nome} — ${variant.cor} | Maximos Signature`;
    const description = `${product.resumo} Modelo ${variant.cor}. Pix ou cartão por link Asaas; frete calculado para seu endereço.`;
    const image = new URL(variant.imagens?.[0] || product.imagens[0], origin).href;
    return { url, title, description, image, structured: {
      '@context': 'https://schema.org', '@graph': [
        { '@type': 'Product', '@id': `${url}#produto`, name: `${product.nome} — ${variant.cor}`,
          description: product.descricao || product.resumo, sku: variant.sku,
          image: (variant.imagens || product.imagens).map(source => new URL(source, origin).href),
          brand: { '@type': 'Brand', name: 'Maximos Signature' }, color: variant.cor, material: 'Couro legítimo',
          offers: { '@type': 'Offer', url, priceCurrency: 'BRL', price: Number(variant.preco ?? product.preco).toFixed(2),
            availability: `https://schema.org/${PRODUCT_IMAGES.available(variant) ? 'InStock' : 'OutOfStock'}`,
            itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: 'Maximos Signature' } } },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: origin },
          { '@type': 'ListItem', position: 2, name: 'Bolsas', item: `${origin}catalogo.html` },
          { '@type': 'ListItem', position: 3, name: `${product.nome} — ${variant.cor}`, item: url }
        ] }
      ]
    } };
  }
  function update(product, variant) {
    const data = details(product, variant);
    document.title = data.title;
    const set = (attribute, name, content) => {
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, name); document.head.appendChild(meta); }
      meta.content = content;
    };
    set('name', 'description', data.description);
    for (const [name, value] of Object.entries({ title: data.title, description: data.description, image: data.image, url: data.url, type: 'product', locale: 'pt_BR', site_name: 'Maximos Signature' })) set('property', `og:${name}`, value);
    set('name', 'twitter:card', 'summary_large_image');
    set('name', 'twitter:title', data.title);
    set('name', 'twitter:description', data.description);
    set('name', 'twitter:image', data.image);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = data.url;
    let schema = document.querySelector('[data-product-schema]');
    if (!schema) { schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.dataset.productSchema = ''; document.head.appendChild(schema); }
    schema.textContent = JSON.stringify(data.structured);
  }
  window.PRODUCT_SEO = { details, update };
}());
