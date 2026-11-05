/* =========================================
   AUREX — MAIN STORE ENGINE
   Storage: Browser LocalStorage
========================================= */

(() => {
  "use strict";

  const KEYS = {
    products: "aurexProducts",
    cart: "aurexCart",
    wishlist: "aurexWishlist",
    orders: "aurexOrders",
    customers: "aurexCustomers",
    profile: "aurexProfile"
  };

  const DEFAULT_PRODUCTS = [
    {
      id: "shoe",
      name: "Aether Runner X",
      price: 2499,
      oldPrice: 2999,
      category: "Shoes",
      stock: 20,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
      description: "Premium performance sneakers designed for everyday movement.",
      sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
      colors: ["Black", "White", "Blue", "Red"],
      createdAt: new Date().toISOString()
    },
    {
      id: "hoodie",
      name: "Oversized Hoodie",
      price: 999,
      oldPrice: 1499,
      category: "Clothing",
      stock: 25,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      description: "A comfortable oversized hoodie for your everyday style.",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Black", "White", "Blue"],
      createdAt: new Date().toISOString()
    },
    {
      id: "watch",
      name: "Nova Watch",
      price: 3999,
      oldPrice: 4499,
      category: "Watches",
      stock: 12,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
      description: "A minimal watch with a premium modern finish.",
      sizes: ["Standard"],
      colors: ["Black", "Silver", "Blue"],
      createdAt: new Date().toISOString()
    },
    {
      id: "headphones",
      name: "Pulse Headphones",
      price: 1799,
      oldPrice: 2199,
      category: "Electronics",
      stock: 18,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
      description: "Enjoy an immersive listening experience with a clean design.",
      sizes: ["Standard"],
      colors: ["Black", "White"],
      createdAt: new Date().toISOString()
    }
  ];

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (error) {
      console.warn("AUREX storage read error:", key, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("AUREX storage write error:", error);
      toast("Storage is full. Try a smaller image.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function getProducts() {
    const products = read(KEYS.products, []);
    return Array.isArray(products) ? products : [];
  }

  function saveProducts(products) {
    return write(KEYS.products, products);
  }

  function getCart() {
    const cart = read(KEYS.cart, []);
    return Array.isArray(cart) ? cart : [];
  }

  function saveCart(cart) {
    write(KEYS.cart, cart);
    updateHeaderCounts();
  }

  function getWishlist() {
    const list = read(KEYS.wishlist, []);
    return Array.isArray(list) ? list : [];
  }

  function saveWishlist(list) {
    write(KEYS.wishlist, list);
    updateHeaderCounts();
  }

  function getOrders() {
    const orders = read(KEYS.orders, []);
    return Array.isArray(orders) ? orders : [];
  }

  function toast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) {
      console.log(message);
      return;
    }

    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => item.remove(), 2800);
  }

  function showPage(name) {
    const target = document.querySelector(
      `.page-view[data-page="${name}"]`
    );

    if (!target) name = "home";

    document.querySelectorAll(".page-view").forEach(page => {
      page.classList.toggle("active", page.dataset.page === name);
    });

    document.querySelectorAll("[data-route]").forEach(link => {
      link.classList.toggle("active", link.dataset.route === name);
    });

    const footer = document.getElementById("mainFooter");
    if (footer) footer.style.display = name === "admin" ? "none" : "";

    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) mobileMenu.classList.remove("open");

    if (name === "shop") renderShop();
    if (name === "cart") renderCart();
    if (name === "wishlist") renderWishlist();
    if (name === "orders") renderOrders();
    if (name === "profile") renderProfile();
    if (name === "checkout") renderCheckout();
    if (name === "admin" && window.AUREX_ADMIN) {
      window.AUREX_ADMIN.render();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigate(name) {
    if (!name) return;
    if (location.hash !== "#" + name) {
      location.hash = name;
    } else {
      showPage(name);
    }
  }

  function updateHeaderCounts() {
    const cartCount = document.getElementById("cartCount");
    const wishlistCount = document.getElementById("wishlistCount");

    const cartTotal = getCart().reduce(
      (sum, item) => sum + Number(item.qty || 0), 0
    );

    if (cartCount) cartCount.textContent = cartTotal;
    if (wishlistCount) wishlistCount.textContent = getWishlist().length;
  }

  function productCard(product) {
    const saved = getWishlist().some(
      item => String(item.id) === String(product.id)
    );

    const discount = product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

    return `
      <article class="product-card">
        <div class="product-card-image">
          <img
            src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
            onerror="this.src='https://placehold.co/600x700?text=AUREX'"
          >
          ${discount ? `<span class="product-badge">${discount}% OFF</span>` : ""}
          <button class="wishlist-icon ${saved ? "saved" : ""}"
            data-wishlist="${escapeHTML(product.id)}"
            aria-label="Add to wishlist">${saved ? "♥" : "♡"}</button>
        </div>

        <div class="product-info">
          <small>${escapeHTML(product.category || "AUREX COLLECTION")}</small>
          <h3>${escapeHTML(product.name)}</h3>
          <div class="product-price">
            <strong>${money(product.price)}</strong>
            ${product.oldPrice ? `<del>${money(product.oldPrice)}</del>` : ""}
          </div>
          <div class="product-card-actions">
            <button class="primary-btn" data-product="${escapeHTML(product.id)}">
              VIEW PRODUCT
            </button>
            <button class="outline-btn" data-add-cart="${escapeHTML(product.id)}">
              ADD
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const container = document.getElementById("homeProducts");
    if (!container) return;

    const products = getProducts();
    container.innerHTML = products.length
      ? products.slice(0, 4).map(productCard).join("")
      : `<p>No products available.</p>`;
  }

  let activeCategory = "All";

  function renderShop() {
    const container = document.getElementById("shopProducts");
    if (!container) return;

    const search = (
      document.getElementById("productSearch")?.value || ""
    ).trim().toLowerCase();

    const sort = document.getElementById("productSort")?.value || "featured";
    const maxPrice = Number(
      document.getElementById("priceFilter")?.value || 10000
    );

    let products = getProducts().filter(product => {
      const categoryMatch =
        activeCategory === "All" ||
        String(product.category).toLowerCase() === activeCategory.toLowerCase();

      const searchMatch =
        `${product.name} ${product.category} ${product.description}`
          .toLowerCase().includes(search);

      return categoryMatch &&
        searchMatch &&
        Number(product.price) <= maxPrice;
    });

    if (sort === "low") products.sort((a, b) => a.price - b.price);
    if (sort === "high") products.sort((a, b) => b.price - a.price);
    if (sort === "new") {
      products.sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }

    container.innerHTML = products.map(productCard).join("");

    const empty = document.getElementById("shopEmpty");
    if (empty) empty.classList.toggle("hidden", products.length > 0);

    const count = document.getElementById("shopResultCount");
    if (count) count.textContent = `${products.length} Products`;

    const text = document.getElementById("shopResultText");
    if (text) text.textContent = "Explore the collection";
  }

  function setCategory(category) {
    activeCategory = category || "All";

    document.querySelectorAll(".filter-category").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === activeCategory
      );
    });

    renderShop();
    navigate("shop");
  }

  let selectedProduct = null;
  let selectedSize = "Standard";
  let selectedColor = "Black";

  function openProduct(id) {
    const product = getProducts().find(
      item => String(item.id) === String(id)
    );

    if (!product) {
      toast("Product not found.");
      return;
    }

    selectedProduct = product;
    selectedSize = (product.sizes || ["Standard"])[0];
    selectedColor = (product.colors || ["Black"])[0];

    const setText = (elementId, value) => {
      const element = document.getElementById(elementId);
      if (element) element.textContent = value;
    };

    const image = document.getElementById("detailProductImage");
    if (image) {
      image.src = product.image || "";
      image.alt = product.name;
    }

    setText("productBreadcrumb", product.name);
    setText("detailProductCategory", product.category || "COLLECTION");
    setText("detailProductName", product.name);
    setText("detailProductPrice", money(product.price));
    setText("detailProductDescription", product.description || "");

    const oldPrice = document.getElementById("detailProductOldPrice");
    if (oldPrice) {
      oldPrice.textContent = product.oldPrice
        ? money(product.oldPrice) : "";
    }

    const discount = document.getElementById("detailProductDiscount");
    if (discount) {
      discount.textContent = product.oldPrice > product.price
        ? Math.round((1 - product.price / product.oldPrice) * 100) + "% OFF"
        : "";
    }

    const sizes = product.sizes?.length ? product.sizes : ["Standard"];
    const colors = product.colors?.length ? product.colors : ["Black"];

    const sizeBox = document.getElementById("detailSizeOptions");
    if (sizeBox) {
      sizeBox.innerHTML = sizes.map((size, index) => `
        <button type="button"
          class="size-btn ${index === 0 ? "active" : ""}"
          data-size="${escapeHTML(size)}">${escapeHTML(size)}</button>
      `).join("");
    }

    const colorBox = document.getElementById("detailColorOptions");
    if (colorBox) {
      colorBox.innerHTML = colors.map((color, index) => `
        <button type="button"
          class="color-btn ${index === 0 ? "active" : ""}"
          data-color="${escapeHTML(color)}">${escapeHTML(color)}</button>
      `).join("");
    }

    const qty = document.getElementById("detailQty");
    if (qty) qty.value = 1;

    const thumbnails = document.getElementById("productThumbnails");
    if (thumbnails) {
      thumbnails.innerHTML = `
        <button class="thumbnail active" data-image="${escapeHTML(product.image)}">
          <img src="${escapeHTML(product.image)}" alt="">
        </button>
      `;
    }

    navigate("product");
  }

  function addToCart(id, quantity = 1) {
    const product = getProducts().find(
      item => String(item.id) === String(id)
    );

    if (!product) return toast("Product not found.");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const stock = Number(product.stock ?? 999999);

    const cart = getCart();
    const existing = cart.find(item =>
      String(item.id) === String(product.id) &&
      item.size === selectedSize &&
      item.color === selectedColor
    );

    const nextQty = (existing?.qty || 0) + qty;

    if (nextQty > stock) {
      return toast("Not enough stock available.");
    }

    if (existing) {
      existing.qty = nextQty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image,
        size: selectedSize,
        color: selectedColor,
        qty
      });
    }

    saveCart(cart);
    toast("Added to your cart.");
  }

  function toggleWishlist(id) {
    const product = getProducts().find(
      item => String(item.id) === String(id)
    );

    if (!product) return;

    let list = getWishlist();
    const exists = list.some(
      item => String(item.id) === String(id)
    );

    if (exists) {
      list = list.filter(item => String(item.id) !== String(id));
      toast("Removed from wishlist.");
    } else {
      list.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
      });
      toast("Saved to wishlist.");
    }

    saveWishlist(list);
    renderHome();
    renderShop();
    renderWishlist();
  }

  function renderWishlist() {
    const container = document.getElementById("wishlistProducts");
    const empty = document.getElementById("wishlistEmpty");
    if (!container) return;

    const list = getWishlist();
    container.innerHTML = list.map(item => {
      const product = getProducts().find(
        p => String(p.id) === String(item.id)
      ) || item;
      return productCard(product);
    }).join("");

    if (empty) empty.classList.toggle("hidden", list.length > 0);
  }

  function cartTotals() {
    const subtotal = getCart().reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty), 0
    );

    const delivery = subtotal > 0 ? 0 : 0;
    const discount = 0;

    return {
      subtotal,
      delivery,
      discount,
      total: subtotal + delivery - discount
    };
  }

  function renderCart() {
    const container = document.getElementById("cartItems");
    const empty = document.getElementById("cartEmpty");
    if (!container) return;

    const cart = getCart();

    if (empty) empty.classList.toggle("hidden", cart.length > 0);

    container.innerHTML = cart.map((item, index) => `
      <article class="cart-item">
        <img src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.name)}"
          onerror="this.src='https://placehold.co/200?text=AUREX'">

        <div class="cart-item-info">
          <h3>${escapeHTML(item.name)}</h3>
          <p>Size: ${escapeHTML(item.size || "Standard")}</p>
          <p>Color: ${escapeHTML(item.color || "Standard")}</p>
          <strong>${money(item.price)}</strong>
        </div>

        <div class="cart-item-actions">
          <div class="quantity-control">
            <button data-cart-qty="${index}" data-change="-1">−</button>
            <span>${Number(item.qty)}</span>
            <button data-cart-qty="${index}" data-change="1">+</button>
          </div>
          <button class="text-btn" data-remove-cart="${index}">REMOVE</button>
        </div>
      </article>
    `).join("");

    const totals = cartTotals();
    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = money(value);
    };

    set("cartSubtotal", totals.subtotal);
    set("cartDelivery", totals.delivery);
    set("cartDiscount", totals.discount);
    set("cartTotal", totals.total);
  }

  function updateCartQuantity(index, change) {
    const cart = getCart();
    if (!cart[index]) return;

    cart[index].qty += Number(change);

    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    } else {
      const product = getProducts().find(
        p => String(p.id) === String(cart[index].id)
      );
      if (product && cart[index].qty > Number(product.stock ?? 999999)) {
        cart[index].qty = Number(product.stock);
        toast("Stock limit reached.");
      }
    }

    saveCart(cart);
    renderCart();
  }

  function removeCartItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
    toast("Item removed.");
  }

  function renderCheckout() {
    const container = document.getElementById("checkoutItems");
    if (!container) return;

    const cart = getCart();
    const totals = cartTotals();

    container.innerHTML = cart.map(item => `
      <div class="checkout-item">
        <span>${escapeHTML(item.name)} × ${item.qty}</span>
        <strong>${money(item.price * item.qty)}</strong>
      </div>
    `).join("");

    const total = document.getElementById("checkoutTotal");
    if (total) total.textContent = money(totals.total);
  }

  function placeOrder(event) {
    event.preventDefault();

    const cart = getCart();
    if (!cart.length) {
      toast("Your cart is empty.");
      navigate("shop");
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const totals = cartTotals();

    const order = {
      id: "AUR-" + Date.now().toString().slice(-8),
      customer: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        pincode: data.pincode
      },
      items: cart.map(item => ({ ...item })),
      subtotal: totals.subtotal,
      delivery: totals.delivery,
      discount: totals.discount,
      total: totals.total,
      payment: data.payment || "COD",
      status: "Order Placed",
      createdAt: new Date().toISOString()
    };

    const orders = getOrders();
    orders.unshift(order);

    if (!write(KEYS.orders, orders)) return;

    let customers = read(KEYS.customers, []);
    if (!Array.isArray(customers)) customers = [];

    const existing = customers.find(
      c => c.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (existing) {
      existing.name = data.name;
      existing.phone = data.phone;
      existing.address = data.address;
      existing.city = data.city;
      existing.pincode = data.pincode;
    } else {
      customers.push({
        id: "CUS-" + Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
        createdAt: new Date().toISOString()
      });
    }

    write(KEYS.customers, customers);
    write(KEYS.profile, {
      name: data.name,
      email: data.email,
      phone: data.phone
    });

    saveCart([]);

    const success = document.getElementById("orderSuccess");
    const layout = document.querySelector(".checkout-layout");

    if (layout) layout.classList.add("hidden");
    if (success) success.classList.remove("hidden");

    const orderId = document.getElementById("successOrderId");
    if (orderId) orderId.textContent = order.id;

    updateHeaderCounts();
    toast("Demo order placed successfully.");
  }

  function renderOrders() {
    const container = document.getElementById("ordersContainer");
    const empty = document.getElementById("ordersEmpty");
    if (!container) return;

    const orders = getOrders();

    if (empty) empty.classList.toggle("hidden", orders.length > 0);

    container.innerHTML = orders.map(order => `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <small>ORDER ID</small>
            <strong>${escapeHTML(order.id)}</strong>
          </div>
          <span class="order-status">${escapeHTML(order.status)}</span>
        </div>

        <p>${new Date(order.createdAt).toLocaleString("en-IN")}</p>

        <div class="order-products">
          ${(order.items || []).map(item => `
            <div>
              <span>${escapeHTML(item.name)} × ${item.qty}</span>
              <strong>${money(item.price * item.qty)}</strong>
            </div>
          `).join("")}
        </div>

        <div class="order-card-footer">
          <span>${escapeHTML(order.payment || "COD")}</span>
          <strong>Total: ${money(order.total)}</strong>
        </div>
      </article>
    `).join("");
  }

  function renderProfile() {
    const profile = read(KEYS.profile, {});
    const name = profile.name || "";
    const email = profile.email || "";
    const phone = profile.phone || "";

    const fields = {
      profileName: name,
      profileEmail: email,
      profilePhone: phone
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    const displayName = document.getElementById("profileDisplayName");
    const displayEmail = document.getElementById("profileDisplayEmail");
    const avatar = document.getElementById("profileAvatar");

    if (displayName) displayName.textContent = name || "Welcome to AUREX";
    if (displayEmail) displayEmail.textContent = email || "Your shopping profile";
    if (avatar) avatar.textContent = name ? name.charAt(0).toUpperCase() : "A";
  }

  function saveProfile(event) {
    event.preventDefault();

    const profile = {
      name: document.getElementById("profileName")?.value.trim() || "",
      email: document.getElementById("profileEmail")?.value.trim() || "",
      phone: document.getElementById("profilePhone")?.value.trim() || ""
    };

    write(KEYS.profile, profile);
    renderProfile();
    toast("Profile updated.");
  }

  function updateMeasurements(event) {
    if (event) event.preventDefault();

    const height = Number(document.getElementById("bodyHeight")?.value);
    const weight = Number(document.getElementById("bodyWeight")?.value);
    const waist = Number(document.getElementById("bodyWaist")?.value);
    const chest = Number(document.getElementById("bodyChest")?.value);

    if (
      height < 120 || height > 220 ||
      weight < 30 || weight > 200 ||
      waist < 45 || waist > 160 ||
      chest < 55 || chest > 160
    ) {
      toast("Please enter valid measurements.");
      return;
    }

    let size = "M";
    if (chest < 86 || waist < 72) size = "S";
    else if (chest < 96 && waist < 84) size = "M";
    else if (chest < 106 && waist < 94) size = "L";
    else if (chest < 116 && waist < 104) size = "XL";
    else size = "XXL";

    const result = document.getElementById("recommendedSize");
    const explanation = document.getElementById("fitExplanation");

    if (result) result.textContent = size;
    if (explanation) {
      explanation.textContent =
        `Based on your entered measurements: ${height} cm, ${weight} kg, ` +
        `${waist} cm waist and ${chest} cm chest.`;
    }

    write("aurexMeasurements", { height, weight, waist, chest, size });
    toast("Measurements updated.");
  }

  function openSearch() {
    const overlay = document.getElementById("searchOverlay");
    if (overlay) {
      overlay.classList.add("open");
      setTimeout(() => document.getElementById("globalSearch")?.focus(), 100);
    }
  }

  function closeSearch() {
    document.getElementById("searchOverlay")?.classList.remove("open");
  }

  function performGlobalSearch() {
    const value = document.getElementById("globalSearch")?.value || "";
    const input = document.getElementById("productSearch");
    if (input) input.value = value;

    closeSearch();
    navigate("shop");
    renderShop();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const route = event.target.closest("[data-route]");
      if (route) {
        event.preventDefault();
        navigate(route.dataset.route);
        return;
      }

      const product = event.target.closest("[data-product]");
      if (product) {
        openProduct(product.dataset.product);
        return;
      }

      const add = event.target.closest("[data-add-cart]");
      if (add) {
        addToCart(add.dataset.addCart);
        return;
      }

      const wish = event.target.closest("[data-wishlist]");
      if (wish) {
        toggleWishlist(wish.dataset.wishlist);
        return;
      }

      const category = event.target.closest("[data-category]");
      if (category) {
        setCategory(category.dataset.category);
        return;
      }

      const size = event.target.closest("[data-size]");
      if (size) {
        selectedSize = size.dataset.size;
        document.querySelectorAll("[data-size]").forEach(button => {
          button.classList.toggle("active", button === size);
        });
        return;
      }

      const color = event.target.closest("[data-color]");
      if (color) {
        selectedColor = color.dataset.color;
        document.querySelectorAll("[data-color]").forEach(button => {
          button.classList.toggle("active", button === color);
        });
        return;
      }

      const qtyChange = event.target.closest("[data-cart-qty]");
      if (qtyChange) {
        updateCartQuantity(
          Number(qtyChange.dataset.cartQty),
          Number(qtyChange.dataset.change)
        );
        return;
      }

      const remove = event.target.closest("[data-remove-cart]");
      if (remove) {
        removeCartItem(Number(remove.dataset.removeCart));
        return;
      }

      const thumb = event.target.closest("[data-image]");
      if (thumb) {
        const image = document.getElementById("detailProductImage");
        if (image) image.src = thumb.dataset.image;
        return;
      }
    });

    document.getElementById("menuToggle")?.addEventListener("click", () => {
      document.getElementById("mobileMenu")?.classList.toggle("open");
    });

    document.getElementById("headerSearchBtn")?.addEventListener("click", openSearch);
    document.getElementById("closeSearch")?.addEventListener("click", closeSearch);
    document.getElementById("performSearch")?.addEventListener("click", performGlobalSearch);

    document.getElementById("globalSearch")?.addEventListener("keydown", event => {
      if (event.key === "Enter") performGlobalSearch();
    });

    document.getElementById("productSearch")?.addEventListener("input", renderShop);
    document.getElementById("productSort")?.addEventListener("change", renderShop);

    document.getElementById("priceFilter")?.addEventListener("input", event => {
      const label = document.getElementById("priceFilterValue");
      if (label) label.textContent = event.target.value;
      renderShop();
    });

    document.getElementById("clearFilters")?.addEventListener("click", () => {
      activeCategory = "All";
      const search = document.getElementById("productSearch");
      const sort = document.getElementById("productSort");
      const price = document.getElementById("priceFilter");
      const priceText = document.getElementById("priceFilterValue");

      if (search) search.value = "";
      if (sort) sort.value = "featured";
      if (price) price.value = price.max || 10000;
      if (priceText) priceText.textContent = price?.value || "10000";

      document.querySelectorAll(".filter-category").forEach(button => {
        button.classList.toggle("active", button.dataset.category === "All");
      });

      renderShop();
    });

    document.getElementById("detailQtyMinus")?.addEventListener("click", () => {
      const input = document.getElementById("detailQty");
      if (input) input.value = Math.max(1, Number(input.value) - 1);
    });

    document.getElementById("detailQtyPlus")?.addEventListener("click", () => {
      const input = document.getElementById("detailQty");
      if (input) input.value = Math.min(99, Number(input.value) + 1);
    });

    document.getElementById("addToCartBtn")?.addEventListener("click", () => {
      if (!selectedProduct) return;
      addToCart(
        selectedProduct.id,
        document.getElementById("detailQty")?.value || 1
      );
    });

    document.getElementById("addToWishlistBtn")?.addEventListener("click", () => {
      if (selectedProduct) toggleWishlist(selectedProduct.id);
    });

    document.getElementById("goCheckoutBtn")?.addEventListener("click", () => {
      if (!getCart().length) return toast("Your cart is empty.");
      navigate("checkout");
    });

    document.getElementById("checkoutForm")?.addEventListener("submit", placeOrder);
    document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
    document.getElementById("editProfileBtn")?.addEventListener("click", () => {
      document.getElementById("profileName")?.focus();
    });

    document.getElementById("measurementForm")?.addEventListener(
      "submit", updateMeasurements
    );

    document.getElementById("contactForm")?.addEventListener("submit", event => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      event.currentTarget.reset();
      toast("Demo message received. No email was sent.");
    });

    document.getElementById("closeModal")?.addEventListener("click", () => {
      document.getElementById("globalModal")?.classList.add("hidden");
    });

    document.getElementById("globalModal")?.addEventListener("click", event => {
      if (event.target.id === "globalModal") {
        event.currentTarget.classList.add("hidden");
      }
    });

    window.addEventListener("hashchange", () => {
      showPage(location.hash.replace("#", "") || "home");
    });
  }

  function init() {
    let products = read(KEYS.products, null);

    if (!Array.isArray(products) || products.length === 0) {
      products = DEFAULT_PRODUCTS;
      write(KEYS.products, products);
    }

    bindEvents();
    renderHome();
    renderShop();
    renderCart();
    renderWishlist();
    renderOrders();
    renderProfile();
    updateHeaderCounts();

    const initialPage = location.hash.replace("#", "") || "home";
    showPage(initialPage);

    const measurements = read("aurexMeasurements", null);
    if (measurements) {
      ["height", "weight", "waist", "chest"].forEach(key => {
        const field = document.getElementById(
          "body" + key.charAt(0).toUpperCase() + key.slice(1)
        );
        if (field) field.value = measurements[key];
      });
      updateMeasurements();
    }
  }

  window.AUREX = {
    KEYS,
    read,
    write,
    escapeHTML,
    money,
    toast,
    getProducts,
    saveProducts,
    getCart,
    saveCart,
    getWishlist,
    saveWishlist,
    getOrders,
    renderHome,
    renderShop,
    renderCart,
    renderWishlist,
    renderOrders,
    updateHeaderCounts,
    navigate
  };

  document.addEventListener("DOMContentLoaded", init);
})();