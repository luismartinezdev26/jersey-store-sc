/* ═══════════════════════════════════════════
   ADMIN — Auth, CRUD, drag & drop
   ═══════════════════════════════════════════ */

let products = [];
let editingProductId = null;
let deletingProductId = null;

/* === PENDING FILES (not yet uploaded) === */

let pendingFiles = [];
let editPendingFiles = [];
let editRemovedImages = [];

/* ─── DOM refs ─── */

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminGrid = document.getElementById('admin-grid');
const addProductBtn = document.getElementById('add-product-btn');
const productCount = document.getElementById('product-count');

// Add modal
const addModal = document.getElementById('add-modal');
const addModalClose = document.getElementById('add-modal-close');
const addModalCancel = document.getElementById('add-modal-cancel');
const addModalSave = document.getElementById('add-modal-save');
const productName = document.getElementById('product-name');
const productCategory = document.getElementById('product-category');
const productStock = document.getElementById('product-stock');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imagePreviews = document.getElementById('image-previews');

// Edit modal
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editModalCancel = document.getElementById('edit-modal-cancel');
const editModalSave = document.getElementById('edit-modal-save');
const editName = document.getElementById('edit-name');
const editCategory = document.getElementById('edit-category');
const editStock = document.getElementById('edit-stock');
const editImages = document.getElementById('edit-images');
const editDropZone = document.getElementById('edit-drop-zone');
const editFileInput = document.getElementById('edit-file-input');
const editImagePreviews = document.getElementById('edit-image-previews');

// Delete modal
const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteModalCancel = document.getElementById('delete-modal-cancel');
const deleteModalConfirm = document.getElementById('delete-modal-confirm');
const deleteProductName = document.getElementById('delete-product-name');

/* ─── Auth ─── */

async function checkSession() {
  const { data: { session } } = await SUPABASE.auth.getSession();
  if (session) {
    showAdmin();
  } else {
    showLogin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('visible');
  loginError.textContent = '';

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const { error } = await SUPABASE.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos'
      : error.message;
    loginError.classList.add('visible');
  }
});

logoutBtn.addEventListener('click', async () => {
  await SUPABASE.auth.signOut();
  showLogin();
});

SUPABASE.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') showAdmin();
  if (event === 'SIGNED_OUT') showLogin();
});

function showLogin() {
  loginView.classList.remove('hidden');
  adminView.classList.add('hidden');
}

function showAdmin() {
  loginView.classList.add('hidden');
  adminView.classList.remove('hidden');
  document.title = `Admin — ${CONFIG.SHOP_NAME}`;
  document.querySelector('.admin-header .shop-name').textContent = CONFIG.SHOP_NAME;
  fetchProducts();
}

/* ─── Fetch products ─── */

async function fetchProducts() {
  try {
    adminGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    const { data, error } = await SUPABASE
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    products = data || [];
    productCount.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;
    renderAdminProducts();
  } catch (err) {
    console.error('Error fetching products:', err);
    adminGrid.innerHTML = '<div class="empty-state"><p>Error al cargar productos</p></div>';
  }
}

/* ─── Render admin products ─── */

function renderAdminProducts() {
  adminGrid.innerHTML = '';

  if (products.length === 0) {
    adminGrid.innerHTML = `
      <div class="empty-state">
        <p>No hay productos. ¡Añade tu primero!</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach((product, index) => {
    const card = createAdminCard(product, index);
    fragment.appendChild(card);
  });
  adminGrid.appendChild(fragment);
}

function createAdminCard(product, index) {
  const card = document.createElement('div');
  card.className = 'admin-product-card';
  card.dataset.id = product.id;
  card.draggable = true;

  const thumb = product.images && product.images.length > 0
    ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
    : '';

  card.innerHTML = `
    <div class="admin-card-image">
      <div class="admin-card-drag" title="Arrastrar para reordenar">⠿</div>
      <button class="admin-card-delete" title="Eliminar producto" data-id="${product.id}">✕</button>
      <img src="${thumb}" alt="${escapeHtml(product.name)}" loading="lazy">
    </div>
    <div class="admin-card-body">
      <h3 class="card-title">${escapeHtml(product.name)}</h3>
      <div class="admin-card-meta">
        📷 ${product.images ? product.images.length : 0}
        ${product.category ? `· ${escapeHtml(product.category)}` : ''}
        ${product.in_stock === false ? '· 💤 Sin stock' : ''}
      </div>
    </div>
  `;

  // Click to edit
  card.addEventListener('click', (e) => {
    if (e.target.closest('.admin-card-delete') || e.target.closest('.admin-card-drag')) return;
    openEditModal(product);
  });

  // Delete button
  card.querySelector('.admin-card-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(product);
  });

  // Drag events
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);
  card.addEventListener('dragover', handleDragOver);
  card.addEventListener('dragleave', handleDragLeave);
  card.addEventListener('drop', handleDrop);

  return card;
}

/* ─── Drag & Drop reorder ─── */

let dragSourceId = null;

function handleDragStart(e) {
  dragSourceId = this.dataset.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.admin-product-card').forEach(el => {
    el.classList.remove('drag-over');
  });
  dragSourceId = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const cards = [...adminGrid.querySelectorAll('.admin-product-card')];
  const target = this;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  cards.forEach(el => el.classList.remove('drag-over'));

  if (e.clientY < midY) {
    target.classList.add('drag-over');
  } else {
    const next = target.nextElementSibling;
    if (next && next.classList.contains('admin-product-card')) {
      next.classList.add('drag-over');
    } else {
      target.classList.add('drag-over');
    }
  }
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  if (!dragSourceId || dragSourceId === this.dataset.id) return;

  const cards = [...adminGrid.querySelectorAll('.admin-product-card')];
  const fromIndex = products.findIndex(p => p.id === dragSourceId);
  const toCard = cards.find(el => el.dataset.id === this.dataset.id);
  const toIndex = products.findIndex(p => p.id === toCard.dataset.id);

  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = products.splice(fromIndex, 1);
  products.splice(toIndex, 0, moved);

  renderAdminProducts();
  persistOrder();
}

async function persistOrder() {
  try {
    const updates = products.map((p, i) => ({
      id: p.id,
      sort_order: i,
    }));

    const { error } = await SUPABASE.from('products').upsert(updates, {
      onConflict: 'id',
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error saving order:', err);
  }
}

/* ─── Edit image drag & drop ─── */

let dragEditSrcEl = null;

function makeEditImageDraggable(el) {
  el.draggable = true;
  el.addEventListener('dragstart', handleEditImageDragStart);
  el.addEventListener('dragend', handleEditImageDragEnd);
  el.addEventListener('dragover', handleEditImageDragOver);
  el.addEventListener('dragleave', handleEditImageDragLeave);
  el.addEventListener('drop', handleEditImageDrop);
}

function handleEditImageDragStart(e) {
  dragEditSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function handleEditImageDragEnd() {
  this.classList.remove('dragging');
  editImages.querySelectorAll('.edit-image').forEach(el => el.classList.remove('drag-over-target'));
  dragEditSrcEl = null;
}

function handleEditImageDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const items = [...editImages.querySelectorAll('.edit-image:not(.dragging)')];
  items.forEach(el => el.classList.remove('drag-over-target'));

  const target = this;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  if (e.clientY < midY) {
    target.classList.add('drag-over-target');
  } else {
    const next = target.nextElementSibling;
    if (next && next.classList.contains('edit-image')) {
      next.classList.add('drag-over-target');
    } else {
      target.classList.add('drag-over-target');
    }
  }
}

function handleEditImageDragLeave() {
  this.classList.remove('drag-over-target');
}

function handleEditImageDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over-target');

  if (!dragEditSrcEl || dragEditSrcEl === this) return;

  const rect = this.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  if (e.clientY < midY) {
    editImages.insertBefore(dragEditSrcEl, this);
  } else {
    editImages.insertBefore(dragEditSrcEl, this.nextElementSibling);
  }
}

/* ─── Add product ─── */

function resetAddModal() {
  productName.value = '';
  productCategory.value = '';
  productStock.checked = true;
  pendingFiles = [];
  imagePreviews.innerHTML = '';
}

addProductBtn.addEventListener('click', () => {
  resetAddModal();
  addModal.classList.add('open');
});

addModalClose.addEventListener('click', () => addModal.classList.remove('open'));
addModalCancel.addEventListener('click', () => addModal.classList.remove('open'));

addModal.addEventListener('click', (e) => {
  if (e.target === addModal) addModal.classList.remove('open');
});

// Drop zone
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files, 'add');
});
fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files, 'add');
  fileInput.value = '';
});

function handleFiles(files, mode) {
  const target = mode === 'add' ? pendingFiles : editPendingFiles;
  const previews = mode === 'add' ? imagePreviews : editImages;
  const itemClass = mode === 'add' ? 'image-preview' : 'edit-image';

  for (const file of files) {
    target.push(file);
    const reader = new FileReader();
    const preview = document.createElement('div');
    preview.className = itemClass;
    reader.onload = (e) => {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="">
        ${mode === 'edit' ? '<div class="drag-handle">⠿</div>' : ''}
        <input type="text" class="img-desc" placeholder="Descripción (ej: 2002/03 Local)">
        <button class="remove-img">✕</button>
      `;
      preview.querySelector('.remove-img').addEventListener('click', () => {
        const idx = target.indexOf(file);
        if (idx > -1) target.splice(idx, 1);
        preview.remove();
      });
      if (mode === 'edit') makeEditImageDraggable(preview);
    };
    reader.readAsDataURL(file);
    previews.appendChild(preview);
  }
}

addModalSave.addEventListener('click', async () => {
  const name = productName.value.trim();
  const category = productCategory.value.trim();
  const inStock = productStock.checked;

  if (!name) {
    alert('Escribe un nombre para el producto');
    return;
  }

  if (pendingFiles.length === 0) {
    alert('Selecciona al menos una imagen');
    return;
  }

  addModalSave.disabled = true;
  addModalSave.textContent = 'Subiendo...';

  try {
    const urls = await uploadFiles(pendingFiles);

    const previewEls = imagePreviews.querySelectorAll('.image-preview');
    const imagesData = [];
    previewEls.forEach((el, i) => {
      const desc = el.querySelector('.img-desc').value.trim();
      imagesData.push({ url: urls[i], description: desc });
    });

    const { error } = await SUPABASE.from('products').insert({
      name,
      category: category || null,
      in_stock: inStock,
      images: imagesData,
      sort_order: products.length,
    });

    if (error) throw error;

    addModal.classList.remove('open');
    fetchProducts();
  } catch (err) {
    console.error('Error saving product:', err);
    alert('Error al guardar el producto');
  } finally {
    addModalSave.disabled = false;
    addModalSave.textContent = 'Guardar producto';
  }
});

async function uploadFiles(files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await SUPABASE.storage
      .from('product-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = SUPABASE.storage
      .from('product-images')
      .getPublicUrl(path);

    urls.push(publicUrl);
  }
  return urls;
}

/* ─── Edit product ─── */

function openEditModal(product) {
  editingProductId = product.id;
  editName.value = product.name;
  editCategory.value = product.category || '';
  editStock.checked = product.in_stock !== false;
  editPendingFiles = [];
  editRemovedImages = [];

  // Show existing images
  editImages.innerHTML = '';
  if (product.images) {
    product.images.forEach((img) => {
      const imgUrl = typeof img === 'string' ? img : img.url;
      const imgDesc = typeof img === 'string' ? '' : (img.description || '');
      const div = document.createElement('div');
      div.className = 'edit-image';
      div.innerHTML = `
        <img src="${imgUrl}" alt="">
        <div class="drag-handle" title="Arrastrar para reordenar">⠿</div>
        <input type="text" class="img-desc" placeholder="Descripción (ej: 2002/03 Local)" value="${escapeHtml(imgDesc)}">
        <button class="remove-img" data-url="${imgUrl}">✕</button>
      `;
      div.querySelector('.remove-img').addEventListener('click', () => {
        editRemovedImages.push(imgUrl);
        div.remove();
      });
      editImages.appendChild(div);
      makeEditImageDraggable(div);
    });
  }

  editModal.classList.add('open');
}

editModalClose.addEventListener('click', () => editModal.classList.remove('open'));
editModalCancel.addEventListener('click', () => editModal.classList.remove('open'));
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) editModal.classList.remove('open');
});

// Edit drop zone
editDropZone.addEventListener('click', () => editFileInput.click());
editDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  editDropZone.classList.add('drag-over');
});
editDropZone.addEventListener('dragleave', () => {
  editDropZone.classList.remove('drag-over');
});
editDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  editDropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files, 'edit');
});
editFileInput.addEventListener('change', () => {
  handleFiles(editFileInput.files, 'edit');
  editFileInput.value = '';
});

editModalSave.addEventListener('click', async () => {
  const name = editName.value.trim();
  const category = editCategory.value.trim();
  const inStock = editStock.checked;

  if (!name) {
    alert('Escribe un nombre para el producto');
    return;
  }

  editModalSave.disabled = true;
  editModalSave.textContent = 'Guardando...';

  try {
    // Upload new images
    const newUrls = await uploadFiles(editPendingFiles);

    // Read images in DOM order (existing URLs + newly uploaded)
    const allImages = [];
    let newFileIdx = 0;
    const children = editImages.querySelectorAll('.edit-image');
    for (const child of children) {
      const src = child.querySelector('img').src;
      const desc = child.querySelector('.img-desc').value.trim();
      if (src.startsWith('blob:')) {
        allImages.push({ url: newUrls[newFileIdx], description: desc });
        newFileIdx++;
      } else {
        allImages.push({ url: src, description: desc });
      }
    }

    const { error } = await SUPABASE
      .from('products')
      .update({
        name,
        category: category || null,
        in_stock: inStock,
        images: allImages,
      })
      .eq('id', editingProductId);

    if (error) throw error;

    // Delete removed images from storage
    for (const url of editRemovedImages) {
      const path = extractPathFromUrl(url);
      if (path) {
        await SUPABASE.storage.from('product-images').remove([path]);
      }
    }

    editModal.classList.remove('open');
    fetchProducts();
  } catch (err) {
    console.error('Error updating product:', err);
    alert('Error al actualizar el producto');
  } finally {
    editModalSave.disabled = false;
    editModalSave.textContent = 'Guardar cambios';
  }
});

function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/');
    const idx = segments.indexOf('product-images');
    if (idx > -1) {
      return segments.slice(idx + 1).join('/');
    }
  } catch {}
  return null;
}

/* ─── Delete product ─── */

function openDeleteModal(product) {
  deletingProductId = product.id;
  deleteProductName.textContent = product.name;
  deleteModal.classList.add('open');
}

deleteModalClose.addEventListener('click', () => deleteModal.classList.remove('open'));
deleteModalCancel.addEventListener('click', () => deleteModal.classList.remove('open'));
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) deleteModal.classList.remove('open');
});

deleteModalConfirm.addEventListener('click', async () => {
  if (!deletingProductId) return;

  deleteModalConfirm.disabled = true;
  deleteModalConfirm.textContent = 'Eliminando...';

  try {
    const product = products.find(p => p.id === deletingProductId);

    // Delete images from storage
    if (product && product.images) {
      for (const url of product.images) {
        const path = extractPathFromUrl(url);
        if (path) {
          await SUPABASE.storage.from('product-images').remove([path]);
        }
      }
    }

    // Delete from DB
    const { error } = await SUPABASE
      .from('products')
      .delete()
      .eq('id', deletingProductId);

    if (error) throw error;

    deleteModal.classList.remove('open');
    deletingProductId = null;
    fetchProducts();
  } catch (err) {
    console.error('Error deleting product:', err);
    alert('Error al eliminar el producto');
  } finally {
    deleteModalConfirm.disabled = false;
    deleteModalConfirm.textContent = 'Eliminar';
  }
});

/* ─── Helpers ─── */

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── Start ─── */

checkSession();
