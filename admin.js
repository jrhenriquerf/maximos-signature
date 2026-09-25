const DRAFT_KEY = 'maximos-catalog-draft-v4';
let catalog = { updatedAt: new Date().toISOString().slice(0, 10), currency: 'BRL', products: [] };
let selectedId = null;
let pendingDelete = null;
let localApi = { available: false, token: '', branch: '', remote: '' };

const list = document.querySelector('[data-list]');
const editor = document.querySelector('[data-editor]');
const template = document.querySelector('#editor-template');
const confirmDialog = document.querySelector('[data-confirm]');
const syncStatus = document.querySelector('[data-sync-status]');
const publishButton = document.querySelector('[data-publish]');
const cleanLines = value => String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const numberOrNull = value => String(value ?? '').trim() === '' ? null : Number(value);

function setSync(message, state = '') {
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

function storeDraft() {
  catalog.updatedAt = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(catalog));
}

function statusMessage(message, state = '') {
  const status = editor.querySelector('[data-status]');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function adminVariants(product) {
  if (Array.isArray(product.variantes) && product.variantes.length) return structuredClone(product.variantes);
  return [{
    id: `${product.id}-principal`,
    sku: '',
    cor: product.cores?.[0] || 'Modelo principal',
    preco: Number(product.preco) || 0,
    precoAnterior: Number(product.precoAnterior) || null,
    disponivel: product.disponivel !== false,
    estoque: product.disponivel === false ? 0 : 1,
    pesoKg: null,
    medidas: structuredClone(product.medidas || null),
    imagens: structuredClone(product.imagens || [])
  }];
}

function preferredVariant(product) {
  const variants = adminVariants(product);
  return variants.find(item => item.disponivel && Number(item.estoque) > 0) || variants[0];
}

function renderList(query = '') {
  const term = query.toLowerCase();
  const visible = [...catalog.products]
    .sort((a, b) => a.ordem - b.ordem)
    .filter(product => {
      const variantText = adminVariants(product).flatMap(item => [item.cor, item.sku]).join(' ');
      return `${product.nome} ${product.colecao} ${variantText}`.toLowerCase().includes(term);
    });

  document.querySelector('[data-total]').textContent = catalog.products.length;
  list.innerHTML = visible.map(product => {
    const variants = adminVariants(product);
    const available = variants.filter(item => item.disponivel && Number(item.estoque) > 0);
    const stock = available.reduce((total, item) => total + Number(item.estoque || 0), 0);
    const image = preferredVariant(product)?.imagens?.[0] || product.imagens?.[0] || 'assets/hero-conceitual.png';
    return `<button type="button" data-id="${escapeHtml(product.id)}" class="${product.id === selectedId ? 'active' : ''}"><img src="${escapeHtml(image)}" alt=""><span><b>${escapeHtml(product.nome)}</b><small>${variants.length} ${variants.length === 1 ? 'versão' : 'versões'} · ${stock} em estoque</small></span><i class="availability-dot ${available.length ? '' : 'no'}" title="${available.length ? 'Disponível' : 'Sem estoque'}"></i></button>`;
  }).join('') || '<p>Nenhum produto encontrado.</p>';
  list.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => selectProduct(button.dataset.id)));
}

function selectProduct(id) {
  selectedId = id;
  renderList(document.querySelector('[data-search]').value);
  renderEditor();
}

function variantCard(variant, index, total) {
  const images = (variant.imagens || []).join('\n');
  const cover = variant.imagens?.[0] || '';
  const stock = Math.max(0, Number(variant.estoque) || 0);
  const available = Boolean(variant.disponivel) && stock > 0;
  return `
    <article class="variant-card" data-variant data-original-id="${escapeHtml(variant.id || '')}">
      <header class="variant-heading">
        <div><span>Versão ${String(index + 1).padStart(2, '0')}</span><h3 data-variant-heading>${escapeHtml(variant.cor || 'Nova versão')}</h3></div>
        <span class="variant-status ${available ? '' : 'sold-out'}" data-variant-status>${available ? `${stock} em estoque` : 'Sem estoque'}</span>
      </header>
      <div class="variant-body">
        <div class="variant-preview"><img src="${escapeHtml(cover)}" alt="" data-variant-preview ${cover ? '' : 'hidden'}><span data-variant-empty ${cover ? 'hidden' : ''}>Sem foto</span></div>
        <div class="variant-fields">
          <div class="variant-grid identity-grid">
            <label>Modelo ou acabamento<input name="variant-cor" value="${escapeHtml(variant.cor || '')}" required></label>
            <label>SKU<input name="variant-sku" value="${escapeHtml(variant.sku || '')}" placeholder="MX-BAG-000" required></label>
            <label>Estoque<input name="variant-estoque" type="number" min="0" step="1" value="${stock}" required></label>
          </div>
          <div class="variant-grid">
            <label>Preço atual<input name="variant-preco" type="number" min="0" step="0.01" value="${Number(variant.preco) || 0}" required></label>
            <label>Preço anterior<input name="variant-preco-anterior" type="number" min="0" step="0.01" value="${variant.precoAnterior ?? ''}"></label>
            <label>Peso em kg<input name="variant-peso" type="number" min="0" step="0.001" value="${variant.pesoKg ?? ''}"></label>
          </div>
          <div class="variant-grid">
            <label>Largura (cm)<input name="variant-largura" type="number" min="0" step="0.1" value="${variant.medidas?.largura ?? ''}"></label>
            <label>Altura (cm)<input name="variant-altura" type="number" min="0" step="0.1" value="${variant.medidas?.altura ?? ''}"></label>
            <label>Profundidade (cm)<input name="variant-profundidade" type="number" min="0" step="0.1" value="${variant.medidas?.profundidade ?? ''}"></label>
          </div>
          <label>Fotos desta versão<textarea name="variant-imagens" rows="5" required placeholder="assets/products/modelo/sku/01.webp&#10;assets/products/modelo/sku/02.webp">${escapeHtml(images)}</textarea><small>Uma por linha. A primeira foto representa esta versão no catálogo.</small></label>
          <div class="variant-footer">
            <label class="availability-check"><input name="variant-disponivel" type="checkbox" ${available ? 'checked' : ''}> Disponível no site</label>
            <div class="variant-actions">
              <button type="button" class="small-button" data-variant-action="up" ${index === 0 ? 'disabled' : ''} aria-label="Mover versão para cima">↑</button>
              <button type="button" class="small-button" data-variant-action="down" ${index === total - 1 ? 'disabled' : ''} aria-label="Mover versão para baixo">↓</button>
              <button type="button" class="small-button" data-variant-action="duplicate">Duplicar</button>
              <button type="button" class="small-button sold-button" data-variant-action="sold">Marcar vendida</button>
              <button type="button" class="small-button danger" data-variant-action="remove">Remover</button>
            </div>
          </div>
        </div>
      </div>
    </article>`;
}

function renderVariants(variants) {
  const container = editor.querySelector('[data-variants]');
  container.innerHTML = variants.map((variant, index) => variantCard(variant, index, variants.length)).join('');
  container.querySelectorAll('[data-variant]').forEach(refreshVariantCard);
  updateStockSummary();
}

function refreshVariantCard(card) {
  const paths = cleanLines(card.querySelector('[name="variant-imagens"]').value);
  const preview = card.querySelector('[data-variant-preview]');
  const empty = card.querySelector('[data-variant-empty]');
  const color = card.querySelector('[name="variant-cor"]').value.trim() || 'Nova versão';
  const stock = Math.max(0, Number(card.querySelector('[name="variant-estoque"]').value) || 0);
  const checkbox = card.querySelector('[name="variant-disponivel"]');
  const available = checkbox.checked && stock > 0;
  card.querySelector('[data-variant-heading]').textContent = color;
  const status = card.querySelector('[data-variant-status]');
  status.textContent = available ? `${stock} em estoque` : 'Sem estoque';
  status.classList.toggle('sold-out', !available);
  if (paths[0]) {
    preview.src = paths[0];
    preview.hidden = false;
    empty.hidden = true;
    preview.onerror = () => { preview.hidden = true; empty.hidden = false; };
  } else {
    preview.hidden = true;
    empty.hidden = false;
  }
}

function collectVariants(allowIncomplete = false) {
  const productId = slugify(editor.querySelector('[name="id"]')?.value || selectedId || 'produto');
  const existingProduct = catalog.products.find(item => item.id === selectedId) || {};
  const existing = new Map((existingProduct.variantes || []).map(item => [item.id, item]));
  const variants = [...editor.querySelectorAll('[data-variant]')].map((card, index) => {
    const sku = card.querySelector('[name="variant-sku"]').value.trim().toUpperCase();
    const color = card.querySelector('[name="variant-cor"]').value.trim();
    const stock = Math.max(0, Math.trunc(Number(card.querySelector('[name="variant-estoque"]').value) || 0));
    const available = card.querySelector('[name="variant-disponivel"]').checked && stock > 0;
    const dimensions = ['largura', 'altura', 'profundidade'].map(key => numberOrNull(card.querySelector(`[name="variant-${key}"]`).value));
    const images = cleanLines(card.querySelector('[name="variant-imagens"]').value);
    const originalId = card.dataset.originalId;
    const id = `${productId}-${slugify(sku || color || `versao-${index + 1}`)}`;
    return {
      ...(existing.get(originalId) || {}),
      id,
      sku,
      cor: color,
      preco: Number(card.querySelector('[name="variant-preco"]').value) || 0,
      precoAnterior: numberOrNull(card.querySelector('[name="variant-preco-anterior"]').value),
      disponivel: available,
      estoque: stock,
      pesoKg: numberOrNull(card.querySelector('[name="variant-peso"]').value),
      medidas: dimensions.some(value => value !== null) ? { largura: dimensions[0], altura: dimensions[1], profundidade: dimensions[2] } : null,
      imagens: images
    };
  });

  if (!allowIncomplete) {
    if (!variants.length) throw new Error('Adicione ao menos uma versão da bolsa.');
    const skus = new Set();
    variants.forEach((variant, index) => {
      if (!variant.cor) throw new Error(`Informe o modelo ou acabamento da versão ${index + 1}.`);
      if (!variant.sku) throw new Error(`Informe o SKU da versão ${index + 1}.`);
      if (skus.has(variant.sku)) throw new Error(`O SKU ${variant.sku} está repetido neste produto.`);
      if (!variant.imagens.length) throw new Error(`Adicione ao menos uma foto para a versão ${variant.cor}.`);
      skus.add(variant.sku);
    });
  }
  return variants;
}

function updateStockSummary() {
  const summary = editor.querySelector('[data-stock-summary]');
  if (!summary) return;
  const variants = collectVariants(true);
  const available = variants.filter(item => item.disponivel && item.estoque > 0);
  const units = available.reduce((total, item) => total + item.estoque, 0);
  summary.innerHTML = `<div><span>Versões</span><strong>${variants.length}</strong></div><div><span>Disponíveis</span><strong>${available.length}</strong></div><div><span>Unidades em estoque</span><strong>${units}</strong></div><p>${available.length ? 'A linha continuará disponível enquanto ao menos um modelo possuir estoque.' : 'Todos os modelos estão esgotados. A linha aparecerá como esgotada.'}</p>`;
}

function renderEditor() {
  const product = catalog.products.find(item => item.id === selectedId);
  if (!product) {
    editor.innerHTML = '<div class="empty-editor"><span>MS</span><h1>Selecione uma peça</h1><p>Escolha um produto na lista ou adicione um novo.</p></div>';
    return;
  }

  editor.innerHTML = '';
  editor.append(template.content.cloneNode(true));
  const form = editor.querySelector('[data-form]');
  editor.querySelector('[data-title]').textContent = product.nome;
  editor.querySelector('[data-position]').textContent = `Produto ${product.ordem} de ${catalog.products.length}`;

  const values = {
    ...product,
    materiais: (product.materiais || []).join('\n'),
    imagemDestaque: product.imagemDestaque || ''
  };
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
  });

  renderVariants(adminVariants(product));
  form.elements.nome.addEventListener('input', () => {
    if (!form.elements.id.dataset.touched) form.elements.id.value = slugify(form.elements.nome.value);
  });
  form.elements.id.addEventListener('input', () => { form.elements.id.dataset.touched = 'true'; });
  form.addEventListener('submit', saveForm);
  editor.querySelector('[data-duplicate]').addEventListener('click', duplicateProduct);
  editor.querySelector('[data-delete]').addEventListener('click', () => {
    pendingDelete = product.id;
    confirmDialog.showModal();
  });
  editor.querySelector('[data-add-variant]').addEventListener('click', addVariant);
  editor.querySelector('[data-variants]').addEventListener('input', handleVariantInput);
  editor.querySelector('[data-variants]').addEventListener('change', handleVariantInput);
  editor.querySelector('[data-variants]').addEventListener('click', handleVariantAction);
}

function handleVariantInput(event) {
  const card = event.target.closest('[data-variant]');
  if (!card) return;
  if (event.target.name === 'variant-estoque') {
    const stock = Math.max(0, Math.trunc(Number(event.target.value) || 0));
    event.target.value = stock;
    card.querySelector('[name="variant-disponivel"]').checked = stock > 0;
  }
  refreshVariantCard(card);
  updateStockSummary();
}

function handleVariantAction(event) {
  const button = event.target.closest('[data-variant-action]');
  if (!button) return;
  const card = button.closest('[data-variant]');
  const cards = [...editor.querySelectorAll('[data-variant]')];
  const index = cards.indexOf(card);
  const variants = collectVariants(true);
  const action = button.dataset.variantAction;

  if (action === 'sold') {
    card.querySelector('[name="variant-estoque"]').value = 0;
    card.querySelector('[name="variant-disponivel"]').checked = false;
    refreshVariantCard(card);
    updateStockSummary();
    statusMessage('Versão marcada como vendida. Clique em Salvar e publicar para confirmar.', 'warning');
    return;
  }
  if (action === 'remove') {
    if (variants.length === 1) {
      alert('O produto precisa ter ao menos uma versão.');
      return;
    }
    if (!confirm(`Remover a versão ${variants[index].cor || index + 1}?`)) return;
    variants.splice(index, 1);
  }
  if (action === 'duplicate') {
    const copy = structuredClone(variants[index]);
    copy.id = '';
    copy.sku = '';
    copy.cor = `${copy.cor} — cópia`;
    variants.splice(index + 1, 0, copy);
  }
  if (action === 'up' && index > 0) [variants[index - 1], variants[index]] = [variants[index], variants[index - 1]];
  if (action === 'down' && index < variants.length - 1) [variants[index + 1], variants[index]] = [variants[index], variants[index + 1]];
  renderVariants(variants);
}

function addVariant() {
  const variants = collectVariants(true);
  const base = variants.find(item => item.disponivel) || variants[0] || {};
  variants.push({
    id: '',
    sku: '',
    cor: '',
    preco: base.preco || 0,
    precoAnterior: base.precoAnterior || null,
    disponivel: true,
    estoque: 1,
    pesoKg: base.pesoKg || null,
    medidas: structuredClone(base.medidas || null),
    imagens: []
  });
  renderVariants(variants);
  const cards = editor.querySelectorAll('[data-variant]');
  cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  cards[cards.length - 1].querySelector('[name="variant-cor"]').focus();
}

function productFromForm(form) {
  const existingIndex = catalog.products.findIndex(product => product.id === selectedId);
  const existing = catalog.products[existingIndex] || {};
  const data = new FormData(form);
  const variants = collectVariants();
  const preferred = variants.find(item => item.disponivel && item.estoque > 0) || variants[0];
  const colors = [...new Set(variants.map(item => item.cor).filter(Boolean))];
  const images = variants.map(item => item.imagens[0]).filter(Boolean);
  return {
    existingIndex,
    product: {
      ...existing,
      id: String(data.get('id')).trim(),
      nome: String(data.get('nome')).trim(),
      categoria: String(data.get('categoria')).trim(),
      colecao: String(data.get('colecao')).trim(),
      preco: preferred.preco,
      precoAnterior: preferred.precoAnterior,
      disponivel: variants.some(item => item.disponivel && item.estoque > 0),
      destaque: form.elements.destaque.checked,
      resumo: String(data.get('resumo')).trim(),
      descricao: String(data.get('descricao')).trim(),
      materiais: cleanLines(data.get('materiais')),
      cores: colors,
      medidas: preferred.medidas,
      imagens: images,
      variantes: variants,
      imagemDestaque: String(data.get('imagemDestaque')).trim(),
      imagemConceitual: form.elements.imagemConceitual.checked,
      ordem: Number(data.get('ordem')) || catalog.products.length
    }
  };
}

async function publishCatalog(message = 'catalog: atualiza produtos') {
  storeDraft();
  if (!localApi.available) throw new Error('Servidor local indisponível. Abra pelo atalho Gerenciador Maximos Signature.');
  publishButton.disabled = true;
  setSync('Publicando…', 'working');
  try {
    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Maximos-Token': localApi.token },
      body: JSON.stringify({ catalog, message })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível publicar o catálogo.');
    localStorage.removeItem(DRAFT_KEY);
    const suffix = result.commit ? ` · ${result.commit}` : '';
    setSync(`Sincronizado${suffix}`, 'success');
    return result;
  } catch (error) {
    setSync('Falha na publicação', 'error');
    throw error;
  } finally {
    publishButton.disabled = false;
  }
}

async function saveForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  let parsed;
  try {
    parsed = productFromForm(form);
  } catch (error) {
    statusMessage(error.message, 'error');
    return;
  }
  const { existingIndex, product } = parsed;
  if (catalog.products.some((item, index) => item.id === product.id && index !== existingIndex)) {
    statusMessage('Já existe outro produto com este ID.', 'error');
    return;
  }
  const otherSkus = new Set(catalog.products.flatMap((item, index) => index === existingIndex ? [] : adminVariants(item).map(variant => variant.sku)).filter(Boolean));
  const duplicateSku = product.variantes.find(variant => otherSkus.has(variant.sku));
  if (duplicateSku) {
    statusMessage(`O SKU ${duplicateSku.sku} já pertence a outro produto.`, 'error');
    return;
  }

  catalog.products[existingIndex] = product;
  selectedId = product.id;
  storeDraft();
  submit.disabled = true;
  statusMessage('Salvando e enviando ao GitHub…', 'working');
  try {
    const result = await publishCatalog(`catalog: atualiza ${product.nome}`);
    renderList(document.querySelector('[data-search]').value);
    renderEditor();
    statusMessage(result.changed ? 'Produto, versões e estoque publicados.' : 'Nenhuma alteração nova para publicar.', 'success');
  } catch (error) {
    renderList(document.querySelector('[data-search]').value);
    renderEditor();
    statusMessage(`Alteração salva localmente, mas não publicada: ${error.message}`, 'error');
  } finally {
    submit.disabled = false;
  }
}

function addProduct() {
  const next = catalog.products.length + 1;
  const product = {
    id: `nova-peca-${next}`,
    nome: 'Nova peça',
    categoria: 'Bolsas',
    colecao: '',
    preco: 0,
    precoAnterior: null,
    disponivel: true,
    destaque: false,
    resumo: '',
    descricao: '',
    materiais: ['Couro legítimo'],
    cores: ['Nova versão'],
    medidas: null,
    imagens: [],
    variantes: [{ id: '', sku: '', cor: 'Nova versão', preco: 0, precoAnterior: null, disponivel: true, estoque: 1, pesoKg: null, medidas: null, imagens: [] }],
    imagemDestaque: '',
    imagemConceitual: false,
    ordem: next
  };
  catalog.products.push(product);
  selectedId = product.id;
  storeDraft();
  renderList();
  renderEditor();
  statusMessage('Nova peça criada. Cadastre ao menos uma versão com SKU e fotos.');
}

function duplicateProduct() {
  const source = catalog.products.find(product => product.id === selectedId);
  const copy = structuredClone(source);
  copy.id = `${source.id}-copia`;
  copy.nome = `${source.nome} — cópia`;
  copy.ordem = catalog.products.length + 1;
  copy.variantes = adminVariants(copy).map((variant, index) => ({ ...variant, id: '', sku: `${variant.sku}-COPIA-${index + 1}` }));
  catalog.products.push(copy);
  selectedId = copy.id;
  storeDraft();
  renderList();
  renderEditor();
  statusMessage('Cópia criada. Revise os SKUs e as fotos antes de publicar.');
}

async function deleteProduct() {
  const removed = catalog.products.find(product => product.id === pendingDelete);
  catalog.products = catalog.products.filter(product => product.id !== pendingDelete);
  selectedId = catalog.products[0]?.id || null;
  pendingDelete = null;
  storeDraft();
  confirmDialog.close();
  renderList();
  renderEditor();
  statusMessage('Excluindo e publicando…', 'working');
  try {
    await publishCatalog(`catalog: remove ${removed?.nome || 'produto'}`);
    statusMessage('Produto removido e alteração publicada.', 'success');
  } catch (error) {
    statusMessage(`Produto removido localmente, mas não publicado: ${error.message}`, 'error');
  }
}

function exportCatalog() {
  storeDraft();
  const blob = new Blob([JSON.stringify(catalog, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importCatalog(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.products)) throw new Error();
      catalog = data;
      selectedId = catalog.products[0]?.id || null;
      storeDraft();
      renderList();
      renderEditor();
      statusMessage('JSON importado. Revise as versões e clique em Salvar e publicar.');
    } catch {
      alert('O arquivo não possui um catálogo válido.');
    }
  };
  reader.readAsText(file);
}

async function connect() {
  try {
    const statusResponse = await fetch('/api/status', { cache: 'no-store' });
    if (!statusResponse.ok) throw new Error();
    const status = await statusResponse.json();
    localApi = { available: true, token: status.token, branch: status.branch, remote: status.remote };
    const productsResponse = await fetch('/api/products', { cache: 'no-store' });
    if (!productsResponse.ok) throw new Error();
    catalog = await productsResponse.json();
    setSync(`GitHub · ${status.branch}`, status.remote ? 'success' : 'warning');
  } catch {
    localApi.available = false;
    const draft = localStorage.getItem(DRAFT_KEY);
    catalog = draft ? JSON.parse(draft) : await fetch('data/products.json').then(response => response.json());
    setSync('Modo rascunho', 'warning');
  }
  selectedId = catalog.products[0]?.id || null;
  renderList();
  renderEditor();
  if (!localApi.available) statusMessage('Abra pelo atalho do gerenciador para salvar e publicar no GitHub.', 'warning');
}

document.querySelector('[data-add]').addEventListener('click', addProduct);
document.querySelector('[data-search]').addEventListener('input', event => renderList(event.target.value));
document.querySelector('[data-export]').addEventListener('click', exportCatalog);
document.querySelector('[data-publish]').addEventListener('click', async () => {
  const form = editor.querySelector('[data-form]');
  if (form) {
    form.requestSubmit();
    return;
  }
  try {
    await publishCatalog('catalog: publica alteracoes do gerenciador');
    statusMessage('Catálogo publicado com sucesso.', 'success');
  } catch (error) {
    statusMessage(error.message, 'error');
  }
});
document.querySelector('[data-import]').addEventListener('change', event => event.target.files[0] && importCatalog(event.target.files[0]));
document.querySelector('[data-cancel]').addEventListener('click', () => confirmDialog.close());
document.querySelector('[data-confirm-delete]').addEventListener('click', deleteProduct);

connect().catch(error => {
  setSync('Erro ao carregar', 'error');
  editor.innerHTML = `<div class="empty-editor"><span>!</span><h1>Não foi possível carregar</h1><p>${escapeHtml(error.message)}</p></div>`;
});
