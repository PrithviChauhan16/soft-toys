/* PEPE KUN - main shop logic
   Visual/layout source is kept separate. This file only handles functionality. */

const SUPABASE_URL = 'https://cmxhngjykgoqblobyefh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjbXhobmdqa2dvcWJsb2J5ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDAwNTMsImV4cCI6MjEwNDgxNjA1M30.puMa5Ty4NTWxzTM9gnSHzqAVMzgMhgAfTPu-8sIVgPM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let cart = [];
let currentUser = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[ch]));
}

function getLocalCart() {
  try {
    const value = JSON.parse(localStorage.getItem('pepekun_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveLocalCart() {
  localStorage.setItem('pepekun_cart', JSON.stringify(cart));
}

function cartQuantity(items) {
  return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
}

function mergeCarts(first, second) {
  const merged = first.map(item => ({...item, quantity: Number(item.quantity) || 1}));
  for (const item of second) {
    const existing = merged.find(x => String(x.id) === String(item.id));
    if (existing) existing.quantity += Number(item.quantity) || 1;
    else merged.push({...item, quantity: Number(item.quantity) || 1});
  }
  return merged;
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  menu.classList.toggle('hidden');
  menu.classList.toggle('flex');
}

function updateCartUI() {
  const count = cartQuantity(cart);
  ['cart-count', 'cart-count-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products load error:', error);
    products = [];
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = '<div class="col-span-full text-center bg-white/80 rounded-3xl p-12">Products could not be loaded. Please check the Supabase products table and RLS settings.</div>';
    return false;
  }

  products = data || [];
  return true;
}

async function loadUserAndCart() {
  cart = getLocalCart();

  const { data, error } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (currentUser) {
    const result = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (!result.error && Array.isArray(result.data?.items)) {
      // Keep guest-cart items and merge them with the saved account cart.
      cart = mergeCarts(result.data.items, cart);
      await saveCartToSupabase();
    } else if (result.error) {
      console.warn('Could not load saved cart:', result.error.message);
    }
  }

  saveLocalCart();
  updateCartUI();
}

async function saveCartToSupabase() {
  saveLocalCart();
  if (!currentUser) {
    updateCartUI();
    return true;
  }

  const { error } = await supabase
    .from('carts')
    .upsert(
      { user_id: currentUser.id, items: cart, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Cart save error:', error);
    return false;
  }

  updateCartUI();
  return true;
}

async function addToCart(productId) {
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) {
    alert('This product is not available right now.');
    return;
  }

  const existing = cart.find(item => String(item.id) === String(productId));
  if (existing) existing.quantity = (Number(existing.quantity) || 1) + 1;
  else cart.push({...product, quantity: 1});

  await saveCartToSupabase();

  const button = document.getElementById(`btn-${productId}`);
  if (button) {
    const oldText = button.textContent;
    button.textContent = 'Added ✓';
    setTimeout(() => { button.textContent = oldText; }, 1200);
  }
}

function showCategory(categoryName) {
  const section = document.getElementById('product-display');
  const grid = document.getElementById('product-grid');
  const title = document.getElementById('active-category-title');
  if (!section || !grid || !title) return;

  const list = products.filter(p => p.category === categoryName);
  title.textContent = categoryName;

  grid.innerHTML = list.length
    ? list.map(p => `
      <div class="masonry-item bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group">
        <div class="cloud-tag">${escapeHtml(p.tag || 'PEPE KUN')}</div>
        <div class="w-full ${escapeHtml(p.heightClass || 'h-[300px]')} overflow-hidden">
          <img src="${escapeHtml(p.image || '')}" onclick="openProductModal('${escapeHtml(p.id)}')"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
               alt="${escapeHtml(p.name || 'PEPE KUN plushie')}">
        </div>
        <div class="p-4 md:p-5">
          <div class="flex justify-between gap-3">
            <h3 onclick="openProductModal('${escapeHtml(p.id)}')" class="font-medium text-lg cursor-pointer hover:text-pink-500">
              ${escapeHtml(p.name || 'PEPE KUN Plushie')}
            </h3>
            <span class="font-semibold whitespace-nowrap">₹${Number(p.price || 0)}</span>
          </div>
          <button id="btn-${escapeHtml(p.id)}" onclick="addToCart('${escapeHtml(p.id)}')"
                  class="mt-4 w-full bg-brand-900 text-white rounded-full py-2.5">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('')
    : '<div class="col-span-full text-center bg-white/80 rounded-3xl p-12">No products in this collection yet.</div>';

  section.classList.remove('hidden');
  setTimeout(() => {
    section.classList.remove('opacity-0');
    section.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, 20);
}

function hideProducts() {
  const section = document.getElementById('product-display');
  if (!section) return;
  section.classList.add('opacity-0');
  setTimeout(() => section.classList.add('hidden'), 300);
}

function updateCenterMedia(type, url) {
  const image = document.getElementById('center-img');
  const videoContainer = document.getElementById('center-video-container');
  const video = document.getElementById('center-video');
  const source = document.getElementById('center-video-src');
  if (!image || !videoContainer || !video || !source) return;

  if (type === 'image') {
    video.pause();
    videoContainer.classList.add('hidden');
    image.src = url;
    image.classList.remove('hidden');
  } else {
    image.classList.add('hidden');
    source.src = url;
    videoContainer.classList.remove('hidden');
    video.load();
    video.play().catch(() => {});
    video.onerror = () => {
      // The original project references an optional local video file.
      // If it is not included, show an existing PEPE KUN image instead of a broken player.
      video.pause();
      videoContainer.classList.add('hidden');
      image.src = 'https://images.unsplash.com/photo-1558285549-2a05f32b1ba6?q=80&w=800';
      image.classList.remove('hidden');
    };
  }
}

function openProductModal(productId) {
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) return;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('modal-title', product.name || 'PEPE KUN Plushie');
  setText('modal-price', `₹${Number(product.price || 0)}`);
  setText('modal-category', product.category || '');
  setText('modal-desc', product.description || 'A beautifully crafted companion from Pepe Kun.');

  const mainImage = document.getElementById('modal-main-img');
  if (mainImage) {
    mainImage.src = product.image || '';
    mainImage.alt = product.name || 'PEPE KUN Plushie';
  }

  const specs = Array.isArray(product.specs) ? product.specs : [];
  const specsEl = document.getElementById('modal-specs');
  if (specsEl) {
    specsEl.innerHTML = specs.length
      ? specs.map(item => `<li>• ${escapeHtml(item)}</li>`).join('')
      : '<li>• Premium plush material</li>';
  }

  const gallery = document.getElementById('modal-gallery');
  if (gallery) {
    const galleryItems = Array.isArray(product.gallery) && product.gallery.length
      ? product.gallery
      : [product.image].filter(Boolean);

    gallery.innerHTML = galleryItems.map((url, index) => `
      <img src="${escapeHtml(url)}"
           onclick="document.getElementById('modal-main-img').src='${escapeHtml(url)}'"
           class="w-20 h-20 object-cover rounded-xl border-2 ${index === 0 ? 'border-pink-500' : 'border-transparent'} hover:border-pink-500 cursor-pointer"
           alt="Product photo ${index + 1}">
    `).join('');
  }

  const addButton = document.getElementById('modal-add-btn');
  const buyButton = document.getElementById('modal-buy-btn');
  if (addButton) addButton.onclick = () => addToCart(product.id);
  if (buyButton) buyButton.onclick = async () => {
    await addToCart(product.id);
    window.location.href = 'cart.html';
  };

  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => modal.classList.remove('opacity-0'));
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
  document.body.style.overflow = '';
}

async function submitEnquiry(event) {
  event.preventDefault();

  const form = event.target;
  const name = form.querySelector('[name="name"]')?.value.trim();
  const email = form.querySelector('[name="email"]')?.value.trim();
  const message = form.querySelector('[name="message"]')?.value.trim();

  if (!name || !email || !message) {
    alert('Please fill in all fields.');
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  const { error } = await supabase.from('enquiries').insert([{name, email, message}]);

  if (button) {
    button.disabled = false;
    button.textContent = 'Send Message';
  }

  if (error) {
    console.error('Enquiry error:', error);
    alert('Could not send message: ' + error.message);
    return;
  }

  form.reset();
  alert('Message sent successfully!');
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  await loadUserAndCart();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) contactForm.addEventListener('submit', submitEnquiry);
});
