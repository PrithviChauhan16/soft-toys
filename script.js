/* PEPE KUN - functionality only. UI/design/photos unchanged */

(function () {
  'use strict';

  const SUPABASE_URL =
    'https://cmxhngjykgoqblobyefh.supabase.co';

  const SUPABASE_ANON_KEY =
    'sb_publishable_05GBhGfDMBLN009-tv5soQ_XKQ_7jPc';

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== 'function'
  ) {
    console.error('Supabase library did not load.');
    return;
  }

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  let products = [];

  let cart = JSON.parse(
    localStorage.getItem('pepekun_cart') || '[]'
  );

  let currentUser = null;

  function toggleMobileMenu() {
    const menu =
      document.getElementById('mobile-menu');

    if (!menu) return;

    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
  }

  function escapeHtml(value = '') {
    return String(value).replace(
      /[&<>'"]/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char])
    );
  }

  async function loadProducts() {
    const { data, error } =
      await supabaseClient
        .from('products')
        .select('*');

    if (error) {
      console.error(
        'PRODUCTS LOAD ERROR:',
        error
      );

      alert(
        'Products error: ' +
        error.message
      );

      return;
    }

    products = data || [];

    console.log(
      'Products loaded:',
      products.length
    );
  }

  async function loadUserAndCart() {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    currentUser = user || null;

    if (currentUser) {
      const { data, error } =
        await supabaseClient
          .from('carts')
          .select('items')
          .eq(
            'user_id',
            currentUser.id
          )
          .maybeSingle();

      if (!error && data?.items) {
        cart = data.items;

        localStorage.setItem(
          'pepekun_cart',
          JSON.stringify(cart)
        );
      }
    }

    updateCartUI();
  }

  async function syncCart() {
    localStorage.setItem(
      'pepekun_cart',
      JSON.stringify(cart)
    );

    if (currentUser) {
      const { error } =
        await supabaseClient
          .from('carts')
          .upsert(
            {
              user_id: currentUser.id,
              items: cart
            },
            {
              onConflict: 'user_id'
            }
          );

      if (error) {
        console.error(
          'Cart save error:',
          error
        );
      }
    }

    updateCartUI();
  }

  function updateCartUI() {
    const count =
      cart.reduce(
        (total, item) =>
          total +
          (Number(item.quantity) || 1),
        0
      );

    [
      'cart-count',
      'cart-count-mobile'
    ].forEach(id => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = count;
      }
    });
  }

  async function addToCart(productId) {
    const product =
      products.find(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {
      alert(
        'This product is not available right now.'
      );
      return;
    }

    const existing =
      cart.find(
        item =>
          String(
            item.product_id || item.id
          ) ===
          String(productId)
      );

    if (existing) {
      existing.quantity =
        (Number(existing.quantity) || 1) + 1;
    } else {
      cart.push({
        ...product,
        product_id: product.id,
        quantity: 1
      });
    }

    await syncCart();

    const button =
      document.getElementById(
        `btn-${productId}`
      );

    if (button) {
      const oldText =
        button.textContent;

      button.textContent =
        'Added ✓';

      setTimeout(() => {
        button.textContent = oldText;
      }, 1200);
    }
  }

  function showCategory(categoryName) {
    const section =
      document.getElementById(
        'product-display'
      );

    const grid =
      document.getElementById(
        'product-grid'
      );

    const title =
      document.getElementById(
        'active-category-title'
      );

    if (!section || !grid) {
      console.error(
        'Product display elements not found.'
      );
      return;
    }

    const list =
      products.filter(
        product =>
          String(
            product.category || ''
          ).toLowerCase() ===
          String(
            categoryName || ''
          ).toLowerCase()
      );

    if (title) {
      title.textContent =
        categoryName;
    }

    grid.innerHTML =
      list.length
        ? list
            .map(
              product => `
        <div class="masonry-item bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group">

          <div class="cloud-tag">
            ${escapeHtml(
              product.tag || 'PEPE KUN'
            )}
          </div>

          <div class="w-full ${escapeHtml(
            product.heightClass ||
            'h-[300px]'
          )} overflow-hidden">

            <img
              src="${escapeHtml(
                product.image_url ||
                product.image ||
                ''
              )}"
              onclick="openProductModal('${escapeHtml(
                product.id
              )}')"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
              alt="${escapeHtml(
                product.name || ''
              )}"
            >

          </div>

          <div class="p-4 md:p-5">

            <div class="flex justify-between gap-3">

              <h3
                onclick="openProductModal('${escapeHtml(
                  product.id
                )}')"
                class="font-medium text-lg cursor-pointer hover:text-pink-500"
              >
                ${escapeHtml(
                  product.name || ''
                )}
              </h3>

              <span class="font-semibold">
                ₹${Number(
                  product.price || 0
                ).toLocaleString('en-IN')}
              </span>

            </div>

            <button
              id="btn-${escapeHtml(
                product.id
              )}"
              onclick="addToCart('${escapeHtml(
                product.id
              )}')"
              class="mt-4 w-full bg-brand-900 text-white rounded-full py-2.5"
            >
              Add to Cart
            </button>

          </div>
        </div>
      `
            )
            .join('')
        : `
        <div class="col-span-full text-center bg-white/80 rounded-3xl p-12">
          No products in this collection yet.
        </div>
      `;

    section.classList.remove(
      'hidden'
    );

    setTimeout(() => {
      section.classList.remove(
        'opacity-0'
      );

      section.scrollIntoView({
        behavior: 'smooth'
      });
    }, 20);
  }

  function hideProducts() {
    const section =
      document.getElementById(
        'product-display'
      );

    if (!section) return;

    section.classList.add(
      'opacity-0'
    );

    setTimeout(() => {
      section.classList.add(
        'hidden'
      );
    }, 300);
  }

  function updateCenterMedia(
    type,
    url
  ) {
    const image =
      document.getElementById(
        'center-img'
      );

    const videoContainer =
      document.getElementById(
        'center-video-container'
      );

    const video =
      document.getElementById(
        'center-video'
      );

    const source =
      document.getElementById(
        'center-video-src'
      );

    if (
      !image ||
      !videoContainer ||
      !video ||
      !source
    ) {
      return;
    }

    if (type === 'image') {
      video.pause();

      videoContainer.classList.add(
        'hidden'
      );

      image.src = url;

      image.classList.remove(
        'hidden'
      );
    } else {
      image.classList.add(
        'hidden'
      );

      source.src = url;

      video.load();

      video.play().catch(() => {});

      videoContainer.classList.remove(
        'hidden'
      );
    }
  }

  function openProductModal(id) {
    const product =
      products.find(
        item =>
          String(item.id) ===
          String(id)
      );

    if (!product) return;

    const modalTitle =
      document.getElementById(
        'modal-title'
      );

    const modalPrice =
      document.getElementById(
        'modal-price'
      );

    const modalCategory =
      document.getElementById(
        'modal-category'
      );

    const modalDesc =
      document.getElementById(
        'modal-desc'
      );

    const modalMainImg =
      document.getElementById(
        'modal-main-img'
      );

    const modalSpecs =
      document.getElementById(
        'modal-specs'
      );

    const modalGallery =
      document.getElementById(
        'modal-gallery'
      );

    const modalAddBtn =
      document.getElementById(
        'modal-add-btn'
      );

    const modalBuyBtn =
      document.getElementById(
        'modal-buy-btn'
      );

    if (modalTitle) {
      modalTitle.textContent =
        product.name || '';
    }

    if (modalPrice) {
      modalPrice.textContent =
        `₹${Number(
          product.price || 0
        ).toLocaleString('en-IN')}`;
    }

    if (modalCategory) {
      modalCategory.textContent =
        product.category || '';
    }

    if (modalDesc) {
      modalDesc.textContent =
        product.description ||
        'A beautifully crafted companion from Pepe Kun.';
    }

    if (modalMainImg) {
      modalMainImg.src =
        product.image_url ||
        product.image ||
        '';
    }

    const specs =
      Array.isArray(product.specs)
        ? product.specs
        : [];

    if (modalSpecs) {
      modalSpecs.innerHTML =
        specs.length
          ? specs
              .map(
                item =>
                  `<li>• ${escapeHtml(
                    item
                  )}</li>`
              )
              .join('')
          : '<li>• Premium plush material</li>';
    }

    const gallery =
      Array.isArray(
        product.gallery
      ) &&
      product.gallery.length
        ? product.gallery
        : [
            product.image_url ||
            product.image
          ];

    if (modalGallery) {
      modalGallery.innerHTML =
        gallery
          .filter(Boolean)
          .map(
            image => `
            <img
              src="${escapeHtml(
                image
              )}"
              onclick="document.getElementById('modal-main-img').src='${escapeHtml(
                image
              )}'"
              class="w-20 h-20 object-cover rounded-xl border-2 border-transparent hover:border-pink-500 cursor-pointer"
              alt=""
            >
          `
          )
          .join('');
    }

    if (modalAddBtn) {
      modalAddBtn.onclick = () =>
        addToCart(product.id);
    }

    if (modalBuyBtn) {
      modalBuyBtn.onclick =
        async () => {
          await addToCart(
            product.id
          );

          location.href =
            'cart.html';
        };
    }

    const modal =
      document.getElementById(
        'product-modal'
      );

    if (modal) {
      modal.classList.remove(
        'hidden'
      );

      modal.classList.add(
        'flex'
      );

      document.body.style.overflow =
        'hidden';
    }
  }

  function closeModal() {
    const modal =
      document.getElementById(
        'product-modal'
      );

    if (!modal) return;

    modal.classList.add(
      'hidden'
    );

    modal.classList.remove(
      'flex'
    );

    document.body.style.overflow =
      'auto';
  }

  async function submitEnquiry(
    event
  ) {
    event.preventDefault();

    const form =
      event.target;

    const name =
      form
        .querySelector(
          '[name=name]'
        )
        ?.value.trim() || '';

    const email =
      form
        .querySelector(
          '[name=email]'
        )
        ?.value.trim() || '';

    const message =
      form
        .querySelector(
          '[name=message]'
        )
        ?.value.trim() || '';

    const { error } =
      await supabaseClient
        .from('enquiries')
        .insert([
          {
            name,
            email,
            message
          }
        ]);

    if (error) {
      console.error(
        'Enquiry error:',
        error
      );

      alert(
        'Could not send message: ' +
        error.message
      );

      return;
    }

    form.reset();

    alert(
      'Message sent successfully!'
    );
  }

  /*
    Make functions available to
    onclick="..." handlers in index.html.
  */

  window.toggleMobileMenu =
    toggleMobileMenu;

  window.showCategory =
    showCategory;

  window.hideProducts =
    hideProducts;

  window.updateCenterMedia =
    updateCenterMedia;

  window.openProductModal =
    openProductModal;

  window.closeModal =
    closeModal;

  window.addToCart =
    addToCart;

  document.addEventListener(
    'DOMContentLoaded',
    async () => {
      await loadProducts();
      await loadUserAndCart();

      const form =
        document.getElementById(
          'contact-form'
        );

      if (form) {
        form.addEventListener(
          'submit',
          submitEnquiry
        );
      }
    }
  );
})();
