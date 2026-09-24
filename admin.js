const DRAFT_KEY = 'maximos-catalog-draft-v3';
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
const cleanLines = value => value.split('\n').map(item => item.trim()).filter(Boolean);
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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

function renderList(query = '') {
  const term = query.toLowerCase();
  const visible = [...catalog.products]
    .sort((a, b) => a.ordem - b.ordem)
    .filter(product => `${product.nome} ${product.colecao}`.toLowerCase().includes(term));

  document.querySelector('[data-total]').textContent = catalog.products.length;
  list.innerHTML = visible.map(product => `<button type="button" data-id="${escapeHtml(product.id)}" class="${product.id === selectedId ? 'active' : ''}"><img src="${escapeHtml(product.imagens?.[0] || 'assets/hero-conceitual.png')}" alt=""><span><b>${escapeHtml(product.nome)}</b><small>${escapeHtml(product.colecao || 'Sem coleção')}</small></span><i class="availability-dot ${product.disponivel ? '' : 'no'}" title="${product.disponivel ? 'Disponível' : 'Indisponível'}"></i></button>`).join('') || '<p>Nenhum produto encontrado.</p>';
  list.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => selectProduct(button.dataset.id)));
}

function selectProduct(id) {
  selectedId = id;
  renderList(document.querySelector('[data-search]').value);
  renderEditor();
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
    cores: (product.cores || []).join('\n'),
    imagens: (product.imagens || []).join('\n'),
    largura: product.medidas?.largura ?? '',
    altura: product.medidas?.altura ?? '',
    profundidade: product.medidas?.profundidade ?? ''
  };

  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
  });

  updatePreview();
  form.elements.imagens.addEventListener('input', updatePreview);
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
}

function updatePreview() {
  const form = editor.querySelector('[data-form]');
  if (!form) return;
  const src = cleanLines(form.elements.imagens.value)[0];
  const image = editor.querySelector('[data-image-preview]');
  const empty = editor.querySelector('[data-no-image]');
  if (src) {
    image.src = src;
    image.hidden = false;
    empty.hidden = true;
    image.onerror = () => { image.hidden = true; empty.hidden = false; };
  } else {
    image.hidden = true;
    empty.hidden = false;
  }
}

function productFromForm(form) {
  const existingIndex = catalog.products.findIndex(product => product.id === selectedId);
  const existing = catalog.products[existingIndex] || {};
  const data = new FormData(form);
  const dimensions = ['largura', 'altura', 'profundidade'].map(key => Number(data.get(key)) || null);
  return {
    existingIndex,
    product: {
      ...existing,
      id: String(data.get('id')).trim(),
      nome: String(data.get('nome')).trim(),
      categoria: String(data.get('categoria')).trim(),
      colecao: String(data.get('colecao')).trim(),
      preco: Number(data.get('preco')),
      precoAnterior: Number(data.get('precoAnterior')) || null,
      disponivel: form.elements.disponivel.checked,
      destaque: form.elements.destaque.checked,
      resumo: String(data.get('resumo')).trim(),
      descricao: String(data.get('descricao')).trim(),
      materiais: cleanLines(String(data.get('materiais'))),
      cores: cleanLines(String(data.get('cores'))),
      medidas: dimensions.some(Boolean) ? { largura: dimensions[0], altura: dimensions[1], profundidade: dimensions[2] } : null,
      imagens: cleanLines(String(data.get('imagens'))),
      imagemConceitual: form.elements.imagemConceitual.checked,
      ordem: Number(data.get('ordem')) || catalog.products.length
    }
  };
}

async function publishCatalog(message = 'catalog: atualiza produtos') {
  storeDraft();
  if (!localApi.available) {
    throw new Error('Servidor local indisponível. Inicie com: python3 scripts/local_admin_server.py');
  }

  publishButton.disabled = true;
  setSync('Publicando…', 'working');
  try {
    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Maximos-Token': localApi.token
      },
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
  const { existingIndex, product } = productFromForm(form);

  if (catalog.products.some((item, index) => item.id === product.id && index !== existingIndex)) {
    alert('Já existe outro produto com este ID.');
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
    statusMessage(result.changed ? 'Alteração publicada. O GitHub Pages será atualizado automaticamente.' : 'Nenhuma alteração nova para publicar.', 'success');
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
    cores: ['Consultar disponibilidade'],
    medidas: null,
    imagens: ['assets/hero-conceitual.png'],
    imagemConceitual: true,
    ordem: next
  };
  catalog.products.push(product);
  selectedId = product.id;
  storeDraft();
  renderList();
  renderEditor();
  statusMessage('Nova peça criada. Preencha os dados e clique em Salvar e publicar.');
}

function duplicateProduct() {
  const source = catalog.products.find(product => product.id === selectedId);
  const copy = structuredClone(source);
  copy.id = `${source.id}-copia`;
  copy.nome = `${source.nome} — cópia`;
  copy.ordem = catalog.products.length + 1;
  catalog.products.push(copy);
  selectedId = copy.id;
  storeDraft();
  renderList();
  renderEditor();
  statusMessage('Cópia criada. Revise os dados antes de publicar.');
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
      statusMessage('JSON importado. Clique em Publicar catálogo para enviá-lo ao GitHub.');
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
    localApi = {
      available: true,
      token: status.token,
      branch: status.branch,
      remote: status.remote
    };
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
  if (!localApi.available) {
    statusMessage('Abra pelo servidor local para salvar e publicar no GitHub.', 'warning');
  }
}

document.querySelector('[data-add]').addEventListener('click', addProduct);
document.querySelector('[data-search]').addEventListener('input', event => renderList(event.target.value));
document.querySelector('[data-export]').addEventListener('click', exportCatalog);
document.querySelector('[data-publish]').addEventListener('click', async () => {
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
