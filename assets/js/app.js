/* mbedüm:ndakaru — front-end (vanilla, aucune dépendance) */

(function () {
  'use strict';

  var PRODUCTS = window.PRODUCTS || [];
  var STORE = window.STORE_CONFIG || {};
  var DB = window.NDK_DB || null;
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

  /* Catégories gérées dans l'admin (window.CATEGORIES, chargé par db.js).
     Sans base, un produit appartient à son type et à sa collection. */
  var CATS = null;

  function inCat(p, slug) {
    if (p.categories) return p.categories.indexOf(slug) > -1;
    return p.category === slug || p.collection === slug;
  }

  function catBySlug(slug) {
    if (!CATS) return null;
    for (var i = 0; i < CATS.length; i++) if (CATS[i].slug === slug) return CATS[i];
    return null;
  }

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
    var who = $('[data-who]');
    if (who) who.hidden = !cart.length;
  }

  function checkoutMessage(ref, who) {
    who = who || {};
    var lines = cart.map(function (l) {
      return '• ' + l.title + ' — ' + l.color + ' / ' + l.size + ' × ' + l.qty + ' = ' + money(l.price * l.qty);
    });
    return 'Bonjour mbedüm ndakaru, je souhaite commander :\n\n' +
      (ref ? 'Réf. commande : ' + ref + '\n\n' : '') +
      lines.join('\n') +
      '\n\nTotal : ' + money(cartTotal()) +
      '\n\nNom : ' + (who.name || '') + '\nTéléphone : ' + (who.phone || '') + '\nAdresse de livraison : ' + (who.address || '');
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

  // badge de la première catégorie du produit qui en a un (réglé dans l'admin)
  function badgeLabel(p) {
    if (!CATS) return (p.collection === 'gainde' || p.collection === 'nouveau') ? 'Nouveauté' : '';
    for (var i = 0; i < CATS.length; i++) if (CATS[i].badge && inCat(p, CATS[i].slug)) return CATS[i].badge;
    return '';
  }

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
      : badgeLabel(p) ? '<span class="card__badge card__badge--new">' + esc(badgeLabel(p)) + '</span>' : '';

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
      else if (mode && mode !== 'all') list = list.filter(function (p) { return inCat(p, mode); });

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
      if (mode === 'promo') list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
      else if (mode && mode !== 'all') list = list.filter(function (p) { return inCat(p, mode); });
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

    // filtres : « Tout », les catégories cochées « filtres » dans l'admin, puis « Promotions »
    var chips = $('.filters__chips');
    if (chips && CATS) {
      var shown = CATS.filter(function (c) { return c.in_filters; });
      chips.innerHTML = '<button class="chip" type="button" data-cat="tout">Tout</button>' +
        shown.map(function (c) { return '<button class="chip" type="button" data-cat="' + esc(c.slug) + '">' + esc(c.name) + '</button>'; }).join('') +
        '<button class="chip" type="button" data-cat="promo">Promotions</button>';
    }

    var state = { cat: param('cat') || 'tout', sort: 'defaut' };

    function apply() {
      var list = PRODUCTS.slice();
      if (state.cat === 'promo') {
        list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
      } else if (state.cat !== 'tout') {
        list = list.filter(function (p) { return inCat(p, state.cat); });
      }
      if (state.sort === 'prix-asc') list.sort(function (a, b) { return a.price - b.price; });
      if (state.sort === 'prix-desc') list.sort(function (a, b) { return b.price - a.price; });
      if (state.sort === 'nom') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'fr'); });

      grid.innerHTML = list.map(cardHTML).join('');
      var c = $('[data-shop-count]');
      if (c) c.textContent = list.length + (list.length > 1 ? ' pièces' : ' pièce');

      var cat = catBySlug(state.cat);
      var label = cat ? cat.name : { tout: 'Toute la boutique', tshirts: 'T-shirts', hoodies: 'Hoodies', promo: 'Promotions', gainde: 'Gaïndé', nouveau: 'Nouveautés' }[state.cat] || state.cat;
      var t = $('[data-shop-title]');
      if (t) t.textContent = label;
      var sub = $('.pagehead__sub');
      if (sub) {
        if (!sub.hasAttribute('data-default')) sub.setAttribute('data-default', sub.textContent);
        sub.textContent = (cat && cat.description) || sub.getAttribute('data-default');
      }
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
      showPanel($('[data-cart-drawer]'));
      focusCheckout();
    });

    $$('[data-related]').forEach(function (el) { el.setAttribute('data-exclude', p.slug); });
  }

  /* ------------------------------------------------------------- checkout */

  /* Coordonnées du client, demandées dans le panier : la commande arrive dans
     l'admin avec un numéro à rappeler, même si le message WhatsApp n'est
     jamais envoyé. Gardées dans le navigateur pour la commande suivante. */
  var WHO_KEY = 'mbedum_customer_v1';

  function initCheckout() {
    var foot = $('.drawer__foot');
    if (!foot || $('[data-who]', foot)) return;
    var who = {};
    try { who = JSON.parse(localStorage.getItem(WHO_KEY)) || {}; } catch (e) {}
    var box = document.createElement('div');
    box.className = 'checkout form--light';
    box.setAttribute('data-who', '');
    box.innerHTML =
      '<input class="field" name="name" autocomplete="name" placeholder="Nom et prénom" value="' + esc(who.name || '') + '">' +
      '<input class="field" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Téléphone (WhatsApp)" value="' + esc(who.phone || '') + '">' +
      '<input class="field" name="address" autocomplete="street-address" placeholder="Quartier / adresse de livraison" value="' + esc(who.address || '') + '">' +
      '<p class="checkout__error" data-who-error></p>';
    foot.insertBefore(box, $('[data-checkout]', foot));
  }

  function readWho() {
    var box = $('[data-who]');
    if (!box) return { ok: true };
    var who = {
      name: $('[name=name]', box).value.trim(),
      phone: $('[name=phone]', box).value.trim(),
      address: $('[name=address]', box).value.trim()
    };
    var err = !who.name ? ['name', 'Indiquez votre nom.']
      : who.phone.replace(/\D/g, '').length < 9 ? ['phone', 'Indiquez un numéro de téléphone valide.']
      : !who.address ? ['address', 'Indiquez votre quartier ou adresse de livraison.'] : null;
    $('[data-who-error]').textContent = err ? err[1] : '';
    if (err) { $('[name=' + err[0] + ']', box).focus(); return { ok: false }; }
    try { localStorage.setItem(WHO_KEY, JSON.stringify(who)); } catch (e) {}
    who.ok = true;
    return who;
  }

  function focusCheckout() {
    var box = $('[data-who]');
    if (!box) return;
    var empty = $$('input', box).filter(function (i) { return !i.value.trim(); })[0];
    if (empty) setTimeout(function () { empty.focus(); }, 300);
  }

  function goCheckout() {
    if (!cart.length) return;
    var who = readWho();
    if (!who.ok) { showPanel($('[data-cart-drawer]')); return; }
    // la référence relie le message WhatsApp à la commande enregistrée dans l'admin
    var ref = DB && DB.enabled ? DB.newRef() : '';
    if (ref) DB.saveOrder(ref, cart, who);
    var phone = (STORE.whatsapp || '').replace(/[^0-9]/g, '');
    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(checkoutMessage(ref, who));
    var total = money(cartTotal());
    window.open(url, '_blank', 'noopener');
    cart = [];
    saveCart();
    /* confirmation avec un vrai lien : si l'ouverture automatique a été bloquée
       (navigateur d'Instagram, de TikTok…), le client n'a qu'à toucher le bouton */
    var body = $('[data-cart-body]');
    if (body) body.innerHTML =
      '<div class="checkout-done">' +
        '<p class="checkout-done__title">Merci ' + esc(who.name.split(' ')[0]) + ' !</p>' +
        '<p>Votre commande' + (ref ? ' <strong>' + ref + '</strong>' : '') + ' de ' + total + ' est enregistrée.</p>' +
        '<p>Envoyez le récapitulatif sur WhatsApp pour la confirmer. Nous vous recontactons aussi au <span style="white-space:nowrap">' + esc(who.phone) + '</span>.</p>' +
        '<a class="btn btn--wide" href="' + esc(url) + '" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>' +
      '</div>';
    showPanel($('[data-cart-drawer]'));
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
        var names = (p.categories || []).map(function (c) { var k = catBySlug(c); return k ? k.name : c; }).join(' ');
        return (p.title + ' ' + p.description + ' ' + p.category + ' ' + (p.collection || '') + ' ' + names).toLowerCase().indexOf(q) > -1;
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
        var d = new FormData(form);
        if (DB && d.get('email')) DB.subscribe(String(d.get('email')).trim(), d.get('nom'), d.get('tel'));
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
        if (DB) DB.sendMessage(d.get('nom'), d.get('email'), d.get('message'));
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

    // messages modifiables dans l'admin : la base remplace le texte écrit dans la page
    var marquee = $('.bar__marquee', bar);
    if (marquee && STORE.fromDb && STORE.announcements && STORE.announcements.length) {
      var spans = STORE.announcements.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
      marquee.innerHTML = spans + spans; // deux fois, pour un défilement sans couture
    }

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

  /* Menus (en-tête, menu mobile, pied de page) : les liens « boutique.html?cat=… »
     sont remplacés par les catégories cochées « menu » dans l'admin, dans leur ordre.
     Les boutons de contenu (.btn, .tile) et « Promotions » ne bougent pas. */
  function renderCategoryLinks() {
    if (!CATS) return;
    var menu = CATS.filter(function (c) { return c.in_menu; });
    var groups = [];
    $$('a[href^="boutique.html?cat="]').forEach(function (a) {
      if (a.closest('.btn, .tile') || a.classList.contains('btn') || a.classList.contains('tile')) return;
      if (a.getAttribute('href') === 'boutique.html?cat=promo') return;
      var item = a.parentElement.tagName === 'LI' ? a.parentElement : a;
      var g = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].parent === item.parentElement) g = groups[i];
      if (!g) groups.push(g = { parent: item.parentElement, items: [] });
      g.items.push(item);
    });
    groups.forEach(function (g) {
      var model = g.items[0];
      menu.forEach(function (c) {
        var item = model.cloneNode(true);
        var a = item.tagName === 'A' ? item : $('a', item);
        a.setAttribute('href', 'boutique.html?cat=' + encodeURIComponent(c.slug));
        a.textContent = c.name;
        a.classList.remove('is-active');
        g.parent.insertBefore(item, model);
      });
      g.items.forEach(function (it) { it.remove(); });
    });
  }

  function boot() {
    if (DB && window.CONTENT) DB.applyContent(window.CONTENT);
    initCheckout();
    renderCategoryLinks();
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

  // catalogue et réglages viennent de la base quand elle est branchée (db.js)
  function start() {
    var ready = DB ? DB.load(3000) : Promise.resolve(false);
    ready.then(function () {
      PRODUCTS = window.PRODUCTS || PRODUCTS;
      STORE = window.STORE_CONFIG || STORE;
      CATS = window.CATEGORIES || null;
      boot();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
