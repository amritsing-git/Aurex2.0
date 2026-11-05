/* =========================================
   AUREX — ADMIN DASHBOARD
   Frontend demo management
========================================= */

(() => {
  "use strict";

  let editingProductId = null;

  const getApp = () => window.AUREX;

  const escapeHTML = value => getApp().escapeHTML(value);
  const money = value => getApp().money(value);

  function getCustomers() {
    const customers = getApp().read("aurexCustomers", []);
    return Array.isArray(customers) ? customers : [];
  }

  function getOrders() {
    return getApp().getOrders();
  }

  function getProducts() {
    return getApp().getProducts();
  }

  function setActiveTab(tabName) {
    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.adminTab === tabName
      );
    });

    document.querySelectorAll(".admin-panel").forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.id === "admin-" + tabName
      );
    });

    render();
  }

  function renderOverview() {
    const products = getProducts();
    const orders = getOrders();
    const customers = getCustomers();

    const revenue = orders
      .filter(order => order.status !== "Cancelled")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    set("adminProductCount", products.length);
    set("adminOrderCount", orders.length);
    set("adminCustomerCount", customers.length);
    set("adminRevenue", money(revenue));

    const recent = document.getElementById("adminRecentOrders");
    if (!recent) return;

    if (!orders.length) {
      recent.innerHTML = `<p class="admin-empty">No orders received yet.</p>`;
      return;
    }

    recent.innerHTML = orders.slice(0, 5).map(order => `
      <div class="admin-list-row">
        <div>
          <strong>${escapeHTML(order.id)}</strong>
          <small>${escapeHTML(order.customer?.name || "Customer")}</small>
        </div>
        <div>
          <strong>${money(order.total)}</strong>
          <small>${escapeHTML(order.status)}</small>
        </div>
      </div>
    `).join("");
  }

  function renderProducts() {
    const container = document.getElementById("adminProductList");
    if (!container) return;

    const products = getProducts();

    if (!products.length) {
      container.innerHTML = `<p class="admin-empty">No products found.</p>`;
      return;
    }

    container.innerHTML = products.map(product => `
      <div class="admin-list-row admin-product-row">
        <div class="admin-product-info">
          <img
            src="${escapeHTML(product.image || "")}"
            alt="${escapeHTML(product.name)}"
            onerror="this.src='https://placehold.co/80?text=AUREX'"
          >
          <div>
            <strong>${escapeHTML(product.name)}</strong>
            <small>${escapeHTML(product.category || "Uncategorized")}</small>
            <small>${money(product.price)} · Stock: ${Number(product.stock || 0)}</small>
          </div>
        </div>

        <div class="admin-row-actions">
          <button class="outline-btn"
            type="button"
            data-edit-product="${escapeHTML(product.id)}">
            EDIT
          </button>

          <button class="outline-btn"
            type="button"
            data-delete-product="${escapeHTML(product.id)}">
            DELETE
          </button>
        </div>
      </div>
    `).join("");
  }

  function showProductForm(product = null) {
    const form = document.getElementById("adminProductForm");
    if (!form) return;

    editingProductId = product ? product.id : null;

    document.getElementById("adminProductFormTitle").textContent =
      product ? "Edit Product" : "Add Product";

    document.getElementById("adminEditProductId").value =
      product?.id || "";

    document.getElementById("adminProductName").value =
      product?.name || "";

    document.getElementById("adminProductCategory").value =
      product?.category || "Shoes";

    document.getElementById("adminProductPrice").value =
      product?.price ?? "";

    document.getElementById("adminProductOldPrice").value =
      product?.oldPrice ?? "";

    document.getElementById("adminProductStock").value =
      product?.stock ?? 10;

    document.getElementById("adminProductImage").value =
      product?.image || "";

    document.getElementById("adminProductDescription").value =
      product?.description || "";

    form.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideProductForm() {
    const form = document.getElementById("adminProductForm");
    if (!form) return;

    form.reset();
    form.classList.add("hidden");
    editingProductId = null;
  }

  function saveProduct(event) {
    event.preventDefault();

    const name = document.getElementById("adminProductName").value.trim();
    const category = document.getElementById("adminProductCategory").value;
    const price = Number(document.getElementById("adminProductPrice").value);
    const oldPrice = Number(document.getElementById("adminProductOldPrice").value || 0);
    const stock = Number(document.getElementById("adminProductStock").value);
    const image = document.getElementById("adminProductImage").value.trim();
    const description = document.getElementById("adminProductDescription").value.trim();

    if (!name || !Number.isFinite(price) || price < 0) {
      getApp().toast("Enter a valid product name and price.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      getApp().toast("Enter a valid stock quantity.");
      return;
    }

    const products = getProducts();

    if (editingProductId) {
      const index = products.findIndex(
        product => String(product.id) === String(editingProductId)
      );

      if (index === -1) {
        getApp().toast("Product could not be found.");
        return;
      }

      products[index] = {
        ...products[index],
        name,
        category,
        price,
        oldPrice,
        stock,
        image,
        description,
        updatedAt: new Date().toISOString()
      };

    } else {
      products.unshift({
        id: "AUR-" + Date.now(),
        name,
        category,
        price,
        oldPrice,
        stock,
        image,
        description,
        sizes: ["S", "M", "L", "XL"],
        colors: ["Black", "White"],
        createdAt: new Date().toISOString()
      });
    }

    if (!getApp().saveProducts(products)) return;

    hideProductForm();
    render();
    getApp().renderHome();
    getApp().renderShop();

    getApp().toast(editingProductId
      ? "Product updated."
      : "New product added."
    );
  }

  function deleteProduct(id) {
    const product = getProducts().find(
      item => String(item.id) === String(id)
    );

    if (!product) return;

    if (!confirm(`Delete "${product.name}" from the store?`)) return;

    const products = getProducts().filter(
      item => String(item.id) !== String(id)
    );

    getApp().saveProducts(products);

    // Remove this product from wishlist.
    const wishlist = getApp().getWishlist().filter(
      item => String(item.id) !== String(id)
    );
    getApp().saveWishlist(wishlist);

    // Remove this product from cart.
    const cart = getApp().getCart().filter(
      item => String(item.id) !== String(id)
    );
    getApp().saveCart(cart);

    render();
    getApp().renderHome();
    getApp().renderShop();
    getApp().renderWishlist();
    getApp().renderCart();

    getApp().toast("Product deleted.");
  }

  function renderOrders() {
    const container = document.getElementById("adminOrderList");
    if (!container) return;

    const orders = getOrders();

    if (!orders.length) {
      container.innerHTML = `<p class="admin-empty">No orders yet.</p>`;
      return;
    }

    const statuses = [
      "Order Placed",
      "Confirmed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ];

    container.innerHTML = orders.map((order, index) => `
      <div class="admin-content-card admin-order-card">
        <div class="admin-list-row">
          <div>
            <strong>${escapeHTML(order.id)}</strong>
            <small>${escapeHTML(order.customer?.name || "Customer")}</small>
            <small>${escapeHTML(order.customer?.phone || "")}</small>
          </div>

          <div>
            <strong>${money(order.total)}</strong>
            <small>${new Date(order.createdAt).toLocaleDateString("en-IN")}</small>
          </div>
        </div>

        <div class="admin-order-items">
          ${(order.items || []).map(item => `
            <p>${escapeHTML(item.name)} × ${Number(item.qty)}</p>
          `).join("")}
        </div>

        <label for="orderStatus-${index}">Order Status</label>
        <select id="orderStatus-${index}" data-order-status="${index}">
          ${statuses.map(status => `
            <option value="${status}"
              ${order.status === status ? "selected" : ""}>
              ${status}
            </option>
          `).join("")}
        </select>
      </div>
    `).join("");
  }

  function changeOrderStatus(index, status) {
    const orders = getOrders();
    if (!orders[index]) return;

    const allowed = [
      "Order Placed",
      "Confirmed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ];

    if (!allowed.includes(status)) return;

    orders[index].status = status;
    orders[index].updatedAt = new Date().toISOString();

    getApp().write("aurexOrders", orders);

    renderOverview();
    getApp().renderOrders();
    getApp().toast("Order status updated.");
  }

  function renderCustomers() {
    const container = document.getElementById("adminCustomerList");
    if (!container) return;

    const customers = getCustomers();

    if (!customers.length) {
      container.innerHTML = `<p class="admin-empty">No customers yet.</p>`;
      return;
    }

    container.innerHTML = customers.map(customer => `
      <div class="admin-list-row">
        <div>
          <strong>${escapeHTML(customer.name)}</strong>
          <small>${escapeHTML(customer.email)}</small>
          <small>${escapeHTML(customer.phone)}</small>
        </div>
        <div>
          <small>${escapeHTML(customer.city || "")}</small>
          <small>${escapeHTML(customer.pincode || "")}</small>
        </div>
      </div>
    `).join("");
  }

  function renderInventory() {
    const container = document.getElementById("adminInventoryList");
    if (!container) return;

    const products = getProducts();

    if (!products.length) {
      container.innerHTML = `<p class="admin-empty">No inventory found.</p>`;
      return;
    }

    container.innerHTML = products.map(product => `
      <div class="admin-list-row">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category)}</small>
        </div>

        <div class="inventory-edit">
          <label>Stock</label>
          <input
            type="number"
            min="0"
            value="${Number(product.stock || 0)}"
            data-stock-id="${escapeHTML(product.id)}"
          >
          <button class="outline-btn"
            type="button"
            data-save-stock="${escapeHTML(product.id)}">
            SAVE
          </button>
        </div>
      </div>
    `).join("");
  }

  function saveStock(id) {
    const input = document.querySelector(`[data-stock-id="${CSS.escape(id)}"]`);
    if (!input) return;

    const stock = Number(input.value);
    if (!Number.isInteger(stock) || stock < 0) {
      getApp().toast("Enter a valid stock number.");
      return;
    }

    const products = getProducts();
    const product = products.find(
      item => String(item.id) === String(id)
    );

    if (!product) return;

    product.stock = stock;

    getApp().saveProducts(products);
    renderInventory();
    renderProducts();
    getApp().toast("Inventory updated.");
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      products: getProducts(),
      orders: getOrders(),
      customers: getCustomers(),
      cart: getApp().getCart(),
      wishlist: getApp().getWishlist(),
      profile: getApp().read("aurexProfile", {})
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "aurex-demo-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    getApp().toast("Demo data export started.");
  }

  function resetData() {
    const confirmed = confirm(
      "This will delete all AUREX demo data from this browser. Continue?"
    );

    if (!confirmed) return;

    [
      "aurexProducts",
      "aurexCart",
      "aurexWishlist",
      "aurexOrders",
      "aurexCustomers",
      "aurexProfile",
      "aurexMeasurements"
    ].forEach(key => localStorage.removeItem(key));

    alert("Demo data has been reset. The store will reload.");
    location.reload();
  }

  function render() {
    renderOverview();
    renderProducts();
    renderOrders();
    renderCustomers();
    renderInventory();
  }

  function bindAdminEvents() {
    document.addEventListener("click", event => {
      const tab = event.target.closest("[data-admin-tab]");
      if (tab) {
        setActiveTab(tab.dataset.adminTab);
        return;
      }

      if (event.target.closest("#adminAddProduct")) {
        showProductForm();
        return;
      }

      if (event.target.closest("#adminCancelProduct")) {
        hideProductForm();
        return;
      }

      const edit = event.target.closest("[data-edit-product]");
      if (edit) {
        const product = getProducts().find(
          item => String(item.id) === String(edit.dataset.editProduct)
        );
        if (product) showProductForm(product);
        return;
      }

      const remove = event.target.closest("[data-delete-product]");
      if (remove) {
        deleteProduct(remove.dataset.deleteProduct);
        return;
      }

      const save = event.target.closest("[data-save-stock]");
      if (save) {
        saveStock(save.dataset.saveStock);
        return;
      }

      if (event.target.closest("#adminExportData")) {
        exportData();
        return;
      }

      if (event.target.closest("#adminResetData")) {
        resetData();
      }
    });

    document.addEventListener("change", event => {
      const status = event.target.closest("[data-order-status]");
      if (status) {
        changeOrderStatus(
          Number(status.dataset.orderStatus),
          status.value
        );
      }
    });

    document.getElementById("adminProductForm")?.addEventListener(
      "submit", saveProduct
    );
  }

  function init() {
    bindAdminEvents();
    render();
  }

  window.AUREX_ADMIN = {
    init,
    render,
    setActiveTab
  };

  document.addEventListener("DOMContentLoaded", init);
})();