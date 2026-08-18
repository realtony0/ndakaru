/* mbedüm:ndakaru — front-end (vanilla, aucune dépendance) */

(function () {
  'use strict';

  var PRODUCTS = window.PRODUCTS || [];
  var STORE = window.STORE_CONFIG || {};
  var CART_KEY = 'mbedum_cart_v1';

  /* ---------------------------------------------------------------- utils */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function money(n) {
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* Images responsives : window.IMG (data/images.js) donne la largeur d'origine
     et les variantes générées, pour ne pas télécharger 720 px sur un écran de 180. */
  var IMG = window.IMG || {};

  function srcset(src) {
    var info = IMG[src];
    if (!info || !info.v || !info.v.length) return '';
    var base = src.replace(/\.jpg$/i, '');
    var parts = info.v.map(function (w) { return base + '-' + w + 'w.jpg ' + w + 'w'; });
    parts.push(src + ' ' + info.w + 'w');
    return ' srcset="' + parts.join(', ') + '"';
  }

  function imgAttrs(src, sizes) {
    var info = IMG[src];
    var dim = info ? ' width="' + info.w + '"' : '';
    return srcset(src) + (sizes ? ' sizes="' + sizes + '"' : '') + dim;
  }

  /* une carte occupe la moitié de l'écran au téléphone, un tiers puis un quart ensuite */
  var CARD_SIZES = '(min-width: 1000px) 25vw, (min-width: 720px) 33vw, 50vw';

  /* l'image de survol double le poids des grilles ; au tactile elle ne sert à rien */
  var HAS_HOVER = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function bySlug(slug) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].slug === slug) return PRODUCTS[i];
    return null;
  }

  /* ----------------------------------------------------------------- cart */

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderCart();
  }

  function cartCount() {
    return cart.reduce(function (n, l) { return n + l.qty; }, 0);
  }

  function cartTotal() {
    return cart.reduce(function (n, l) { return n + l.price * l.qty; }, 0);
  }

  function lineKey(slug, size, color) { return slug + '|' + size + '|' + color; }

  function addToCart(product, size, color, qty) {
    qty = qty || 1;
    var key = lineKey(product.slug, size, color);
    var found = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].key === key) found = cart[i];
    if (found) {
      found.qty += qty;
    } else {
      cart.push({
        key: key,
        slug: product.slug,
        title: product.title,
        image: (product.colorImages && product.colorImages[color]) || product.images[0],
        price: product.price,
        size: size,
        color: color,
        qty: qty
      });
    }
    saveCart();
    toast(product.title + ' ajouté au panier');
  }

  function setQty(key, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].key === key) {
        cart[i].qty += delta;
        if (cart[i].qty < 1) cart.splice(i, 1);
        break;
      }
    }
    saveCart();
  }

  function removeLine(key) {
    cart = cart.filter(function (l) { return l.key !== key; });
    saveCart();
  }

  function renderCart() {
    $$('[data-cart-count]').forEach(function (el) {
      var n = cartCount();
      el.textContent = n ? '(' + n + ')' : '';
    });

    var body = $('[data-cart-body]');
    if (!body) return;

    if (!cart.length) {
      body.innerHTML = '<p class="drawer__empty">Votre panier est vide</p>';
    } else {
      body.innerHTML = cart.map(function (l) {
        return '' +
          '<div class="line-item">' +
            '<a href="produit.html?p=' + encodeURIComponent(l.slug) + '"><img src="' + esc(l.image) + '"' + imgAttrs(l.image, '72px') + ' alt="' + esc(l.title) + '" loading="lazy" decoding="async"></a>' +
            '<div class="line-item__body">' +
              '<a class="line-item__name" href="produit.html?p=' + encodeURIComponent(l.slug) + '">' + esc(l.title) + '</a>' +
              '<div class="line-item__meta">' + esc(l.color) + ' · Taille ' + esc(l.size) + '</div>' +
              '<div class="line-item__meta">' + money(l.price) + '</div>' +
              '<div class="line-item__row">' +
                '<span class="qty">' +
                  '<button type="button" data-qty="-1" data-key="' + esc(l.key) + '" aria-label="retirer un article">−</button>' +
                  '<span>' + l.qty + '</span>' +
                  '<button type="button" data-qty="1" data-key="' + esc(l.key) + '" aria-label="ajouter un article">+</button>' +
                '</span>' +
                '<button type="button" class="line-item__remove" data-remove="' + esc(l.key) + '">Retirer</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }).join('');
    }

    var total = $('[data-cart-total]');
    if (total) total.textContent = money(cartTotal());
    var checkout = $('[data-checkout]');
    if (checkout) checkout.disabled = !cart.length;
  }

  function checkoutMessage() {
    var lines = cart.map(function (l) {
      return '• ' + l.title + ' — ' + l.color + ' / ' + l.size + ' × ' + l.qty + ' = ' + money(l.price * l.qty);
    });
    return 'Bonjour mbedüm ndakaru, je souhaite commander :\n\n' +
      lines.join('\n') +
      '\n\nTotal : ' + money(cartTotal()) +
      '\n\nNom :\nAdresse de livraison :';
  }

  /* ---------------------------------------------------------------- toast */

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-open'); }, 2600);
  }

  /* -------------------------------------------------------------- overlays */

  var openPanel = null;

  function closePanel() {
    if (!openPanel) return;
    openPanel.classList.remove('is-open');
    var scrim = $('[data-scrim]');
    if (scrim) scrim.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    openPanel = null;
  }

  function togglePanel(el) {
    if (!el) return;
    if (openPanel === el) return closePanel();
    showPanel(el);
  }

  function showPanel(el) {
    if (!el || openPanel === el) return;
    closePanel();
    el.classList.add('is-open');
    if (!el.classList.contains('search')) {
      var scrim = $('[data-scrim]');
      if (scrim) scrim.classList.add('is-open');
    }
    document.body.classList.add('is-locked');
    openPanel = el;
    var input = $('input', el);
    if (input && el.classList.contains('search')) setTimeout(function () { input.focus(); }, 60);
  }

  /* ---------------------------------------------------------------- cards */

  function cardHTML(p) {
    var url = 'produit.html?p=' + encodeURIComponent(p.slug);
    var alt = p.images[1] || p.images[0];
    var onSale = p.compareAt && p.compareAt > p.price;
    var price = onSale
      ? '<s>' + money(p.compareAt) + '</s><span class="now">' + money(p.price) + '</span>'
      : '<span>' + money(p.price) + '</span>';
    // le badge annonce l'économie réalisée plutôt qu'un simple « promo »
    var badge = onSale
      ? '<span class="card__badge">Économisez ' + money(p.compareAt - p.price) + '</span>'
      : (p.collection === 'gainde' || p.collection === 'nouveau')
        ? '<span class="card__badge card__badge--new">Nouveauté</span>'
        : '';

    return '' +
      '<article class="card">' +
        '<div class="card__frame">' +
          '<a class="card__media" href="' + url + '" aria-label="' + esc(p.title) + '">' +
            badge +
            '<img class="card__main" src="' + esc(p.images[0]) + '"' + imgAttrs(p.images[0], CARD_SIZES) + ' alt="' + esc(p.title) + '" loading="lazy" decoding="async">' +
            (HAS_HOVER && alt !== p.images[0]
              ? '<img class="card__alt" src="' + esc(alt) + '"' + imgAttrs(alt, CARD_SIZES) + ' alt="" aria-hidden="true" loading="lazy" decoding="async">'
              : '') +
          '</a>' +
          '<div class="card__quick"><a class="btn" href="' + url + '">Ajout rapide</a></div>' +
        '</div>' +
        '<a class="card__info" href="' + url + '">' +
          '<span class="card__name">' + esc(p.title) + '</span>' +
          '<span class="card__price">' + price + '</span>' +
        '</a>' +
      '</article>';
  }

  function renderGrids() {
    $$('[data-grid]').forEach(function (el) {
      var mode = el.getAttribute('data-grid');
      var limit = parseInt(el.getAttribute('data-limit'), 10) || 0;
      var list = PRODUCTS.slice();

      // « data-slugs="a,b,c" » impose une sélection et son ordre
      var picked = el.getAttribute('data-slugs');
      if (picked) {
        list = picked.split(',').map(function (s) { return bySlug(s.trim()); }).filter(Boolean);
      }
      else if (mode === 'promo') list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
      else if (mode === 'gainde') list = list.filter(function (p) { return p.collection === 'gainde'; });
      else if (mode === 'nouveau') list = list.filter(function (p) { return p.collection === 'nouveau'; });
      else if (mode === 'hoodies' || mode === 'tshirts') list = list.filter(function (p) { return p.category === mode; });

      var exclude = el.getAttribute('data-exclude');
      if (exclude) list = list.filter(function (p) { return p.slug !== exclude; });

      if (limit) list = list.slice(0, limit);
      var html = list.map(cardHTML).join('');

      // « data-collection-tile="url|libellé" » ajoute une tuile d'appel en fin de rangée
      var tile = el.getAttribute('data-collection-tile');
      if (tile) {
        var bits = tile.split('|');
        html += '<a class="card--collection" href="' + esc(bits[0]) + '">' + esc(bits[1] || 'Voir la collection') + ' ›</a>';
      }
      el.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------- carrousel */

  function initCarousels() {
    $$('[data-carousel]').forEach(function (root) {
      var track = $('[data-carousel-track]', root);
      if (!track) return;

      var mode = root.getAttribute('data-carousel');
      var list = PRODUCTS.slice();
      if (mode === 'gainde') list = list.filter(function (p) { return p.collection === 'gainde'; });
      else if (mode === 'promo') list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
      var max = parseInt(root.getAttribute('data-limit'), 10) || 8;
      if (!track.children.length) track.innerHTML = list.slice(0, max).map(cardHTML).join('');

      function step() {
        var first = track.firstElementChild;
        return first ? first.getBoundingClientRect().width + 10 : track.clientWidth * .8;
      }
      $$('[data-carousel-prev]', root).forEach(function (b) {
        b.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      });
      $$('[data-carousel-next]', root).forEach(function (b) {
        b.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      });
    });
  }

  /* -------------------------------------------------------------- boutique */

  function initShop() {
    var grid = $('[data-shop-grid]');
    if (!grid) return;

    var state = { cat: param('cat') || 'tout', sort: 'defaut' };

    function apply() {
      var list = PRODUCTS.slice();
      if (state.cat === 'tshirts' || state.cat === 'hoodies') {
        list = list.filter(function (p) { return p.category === state.cat; });
      } else if (state.cat === 'promo') {
        list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
      } else if (state.cat === 'gainde') {
        list = list.filter(function (p) { return p.collection === 'gainde'; });
      } else if (state.cat === 'nouveau') {
        list = list.filter(function (p) { return p.collection === 'nouveau'; });
      }
      if (state.sort === 'prix-asc') list.sort(function (a, b) { return a.price - b.price; });
      if (state.sort === 'prix-desc') list.sort(function (a, b) { return b.price - a.price; });
      if (state.sort === 'nom') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'fr'); });

      grid.innerHTML = list.map(cardHTML).join('');
      var c = $('[data-shop-count]');
      if (c) c.textContent = list.length + (list.length > 1 ? ' pièces' : ' pièce');

      var label = { tout: 'Toute la boutique', tshirts: 'T-shirts', hoodies: 'Hoodies', promo: 'Promotions', gainde: 'Gaïndé', nouveau: 'Nouveautés' }[state.cat] || state.cat;
      var t = $('[data-shop-title]');
      if (t) t.textContent = label;
      document.title = label + ' — Mbedüm Ndakaru';

      $$('[data-cat]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-cat') === state.cat);
      });
    }

    $$('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.cat = b.getAttribute('data-cat');
        history.replaceState(null, '', state.cat === 'tout' ? location.pathname : '?cat=' + state.cat);
        apply();
      });
    });

    var sortEl = $('[data-sort]');
    if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; apply(); });

    apply();
  }

  /* ------------------------------------------------------------------ pdp */

  function initPDP() {
    var root = $('[data-pdp]');
    if (!root) return;

    var p = bySlug(param('p') || '') || PRODUCTS[0];
    if (!p) return;

    document.title = p.title + ' — Mbedüm Ndakaru';

    var sel = { size: null, color: p.colors[0] };

    var gallery = $('[data-pdp-gallery]');
    gallery.className = 'pdp__gallery' + (p.images.length > 1 ? ' pdp__gallery--multi' : '');

    function drawGallery(color) {
      var imgs = p.images.slice();
      var lead = p.colorImages && p.colorImages[color];
      if (lead && imgs.indexOf(lead) > 0) {
        imgs.splice(imgs.indexOf(lead), 1);
        imgs.unshift(lead);
      }
      var gSizes = '(min-width: 1000px) 55vw, (min-width: 720px) 50vw, 100vw';
      gallery.innerHTML = imgs.map(function (src, i) {
        return '<img src="' + esc(src) + '"' + imgAttrs(src, gSizes) +
          ' alt="' + esc(p.title) + ' — vue ' + (i + 1) + '"' +
          (i ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"') + '>';
      }).join('');
    }
    drawGallery(sel.color);

    $('[data-pdp-title]').textContent = p.title;

    var onSale = p.compareAt && p.compareAt > p.price;
    $('[data-pdp-price]').innerHTML = onSale
      ? '<s>' + money(p.compareAt) + '</s><span class="now">' + money(p.price) + '</span>'
      : '<span>' + money(p.price) + '</span>';
    var saveEl = $('[data-pdp-save]');
    if (saveEl) saveEl.textContent = onSale ? 'Économisez ' + money(p.compareAt - p.price) : '';

    var descEl = $('[data-pdp-desc]');
    descEl.textContent = p.description || 'Pièce en coton, sérigraphie signée Mbedüm Ndakaru. Coupe unisexe, inspirée des rues de Dakar.';
    

    $('[data-pdp-cat]').textContent = p.category === 'hoodies' ? 'Hoodies' : 'T-shirts';
    $('[data-pdp-cat]').href = 'boutique.html?cat=' + p.category;

    function optsHTML(values, group) {
      return values.map(function (v) {
        var on = group === 'color' && v === sel.color;
        return '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-opt="' + group + '" data-val="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('');
    }

    $('[data-pdp-colors]').innerHTML = optsHTML(p.colors, 'color');
    $('[data-pdp-sizes]').innerHTML = optsHTML(p.sizes, 'size');

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-opt]');
      if (!b) return;
      var group = b.getAttribute('data-opt');
      sel[group] = b.getAttribute('data-val');
      $$('[data-opt="' + group + '"]', root).forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      $('[data-size-error]').textContent = '';
      if (group === 'color') drawGallery(sel.color);
    });

    function requireSize() {
      if (!sel.size) {
        $('[data-size-error]').textContent = 'Choisissez une taille';
        // au téléphone les tailles sont souvent masquées par la barre d'achat
        $('[data-pdp-sizes]').scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
      }
      return true;
    }

    $('[data-add]').addEventListener('click', function () {
      if (!requireSize()) return;
      addToCart(p, sel.size, sel.color, 1);
      showPanel($('[data-cart-drawer]'));
    });

    $('[data-buy]').addEventListener('click', function () {
      if (!requireSize()) return;
      addToCart(p, sel.size, sel.color, 1);
      goCheckout();
    });

    $$('[data-related]').forEach(function (el) { el.setAttribute('data-exclude', p.slug); });
  }

  /* ------------------------------------------------------------- checkout */

  function goCheckout() {
    if (!cart.length) return;
    var phone = (STORE.whatsapp || '').replace(/[^0-9]/g, '');
    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(checkoutMessage());
    window.open(url, '_blank', 'noopener');
  }

  /* --------------------------------------------------------------- search */

  function initSearch() {
    var overlay = $('[data-search]');
    if (!overlay) return;
    var input = $('input', overlay);
    var results = $('[data-search-results]', overlay);

    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        results.innerHTML = '<div class="grid">' + PRODUCTS.slice(0, 4).map(cardHTML).join('') + '</div>';
        return;
      }
      var list = PRODUCTS.filter(function (p) {
        return (p.title + ' ' + p.description + ' ' + p.category + ' ' + (p.collection || '')).toLowerCase().indexOf(q) > -1;
      });
      results.innerHTML = list.length
        ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>'
        : '<p class="search__empty">Aucun résultat pour « ' + esc(q) + ' »</p>';
    }

    input.addEventListener('input', run);
    run();
  }

  /* ---------------------------------------------------------------- forms */

  function initForms() {
    $$('[data-fake-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = $('[data-form-ok]', form);
        if (note) note.textContent = form.getAttribute('data-ok') || 'merci, message bien reçu.';
        form.reset();
      });
    });

    var contact = $('[data-contact-form]');
    if (contact) {
      contact.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(contact);
        var msg = 'Bonjour mbedüm ndakaru,\n\n' +
          'Nom : ' + (d.get('nom') || '') + '\n' +
          'Email : ' + (d.get('email') || '') + '\n\n' +
          (d.get('message') || '');
        var phone = (STORE.whatsapp || '').replace(/[^0-9]/g, '');
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      });
    }
  }

  /* ------------------------------------------------------- announcement bar */

  function initBar() {
    var bar = $('[data-bar]');
    if (!bar) return;

    if (sessionStorage.getItem('mbedum_bar_closed') === '1') {
      bar.classList.add('is-hidden');
    }

    var close = $('[data-bar-close]', bar);
    if (close) close.addEventListener('click', function () {
      bar.classList.add('is-hidden');
      try { sessionStorage.setItem('mbedum_bar_closed', '1'); } catch (e) {}
    });

    var msgEl = $('[data-bar-msg]', bar);
    var msgs = (STORE.announcements || []);
    if (!msgEl || msgs.length < 2) return;

    var i = 0;
    setInterval(function () {
      msgEl.classList.add('is-out');
      setTimeout(function () {
        i = (i + 1) % msgs.length;
        msgEl.firstChild.textContent = msgs[i];
        msgEl.classList.remove('is-out');
      }, 400);
    }, 4200);
  }

  /* --------------------------------------------------------------- header */

  function initHeader() {
    var header = $('[data-header]');
    if (!header || !header.classList.contains('header--over')) return;
    var hero = $('.hero');
    var threshold = function () { return (hero ? hero.offsetHeight : 400) - 90; };

    function onScroll() {
      var solid = window.scrollY > threshold();
      header.classList.toggle('header--solid', solid);
      header.classList.toggle('header--over', !solid);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------------------------------- boot */

  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-open]');
    if (open) {
      e.preventDefault();
      togglePanel($('[' + open.getAttribute('data-open') + ']'));
      return;
    }
    if (e.target.closest('[data-close]') || e.target.closest('[data-scrim]')) {
      closePanel();
      return;
    }
    var q = e.target.closest('[data-qty]');
    if (q) { setQty(q.getAttribute('data-key'), parseInt(q.getAttribute('data-qty'), 10)); return; }

    var r = e.target.closest('[data-remove]');
    if (r) { removeLine(r.getAttribute('data-remove')); return; }

    if (e.target.closest('[data-checkout]')) { goCheckout(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  document.addEventListener('click', function (e) {
    var acc = e.target.closest('.acc__btn');
    if (acc) acc.parentElement.classList.toggle('is-open');
  });

  function boot() {
    initBar();
    initHeader();
    renderGrids();
    initCarousels();
    initShop();
    initPDP();
    renderGrids(); // relance pour les grilles "produits liés" du PDP
    initSearch();
    initForms();
    initYear();
    renderCart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
