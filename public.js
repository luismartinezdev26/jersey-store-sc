/* ═══════════════════════════════════════════
   PUBLIC PAGE — Catalog grid + lightbox
   ═══════════════════════════════════════════ */

let products = [];
let categories = new Set();
let activeCategory = 'all';
let searchQuery = '';

let lightboxIndex = 0;
let lightboxProduct = null;

/* ─── DOM refs ─── */

const grid = document.getElementById('product-grid');
const filters = document.getElementById('filters');
const searchInput = document.getElementById('search-input');
const lightbox = document.getElementById('lightbox');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCounter = document.getElementById('lightbox-counter');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxWhatsapp = document.getElementById('lightbox-whatsapp');
const lightboxThumbs = document.getElementById('lightbox-thumbs');
const lightboxMeta = document.getElementById('lightbox-meta');

/* ─── Init ─── */

function getWhatsappUrl(productName) {
  const num = CONFIG.WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`${CONFIG.WHATSAPP_PREFIX} ${productName}`);
  return `https://wa.me/${num}?text=${text}`;
}

function updateHeaderWhatsapp() {
  const num = CONFIG.WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${num}`;
  document.getElementById('header-whatsapp').href = url;
  document.getElementById('whatsapp-float').href = url;
  document.querySelector('.shop-name').textContent = CONFIG.SHOP_NAME;
}

/* ─── Render products ─── */

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.dataset.id = product.id;

  const thumb = product.images && product.images.length > 0
    ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
    : '';

  const outOfStock = product.in_stock === false;

  article.innerHTML = `
    <div class="card-image">
      <img src="${thumb}" alt="${escapeHtml(product.name)}" loading="lazy">
      <span class="photo-count">
        📷 ${product.images ? product.images.length : 0}
      </span>
      ${outOfStock ? '<span class="stock-badge out">Sin stock</span>' : ''}
    </div>
    <div class="card-footer">
      <h3 class="card-title">${escapeHtml(product.name)}</h3>
    </div>
  `;

  article.addEventListener('click', () => openLightbox(product));
  return article;
}

function renderProducts(productsToRender) {
  grid.innerHTML = '';

  if (!productsToRender || productsToRender.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No hay productos disponibles aún.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  productsToRender.forEach(p => {
    fragment.appendChild(createProductCard(p));
  });
  grid.appendChild(fragment);
}

/* ─── Filters ─── */

function renderFilters() {
  filters.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `filter-btn${activeCategory === 'all' ? ' active' : ''}`;
  allBtn.textContent = 'Todos';
  allBtn.dataset.category = 'all';
  allBtn.addEventListener('click', () => {
    activeCategory = 'all';
    filterProducts();
    renderFilters();
  });
  filters.appendChild(allBtn);

  const sorted = Array.from(categories).sort();
  sorted.forEach(cat => {
    if (!cat) return;
    const btn = document.createElement('button');
    btn.className = `filter-btn${activeCategory === cat ? ' active' : ''}`;
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      filterProducts();
      renderFilters();
    });
    filters.appendChild(btn);
  });
}

function filterProducts() {
  let filtered = products;

  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  renderProducts(filtered);
}

/* ─── Lightbox ─── */

function openLightbox(product) {
  if (!product.images || product.images.length === 0) return;

  lightboxProduct = product;
  lightboxIndex = 0;
  updateLightbox();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';

  const url = `${window.location.pathname}?product=${product.id}`;
  window.history.replaceState(null, '', url);
}

function updateLightbox() {
  if (!lightboxProduct) return;

  const images = lightboxProduct.images;
  const current = images[lightboxIndex];
  const currentUrl = typeof current === 'string' ? current : current.url;
  const currentDesc = typeof current === 'string' ? '' : (current.description || '');
  const outOfStock = lightboxProduct.in_stock === false;

  lightboxImage.src = currentUrl;
  lightboxImage.alt = currentDesc || escapeHtml(lightboxProduct.name);
  lightboxTitle.textContent = lightboxProduct.name;
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${images.length}`;
  lightboxWhatsapp.href = getWhatsappUrl(lightboxProduct.name);

  lightboxMeta.innerHTML = '';
  if (currentDesc) {
    const descEl = document.createElement('span');
    descEl.className = 'lightbox-description';
    descEl.textContent = currentDesc;
    lightboxMeta.appendChild(descEl);
  }
  if (outOfStock) {
    const badge = document.createElement('span');
    badge.className = 'stock-badge in';
    badge.textContent = '💤 Sin stock';
    lightboxMeta.appendChild(badge);
  }

  renderThumbs(images);

  lightboxPrev.style.display = images.length > 1 ? '' : 'none';
  lightboxNext.style.display = images.length > 1 ? '' : 'none';
}

function renderThumbs(images) {
  lightboxThumbs.innerHTML = '';
  images.forEach((img, i) => {
    const thumbUrl = typeof img === 'string' ? img : img.url;
    const thumbDesc = typeof img === 'string' ? '' : (img.description || '');
    const thumb = document.createElement('button');
    thumb.className = `lightbox-thumb${i === lightboxIndex ? ' active' : ''}`;
    thumb.innerHTML = `<img src="${thumbUrl}" alt="${escapeHtml(thumbDesc)}">`;
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      lightboxIndex = i;
      updateLightbox();
    });
    lightboxThumbs.appendChild(thumb);
  });

  lightboxThumbs.children[lightboxIndex]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  });
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxProduct = null;
  lightboxThumbs.innerHTML = '';
  window.history.replaceState(null, '', window.location.pathname);
}

function lightboxPrevImage() {
  if (!lightboxProduct) return;
  const len = lightboxProduct.images.length;
  lightboxIndex = (lightboxIndex - 1 + len) % len;
  updateLightbox();
}

function lightboxNextImage() {
  if (!lightboxProduct) return;
  const len = lightboxProduct.images.length;
  lightboxIndex = (lightboxIndex + 1) % len;
  updateLightbox();
}

/* ─── Lightbox events ─── */

lightboxClose.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

lightboxPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  lightboxPrevImage();
});

lightboxNext.addEventListener('click', (e) => {
  e.stopPropagation();
  lightboxNextImage();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrevImage();
  if (e.key === 'ArrowRight') lightboxNextImage();
});

/* ─── Search ─── */

if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    filterProducts();
  });
}

/* ─── Open product from URL ─── */

function openProductFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('product');
  if (!productId) return;
  const match = products.find(p => p.id === productId);
  if (match) openLightbox(match);
}

/* ─── Fetch products ─── */

async function fetchProducts() {
  try {
    const { data, error } = await SUPABASE
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    products = (data || []).map(p => ({
      ...p,
      images: (p.images || []).map(img =>
        typeof img === 'string' ? { url: img, description: '' } : img
      ),
    }));
    products.forEach(p => {
      if (p.category) categories.add(p.category);
    });

    renderFilters();
    filterProducts();
    openProductFromUrl();
  } catch (err) {
    console.error('Error loading products:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <p>No se pudieron cargar los productos.</p>
        <p style="font-size:13px;color:var(--ink-faint);margin-top:4px;">
          Verifica la configuración de Supabase.
        </p>
      </div>
    `;
  }
}

/* ─── Helpers ─── */

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── Start ─── */

updateHeaderWhatsapp();
fetchProducts();
