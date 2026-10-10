/* mbedüm:ndakaru — administration (Supabase, sans build) */

(function () {
  'use strict';

  var CFG = window.NDK_SUPABASE || {};
  var IMG = window.IMG || {};

  /* ------------------------------------------------------------------ utils */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var NUM = new Intl.NumberFormat('fr-FR');
  function money(n) { return NUM.format(Math.round(n || 0)) + ' FCFA'; }
  function int(v) { var n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; }

  var DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  var DATETIME = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function fdate(d) { return d ? DATE.format(new Date(d)) : ''; }
  function fdatetime(d) { return d ? DATETIME.format(new Date(d)) : ''; }

  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  /* chemin du dépôt (assets/…) ou URL complète (photos téléversées) */
  function imgUrl(path) { return /^https?:/.test(path) ? path : '../' + path; }
  function thumbUrl(path) {
    var info = IMG[path];
    if (info && info.v && info.v.indexOf(400) > -1) return '../' + path.replace(/\.jpg$/i, '-400w.jpg');
    return imgUrl(path);
  }

  /* numéro sénégalais à 9 chiffres → format international pour wa.me */
  function waPhone(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.length === 9) d = '221' + d;
    return d;
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* CSV au format Excel français : séparateur « ; » et BOM pour les accents */
  function csv(name, head, rows) {
    function cell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var out = [head].concat(rows).map(function (r) { return r.map(cell).join(';'); }).join('\r\n');
    download(name, '﻿' + out, 'text/csv;charset=utf-8');
  }

  /* ------------------------------------------------------------ référentiels */

  var STATUSES = [
    { k: 'nouvelle', l: 'Nouvelle' },
    { k: 'confirmee', l: 'Confirmée' },
    { k: 'expediee', l: 'En livraison' },
    { k: 'livree', l: 'Livrée' },
    { k: 'annulee', l: 'Annulée' }
  ];
  function statusLabel(k) { for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].k === k) return STATUSES[i].l; return k; }
  function statusBadge(k) { return '<span class="badge badge--' + esc(k) + '">' + esc(statusLabel(k)) + '</span>'; }
  function paidBadge(o) {
    return o.paid ? '<span class="badge badge--paid">Payée</span>' : '<span class="badge badge--unpaid">Non payée</span>';
  }

  var PAY = { livraison: 'À la livraison', wave: 'Wave', orange_money: 'Orange Money', especes: 'Espèces', virement: 'Virement' };
  var CHANNELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', tiktok: 'TikTok', telephone: 'Téléphone', boutique: 'En personne', autre: 'Autre' };
  var CATS = { tshirts: 'T-shirts', hoodies: 'Hoodies' };
  var COLLS = { heritage: 'Héritage', nouveau: 'Nouveauté', gainde: 'Gaïndé' };
  var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  /* message WhatsApp proposé au client selon l'étape de la commande */
  function waTemplate(o) {
    var hi = 'Bonjour' + (o.customer_name ? ' ' + o.customer_name.split(' ')[0] : '') + ', ';
    var ref = o.ref ? ' ' + o.ref : '';
    return {
      nouvelle: hi + 'merci pour votre commande' + ref + ' chez mbedüm ndakaru ! Pouvez-vous nous confirmer votre adresse de livraison ?',
      confirmee: hi + 'votre commande' + ref + ' est confirmée (' + money(o.total) + '). Nous vous prévenons dès qu’elle part en livraison.',
      expediee: hi + 'votre commande' + ref + ' est en route ! Le livreur vous appellera. Montant à régler : ' + money(o.paid ? 0 : o.total) + '.',
      livree: hi + 'merci pour votre confiance ! Votre commande' + ref + ' a bien été livrée. À très vite chez mbedüm ndakaru.',
      annulee: hi + 'votre commande' + ref + ' a été annulée. N’hésitez pas à nous écrire pour toute question.'
    }[o.status] || hi;
  }

  /* ---------------------------------------------------------------- UI bits */

  var toastTimer;
  function toast(msg, isError) {
    var el = $('[data-toast]');
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-open'); }, isError ? 5000 : 2600);
  }

  function fail(err) {
    console.error(err);
    var m = (err && (err.message || err.error_description)) || String(err);
    if (/JWT|token/i.test(m)) m = 'Session expirée, reconnectez-vous.';
    else if (/Failed to fetch|NetworkError/i.test(m)) m = 'Connexion impossible. Vérifiez internet.';
    else if (/duplicate key.*products_pkey/i.test(m)) m = 'Un produit utilise déjà cet identifiant (slug).';
    else if (/row-level security/i.test(m)) m = 'Action refusée : ce compte n’est pas administrateur.';
    toast(m, true);
  }

  var modalResolve = null;
  function openModal(html, wide) {
    var m = $('[data-modal]'), box = $('[data-modal-box]');
    box.className = 'modal__box' + (wide ? ' modal__box--wide' : '');
    box.innerHTML = html;
    m.hidden = false;
    var f = box.querySelector('input, textarea, select');
    if (f) setTimeout(function () { f.focus(); }, 30);
    return box;
  }
  function closeModal(value) {
    $('[data-modal]').hidden = true;
    $('[data-modal-box]').innerHTML = '';
    if (modalResolve) { var r = modalResolve; modalResolve = null; r(value); }
  }
  $('[data-modal]').addEventListener('click', function (e) {
    if (e.target === this || e.target.closest('[data-modal-cancel]')) closeModal(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('[data-modal]').hidden) closeModal(false);
  });

  function confirmDialog(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      modalResolve = resolve;
      var box = openModal('<h2>' + esc(title) + '</h2>' + (text ? '<p>' + esc(text) + '</p>' : '') +
        '<div class="modal__actions"><button class="btn" type="button" data-modal-cancel>Annuler</button>' +
        '<button class="btn ' + (danger ? 'btn--danger' : 'btn--primary') + '" type="button" data-ok>' + esc(okLabel || 'Confirmer') + '</button></div>');
      $('[data-ok]', box).addEventListener('click', function () { closeModal(true); });
      $('[data-ok]', box).focus();
    });
  }

  function promptDialog(title, label, value) {
    return new Promise(function (resolve) {
      modalResolve = resolve;
      var box = openModal('<form><h2>' + esc(title) + '</h2><label class="field"><span>' + esc(label) + '</span>' +
        '<input class="input" name="v" value="' + esc(value || '') + '" required></label>' +
        '<div class="modal__actions"><button class="btn" type="button" data-modal-cancel>Annuler</button>' +
        '<button class="btn btn--primary" type="submit">Valider</button></div></form>');
      $('form', box).addEventListener('submit', function (e) {
        e.preventDefault();
        closeModal(this.v.value.trim() || false);
      });
    });
  }

  function emptyState(title, text, action) {
    return '<div class="empty"><strong>' + esc(title) + '</strong>' + esc(text || '') + (action || '') + '</div>';
  }

  function loading() { view().innerHTML = '<div class="empty">Chargement…</div>'; }
  function view() { return $('[data-view]'); }

  /* --------------------------------------------------------------- données */

  var sb = null;
  var me = null;
  var cache = { products: null };

  function q(promise) {
    return promise.then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }

  var api = {
    products: function () {
      return q(sb.from('products').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }))
        .then(function (d) { cache.products = d; return d; });
    },
    product: function (slug) { return q(sb.from('products').select('*').eq('slug', slug).maybeSingle()); },
    saveProduct: function (row, original) {
      row.updated_at = new Date().toISOString();
      var req = original ? sb.from('products').update(row).eq('slug', original) : sb.from('products').insert(row);
      return q(req.select().single());
    },
    deleteProduct: function (slug) { return q(sb.from('products').delete().eq('slug', slug)); },
    setPosition: function (slug, position) { return q(sb.from('products').update({ position: position }).eq('slug', slug)); },
    setPublished: function (slug, v) { return q(sb.from('products').update({ published: v }).eq('slug', slug)); },

    orders: function () { return q(sb.from('orders').select('*').order('created_at', { ascending: false }).limit(2000)); },
    order: function (id) { return q(sb.from('orders').select('*').eq('id', id).maybeSingle()); },
    saveOrder: function (row, id) {
      var req = id ? sb.from('orders').update(row).eq('id', id) : sb.from('orders').insert(row);
      return q(req.select().single());
    },
    deleteOrder: function (id) { return q(sb.from('orders').delete().eq('id', id)); },

    messages: function () { return q(sb.from('messages').select('*').order('created_at', { ascending: false }).limit(1000)); },
    setHandled: function (id, v) { return q(sb.from('messages').update({ handled: v }).eq('id', id)); },
    deleteMessage: function (id) { return q(sb.from('messages').delete().eq('id', id)); },

    subscribers: function () { return q(sb.from('subscribers').select('*').order('created_at', { ascending: false })); },
    deleteSubscriber: function (id) { return q(sb.from('subscribers').delete().eq('id', id)); },

    settings: function () {
      return q(sb.from('settings').select('data').eq('id', 1).maybeSingle()).then(function (r) {
        return (r && r.data) || JSON.parse(JSON.stringify(window.STORE_CONFIG || {}));
      });
    },
    saveSettings: function (data) {
      return q(sb.from('settings').upsert({ id: 1, data: data, updated_at: new Date().toISOString() }));
    },

    upload: function (slug, file) {
      return compress(file).then(function (blob) {
        var name = (slug || 'produit') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
        return q(sb.storage.from('produits').upload(name, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }))
          .then(function () { return sb.storage.from('produits').getPublicUrl(name).data.publicUrl; });
      });
    }
  };

  /* photos réduites à 1440 px avant envoi : le site reste léger au téléphone */
  function compress(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var max = 1440, w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Image illisible')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { reject(new Error('Format d’image non pris en charge')); };
      img.src = URL.createObjectURL(file);
    });
  }

  function refreshCounts(orders, messages) {
    if (orders) {
      var n = orders.filter(function (o) { return o.status === 'nouvelle'; }).length;
      $('[data-pending-count]').textContent = n || '';
    }
    if (messages) {
      var m = messages.filter(function (x) { return !x.handled; }).length;
      $('[data-unread-count]').textContent = m || '';
    }
  }

  /* ---------------------------------------------------------------- routeur */

  var dirty = false;
  var lastHash = '';

  var routes = {
    'tableau-de-bord': pageDashboard,
    'commandes': pageOrders,
    'produits': pageProducts,
    'clients': pageClients,
    'messages': pageMessages,
    'abonnes': pageSubscribers,
    'reglages': pageSettings
  };

  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    if (dirty && hash !== lastHash) {
      if (!window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) {
        history.replaceState(null, '', '#/' + lastHash);
        return;
      }
    }
    dirty = false;
    lastHash = hash;
    var parts = hash.split('/');
    var name = parts[0] || 'tableau-de-bord';
    if (!routes[name]) { name = 'tableau-de-bord'; parts = [name]; }
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === name); });
    $('[data-side]').classList.remove('is-open');
    window.scrollTo(0, 0);
    loading();
    Promise.resolve(routes[name](parts.slice(1).map(decodeURIComponent))).catch(function (e) {
      fail(e);
      view().innerHTML = emptyState('Impossible de charger cette page', ' Vérifiez la connexion puis réessayez.',
        '<br><button class="btn" type="button" onclick="location.reload()">Recharger</button>');
    });
  }

  function markDirty() { dirty = true; }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function go(hash) { dirty = false; location.hash = hash; }

  /* ------------------------------------------------------- tableau de bord */

  var period = 30;

  function pageDashboard() {
    return Promise.all([api.orders(), api.products(), api.messages()]).then(function (res) {
      var orders = res[0], products = res[1], messages = res[2];
      refreshCounts(orders, messages);
      drawDashboard(orders, products, messages);
    });
  }

  function drawDashboard(orders, products, messages) {
    var now = Date.now(), DAY = 864e5;
    var since = period ? now - period * DAY : 0;
    var inPeriod = orders.filter(function (o) { return new Date(o.created_at).getTime() >= since; });
    var valid = inPeriod.filter(function (o) { return o.status !== 'annulee'; });
    var revenue = valid.reduce(function (s, o) { return s + o.total; }, 0);
    var cashed = valid.filter(function (o) { return o.paid; }).reduce(function (s, o) { return s + o.total; }, 0);
    var todo = orders.filter(function (o) { return o.status === 'nouvelle' || o.status === 'confirmee'; });
    var shipping = orders.filter(function (o) { return o.status === 'expediee'; });

    /* barres : par jour sur la période, par mois sur « tout » */
    var buckets = [], i;
    if (period) {
      for (i = period - 1; i >= 0; i--) {
        var d = new Date(now - i * DAY); d.setHours(0, 0, 0, 0);
        buckets.push({ key: d.toDateString(), label: DATE.format(d), v: 0 });
      }
      valid.forEach(function (o) {
        var k = new Date(o.created_at).toDateString();
        for (var j = 0; j < buckets.length; j++) if (buckets[j].key === k) buckets[j].v += o.total;
      });
    } else {
      var MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });
      for (i = 11; i >= 0; i--) {
        var m = new Date(); m.setDate(1); m.setMonth(m.getMonth() - i);
        buckets.push({ key: m.getFullYear() + '-' + m.getMonth(), label: MONTH.format(m), v: 0 });
      }
      valid.forEach(function (o) {
        var dt = new Date(o.created_at), k = dt.getFullYear() + '-' + dt.getMonth();
        for (var j = 0; j < buckets.length; j++) if (buckets[j].key === k) buckets[j].v += o.total;
      });
    }
    var maxV = Math.max.apply(null, buckets.map(function (b) { return b.v; }).concat([1]));

    /* meilleures ventes */
    var bySlug = {};
    valid.forEach(function (o) {
      (o.lines || []).forEach(function (l) {
        var r = bySlug[l.slug] || (bySlug[l.slug] = { slug: l.slug, title: l.title, qty: 0, amount: 0 });
        r.qty += l.qty; r.amount += l.qty * l.price;
      });
    });
    var top = Object.keys(bySlug).map(function (k) { return bySlug[k]; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    var topMax = top.length ? top[0].qty : 1;
    function productImg(slug) {
      for (var j = 0; j < products.length; j++) if (products[j].slug === slug) return products[j].images[0];
      return '';
    }

    /* points d'attention */
    var alerts = [];
    var noImg = products.filter(function (p) { return !p.images || !p.images.length; });
    var hidden = products.filter(function (p) { return !p.published; });
    var promos = products.filter(function (p) { return p.published && p.compare_at && p.compare_at > p.price; });
    var unread = messages.filter(function (x) { return !x.handled; });
    var unpaidDelivered = orders.filter(function (o) { return o.status === 'livree' && !o.paid; });
    if (todo.length) alerts.push('<a href="#/commandes">' + todo.length + ' commande' + (todo.length > 1 ? 's' : '') + ' à traiter</a>');
    if (unpaidDelivered.length) alerts.push(unpaidDelivered.length + ' commande(s) livrée(s) pas encore marquée(s) payée(s)');
    if (unread.length) alerts.push('<a href="#/messages">' + unread.length + ' message' + (unread.length > 1 ? 's' : '') + ' non traité' + (unread.length > 1 ? 's' : '') + '</a>');
    if (noImg.length) alerts.push(noImg.length + ' produit(s) sans photo');
    if (hidden.length) alerts.push(hidden.length + ' produit(s) masqué(s) sur le site');

    var periods = [[7, '7 j'], [30, '30 j'], [90, '90 j'], [0, 'Tout']];

    view().innerHTML =
      '<div class="page-head"><div><h1>Tableau de bord</h1><p>' + esc(DATE.format(new Date())) + '</p></div>' +
        '<div class="seg" data-period>' + periods.map(function (p) {
          return '<button type="button" data-p="' + p[0] + '" class="' + (p[0] === period ? 'is-on' : '') + '">' + p[1] + '</button>';
        }).join('') + '</div></div>' +
      '<div class="kpis">' +
        kpi('Chiffre d’affaires', money(revenue), 'dont encaissé ' + money(cashed)) +
        kpi('Commandes', valid.length, (inPeriod.length - valid.length) + ' annulée(s)') +
        kpi('Panier moyen', money(valid.length ? revenue / valid.length : 0), valid.reduce(function (s, o) { return s + (o.lines || []).reduce(function (n, l) { return n + l.qty; }, 0); }, 0) + ' article(s) vendus') +
        kpi('À traiter', todo.length, shipping.length + ' en livraison') +
      '</div>' +
      '<div class="grid grid--main">' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Ventes</h2><span class="muted">' + (period ? 'par jour' : '12 derniers mois') + '</span></div><div class="card__body">' +
            '<div class="bars">' + buckets.map(function (b) {
              var h = Math.round(b.v / maxV * 100);
              return '<div class="bars__col"><span class="bars__tip">' + esc(b.label) + ' · ' + money(b.v) + '</span>' +
                '<div class="bars__bar' + (b.v ? '' : ' is-zero') + '" style="height:' + (b.v ? Math.max(h, 3) : 1) + '%"></div></div>';
            }).join('') + '</div>' +
            '<div class="bars__axis"><span>' + esc(buckets[0].label) + '</span><span>' + esc(buckets[buckets.length - 1].label) + '</span></div>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>Dernières commandes</h2><a href="#/commandes">Tout voir</a></div>' +
            (orders.length ? ordersTable(orders.slice(0, 6), true) : '<div class="card__body">' + emptyState('Aucune commande pour l’instant', ' Les commandes passées sur le site arrivent ici automatiquement.') + '</div>') +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Meilleures ventes</h2></div><div class="card__body">' +
            (top.length ? '<ol class="rank">' + top.map(function (t) {
              var src = productImg(t.slug);
              return '<li>' + (src ? '<img src="' + esc(thumbUrl(src)) + '" alt="">' : '<span></span>') +
                '<div><div class="rank__name">' + esc(t.title) + '</div><div class="rank__meter"><span style="width:' + Math.round(t.qty / topMax * 100) + '%"></span></div></div>' +
                '<div class="rank__val">' + t.qty + ' vendu' + (t.qty > 1 ? 's' : '') + '<br>' + money(t.amount) + '</div></li>';
            }).join('') + '</ol>' : '<p class="help">Pas encore de ventes sur la période.</p>') +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>À surveiller</h2></div><div class="card__body"><ul class="alerts">' +
            (alerts.length ? alerts.map(function (a) { return '<li>' + a + '</li>'; }).join('') : '<li class="is-ok">Tout est à jour.</li>') +
          '</ul></div></div>' +
          '<div class="card"><div class="card__head"><h2>Catalogue</h2><a href="#/produits">Gérer</a></div><div class="card__body"><dl class="dl">' +
            '<dt>Produits en ligne</dt><dd>' + (products.length - hidden.length) + '</dd>' +
            '<dt>En promotion</dt><dd>' + promos.length + '</dd>' +
            '<dt>Masqués</dt><dd>' + hidden.length + '</dd>' +
          '</dl></div></div>' +
        '</div>' +
      '</div>';

    $('[data-period]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]');
      if (!b) return;
      period = int(b.getAttribute('data-p'));
      drawDashboard(orders, products, messages);
    });
    bindOrderRows();
  }

  function kpi(label, value, sub) {
    return '<div class="card kpi"><div class="kpi__label">' + esc(label) + '</div><div class="kpi__value">' + esc(value) + '</div>' +
      (sub ? '<div class="kpi__sub">' + esc(sub) + '</div>' : '') + '</div>';
  }

  /* --------------------------------------------------------------- commandes */

  function ordersTable(list, compact) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Réf.</th><th class="hide-sm">Date</th><th>Client</th>' +
      (compact ? '' : '<th class="hide-sm">Articles</th>') + '<th class="num">Total</th>' +
      (compact ? '' : '<th class="hide-sm">Paiement</th>') + '<th>Statut</th></tr></thead><tbody>' +
      list.map(function (o) {
        var n = (o.lines || []).reduce(function (s, l) { return s + l.qty; }, 0);
        return '<tr class="is-link" data-order="' + o.id + '"><td><strong>' + esc(o.ref) + '</strong></td>' +
          '<td class="muted hide-sm">' + esc(fdatetime(o.created_at)) + '</td>' +
          '<td>' + (o.customer_name ? esc(o.customer_name) : '<span class="muted">À compléter</span>') +
            (o.customer_phone ? '<div class="muted">' + esc(o.customer_phone) + '</div>' : '') + '</td>' +
          (compact ? '' : '<td class="hide-sm">' + n + ' article' + (n > 1 ? 's' : '') + '</td>') +
          '<td class="num">' + money(o.total) + '</td>' +
          (compact ? '' : '<td class="hide-sm">' + paidBadge(o) + '</td>') +
          '<td>' + statusBadge(o.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bindOrderRows() {
    $$('[data-order]').forEach(function (tr) {
      tr.addEventListener('click', function () { go('#/commandes/' + tr.getAttribute('data-order')); });
    });
  }

  var orderFilter = { status: '', q: '' };

  function pageOrders(args) {
    if (args[0] === 'nouvelle') return Promise.all([api.products(), api.settings()]).then(function (r) { orderForm(null, r[0], r[1]); });
    if (args[0]) {
      return Promise.all([api.order(int(args[0])), api.products(), api.settings()]).then(function (r) {
        if (!r[0]) { view().innerHTML = emptyState('Commande introuvable', ' Elle a peut-être été supprimée.', '<br><a class="btn" href="#/commandes">Retour aux commandes</a>'); return; }
        orderForm(r[0], r[1], r[2]);
      });
    }
    return api.orders().then(function (orders) {
      refreshCounts(orders);
      view().innerHTML =
        '<div class="page-head"><div><h1>Commandes</h1><p>' + orders.length + ' commande' + (orders.length > 1 ? 's' : '') + ' au total</p></div>' +
        '<div class="page-head__actions"><button class="btn" type="button" data-export>Exporter (CSV)</button>' +
        '<a class="btn btn--primary" href="#/commandes/nouvelle">+ Nouvelle commande</a></div></div>' +
        '<div class="tabs" data-tabs>' + [{ k: '', l: 'Toutes' }].concat(STATUSES).map(function (s) {
          var n = s.k ? orders.filter(function (o) { return o.status === s.k; }).length : orders.length;
          return '<button type="button" data-s="' + s.k + '" class="' + (orderFilter.status === s.k ? 'is-on' : '') + '">' + esc(s.l) + '<span>' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="toolbar"><input class="input" type="search" placeholder="Rechercher : réf., client, téléphone, produit…" value="' + esc(orderFilter.q) + '" data-q></div>' +
        '<div class="card" data-list></div>';

      function filtered() {
        var qs = orderFilter.q.toLowerCase().trim();
        return orders.filter(function (o) {
          if (orderFilter.status && o.status !== orderFilter.status) return false;
          if (!qs) return true;
          var hay = [o.ref, o.customer_name, o.customer_phone, o.address].concat((o.lines || []).map(function (l) { return l.title; })).join(' ').toLowerCase();
          return hay.indexOf(qs) > -1;
        });
      }
      function draw() {
        var list = filtered();
        $('[data-list]').innerHTML = list.length ? ordersTable(list) :
          emptyState(orders.length ? 'Aucune commande ne correspond' : 'Aucune commande pour l’instant',
            orders.length ? ' Modifiez la recherche ou le filtre.' : ' Les commandes passées sur le site arrivent ici. Vous pouvez aussi en saisir une à la main.',
            orders.length ? '' : '<br><a class="btn btn--primary" href="#/commandes/nouvelle">+ Nouvelle commande</a>');
        bindOrderRows();
      }
      draw();
      $('[data-tabs]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-s]');
        if (!b) return;
        orderFilter.status = b.getAttribute('data-s');
        $$('[data-s]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        draw();
      });
      $('[data-q]').addEventListener('input', debounce(function () { orderFilter.q = this.value; draw(); }, 150));
      $('[data-export]').addEventListener('click', function () {
        csv('commandes-' + new Date().toISOString().slice(0, 10) + '.csv',
          ['Réf.', 'Date', 'Statut', 'Client', 'Téléphone', 'Adresse', 'Articles', 'Sous-total', 'Remise', 'Livraison', 'Total', 'Payée', 'Paiement', 'Canal', 'Notes'],
          filtered().map(function (o) {
            return [o.ref, new Date(o.created_at).toLocaleString('fr-FR'), statusLabel(o.status), o.customer_name, o.customer_phone, o.address,
              (o.lines || []).map(function (l) { return l.qty + ' × ' + l.title + ' (' + l.color + ' / ' + l.size + ')'; }).join(' | '),
              o.subtotal, o.discount, o.delivery_fee, o.total, o.paid ? 'oui' : 'non', PAY[o.pay_method] || o.pay_method, CHANNELS[o.channel] || o.channel, o.notes];
          }));
      });
    });
  }

  /* Lit le message envoyé par le bouton « commander » du site :
     « • Titre — Couleur / Taille × 2 = 24 000 FCFA » */
  function parseWhatsApp(text, products) {
    var out = { lines: [], ref: '', name: '', address: '' };
    var refM = text.match(/R[ée]f\.?\s*commande\s*:\s*([A-Z0-9]{6})/i);
    if (refM) out.ref = refM[1].toUpperCase();
    var nameM = text.match(/^\s*Nom\s*:\s*(.+)$/im);
    if (nameM) out.name = nameM[1].trim();
    var addrM = text.match(/^\s*Adresse(?: de livraison)?\s*:\s*(.+)$/im);
    if (addrM) out.address = addrM[1].trim();
    text.split(/\n/).forEach(function (row) {
      // titre gourmand : un nom peut lui-même contenir « — » (Ndaté Yalla Mbodj — Legacy)
      var m = row.match(/^\s*[•\-*]\s*(.+)\s+[—–]\s+([^\/—–]+?)\s*\/\s*(\S+)\s*[×x]\s*(\d+)(?:\s*=\s*([\d\s  .]+))?/);
      if (!m) return;
      var title = m[1].trim(), qty = int(m[4]) || 1;
      var p = null;
      for (var i = 0; i < products.length; i++) if (products[i].title.toLowerCase() === title.toLowerCase()) p = products[i];
      var lineTotal = m[5] ? int(m[5]) : 0;
      out.lines.push({
        slug: p ? p.slug : slugify(title), title: p ? p.title : title,
        color: m[2].trim(), size: m[3].trim(), qty: qty,
        price: p ? p.price : (lineTotal ? Math.round(lineTotal / qty) : 0)
      });
    });
    return out;
  }

  function orderForm(order, products, settings) {
    var isNew = !order;
    var o = order ? JSON.parse(JSON.stringify(order)) : {
      status: 'confirmee', channel: 'whatsapp', pay_method: 'livraison', paid: false,
      customer_name: '', customer_phone: '', address: '', notes: '',
      lines: [], discount: 0, delivery_fee: int(settings && settings.deliveryFee), history: []
    };
    var bySlug = {};
    products.forEach(function (p) { bySlug[p.slug] = p; });

    function lineHTML(l, i) {
      var p = bySlug[l.slug];
      var opts = products.map(function (x) {
        return '<option value="' + esc(x.slug) + '"' + (x.slug === l.slug ? ' selected' : '') + '>' + esc(x.title) + (x.published ? '' : ' (masqué)') + '</option>';
      }).join('');
      if (l.slug && !p) opts = '<option value="' + esc(l.slug) + '" selected>' + esc(l.title) + ' (retiré du catalogue)</option>' + opts;
      if (!l.slug) opts = '<option value="" selected disabled>Choisir un produit…</option>' + opts;
      var sizes = p ? p.sizes : [l.size];
      var colors = p ? p.colors : [l.color];
      if (l.size && sizes.indexOf(l.size) < 0) sizes = [l.size].concat(sizes);
      if (l.color && colors.indexOf(l.color) < 0) colors = [l.color].concat(colors);
      var img = p ? ((p.color_images && p.color_images[l.color]) || p.images[0]) : '';
      return '<div class="line" data-line="' + i + '">' +
        '<div class="line__top">' + (img ? '<img src="' + esc(thumbUrl(img)) + '" alt="">' : '') +
          '<select class="select" data-f="slug">' + opts + '</select>' +
          '<button class="btn btn--ghost btn--icon" type="button" data-remove-line aria-label="Retirer">✕</button></div>' +
        '<div class="line__opts">' +
          '<select class="select" data-f="size" aria-label="Taille">' + sizes.map(function (s) { return '<option' + (s === l.size ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
          '<select class="select" data-f="color" aria-label="Couleur">' + colors.map(function (c) { return '<option' + (c === l.color ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
          '<input class="input" type="number" min="1" max="99" value="' + l.qty + '" data-f="qty" aria-label="Quantité">' +
          '<div class="prefix"><input class="input" type="number" min="0" step="500" value="' + l.price + '" data-f="price" aria-label="Prix unitaire"><span>FCFA</span></div>' +
        '</div>' +
        '<div class="line__total">' + money(l.qty * l.price) + '</div>' +
      '</div>';
    }

    function totals() {
      var sub = o.lines.reduce(function (s, l) { return s + l.qty * l.price; }, 0);
      return { sub: sub, total: Math.max(sub - o.discount + o.delivery_fee, 0) };
    }

    var hist = (o.history || []).slice().reverse();

    view().innerHTML =
      '<a class="back" href="#/commandes">← Commandes</a>' +
      '<div class="page-head"><div><h1>' + (isNew ? 'Nouvelle commande' : 'Commande ' + esc(o.ref)) + '</h1>' +
        '<p>' + (isNew ? 'Saisie manuelle (WhatsApp, Instagram, en personne…)' : 'Reçue le ' + esc(fdatetime(o.created_at)) + (o.source === 'site' ? ' · depuis le site' : ' · saisie manuelle')) + '</p></div>' +
        '<div class="page-head__actions">' +
          (isNew ? '<button class="btn" type="button" data-paste>Coller un message WhatsApp</button>' : '') +
          '<button class="btn" type="button" data-wa' + (o.customer_phone ? '' : ' disabled title="Ajoutez le téléphone du client"') + '>Écrire au client</button>' +
        '</div></div>' +
      '<form class="form" data-form novalidate><div class="grid grid--main">' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Articles</h2></div><div class="card__body">' +
            '<div class="lines" data-lines></div>' +
            '<button class="btn btn--sm" type="button" data-add-line style="margin-top:10px">+ Ajouter un article</button>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>Client</h2></div><div class="card__body"><div class="fields fields--2">' +
            '<label class="field"><span>Nom</span><input class="input" name="customer_name" value="' + esc(o.customer_name) + '" maxlength="160"></label>' +
            '<label class="field"><span>Téléphone</span><input class="input" name="customer_phone" type="tel" value="' + esc(o.customer_phone) + '" placeholder="77 123 45 67" maxlength="40"></label>' +
          '</div><label class="field" style="margin-top:14px"><span>Adresse de livraison</span><textarea class="textarea" name="address" rows="2" style="min-height:64px" maxlength="400">' + esc(o.address) + '</textarea></label></div></div>' +
          '<div class="card"><div class="card__head"><h2>Notes internes</h2></div><div class="card__body">' +
            '<textarea class="textarea" name="notes" placeholder="Visibles seulement dans l’admin" maxlength="2000">' + esc(o.notes) + '</textarea></div></div>' +
        '</div>' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Statut</h2></div><div class="card__body" style="display:grid;gap:14px">' +
            '<div class="status-steps" data-status>' + STATUSES.map(function (s) {
              return '<button type="button" class="chip' + (s.k === o.status ? ' is-on' : '') + '" data-v="' + s.k + '">' + esc(s.l) + '</button>';
            }).join('') + '</div>' +
            '<label class="check"><input type="checkbox" name="paid"' + (o.paid ? ' checked' : '') + '> Paiement reçu</label>' +
            '<div class="fields fields--2">' +
              '<label class="field"><span>Moyen de paiement</span><select class="select" name="pay_method">' + Object.keys(PAY).map(function (k) { return '<option value="' + k + '"' + (k === o.pay_method ? ' selected' : '') + '>' + PAY[k] + '</option>'; }).join('') + '</select></label>' +
              '<label class="field"><span>Canal</span><select class="select" name="channel">' + Object.keys(CHANNELS).map(function (k) { return '<option value="' + k + '"' + (k === o.channel ? ' selected' : '') + '>' + CHANNELS[k] + '</option>'; }).join('') + '</select></label>' +
            '</div>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>Récapitulatif</h2></div><div class="card__body"><div class="summary">' +
            '<div class="summary__row"><span>Sous-total</span><span data-sub></span></div>' +
            '<div class="summary__row"><span>Remise</span><input class="input" type="number" min="0" step="500" name="discount" value="' + o.discount + '"></div>' +
            '<div class="summary__row"><span>Livraison</span><input class="input" type="number" min="0" step="500" name="delivery_fee" value="' + o.delivery_fee + '"></div>' +
            '<div class="summary__row summary__row--total"><span>Total</span><span data-total></span></div>' +
          '</div></div></div>' +
          (hist.length ? '<div class="card"><div class="card__head"><h2>Historique</h2></div><div class="card__body"><ul class="timeline">' +
            hist.map(function (h) { return '<li><div>' + esc(statusLabel(h.status)) + '<time>' + esc(fdatetime(h.at)) + '</time></div></li>'; }).join('') +
          '</ul></div></div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="form-actions">' +
        (isNew ? '' : '<button class="btn btn--danger spacer" type="button" data-delete>Supprimer</button>') +
        '<a class="btn" href="#/commandes">Annuler</a>' +
        '<button class="btn btn--primary" type="submit">' + (isNew ? 'Créer la commande' : 'Enregistrer') + '</button>' +
      '</div></form>';

    var form = $('[data-form]');

    function drawLines() {
      $('[data-lines]').innerHTML = o.lines.length ? o.lines.map(lineHTML).join('') : '<p class="help">Aucun article. Ajoutez-en au moins un.</p>';
      drawTotals();
    }
    function drawTotals() {
      var t = totals();
      $('[data-sub]').textContent = money(t.sub);
      $('[data-total]').textContent = money(t.total);
    }
    drawLines();

    $('[data-lines]').addEventListener('change', function (e) {
      var row = e.target.closest('[data-line]'), f = e.target.getAttribute('data-f');
      if (!row || !f) return;
      var l = o.lines[int(row.getAttribute('data-line'))];
      if (f === 'slug') {
        var p = bySlug[e.target.value];
        l.slug = p.slug; l.title = p.title; l.price = p.price;
        if (p.sizes.indexOf(l.size) < 0) l.size = p.sizes[0] || '';
        if (p.colors.indexOf(l.color) < 0) l.color = p.colors[0] || '';
        drawLines();
      } else if (f === 'qty') { l.qty = Math.min(Math.max(int(e.target.value), 1), 99); drawLines(); }
      else if (f === 'price') { l.price = Math.max(int(e.target.value), 0); drawLines(); }
      else { l[f] = e.target.value; drawLines(); }
      markDirty();
    });
    $('[data-lines]').addEventListener('click', function (e) {
      if (!e.target.closest('[data-remove-line]')) return;
      o.lines.splice(int(e.target.closest('[data-line]').getAttribute('data-line')), 1);
      drawLines(); markDirty();
    });
    $('[data-add-line]').addEventListener('click', function () {
      var p = products.filter(function (x) { return x.published; })[0] || products[0];
      if (!p) { toast('Ajoutez d’abord des produits au catalogue.', true); return; }
      o.lines.push({ slug: p.slug, title: p.title, size: p.sizes[0] || '', color: p.colors[0] || '', qty: 1, price: p.price });
      drawLines(); markDirty();
    });
    $('[data-status]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]');
      if (!b) return;
      o.status = b.getAttribute('data-v');
      $$('[data-v]', this).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      if (o.status === 'livree' && o.pay_method === 'livraison') form.paid.checked = true;
      markDirty();
    });
    form.addEventListener('input', function (e) {
      if (e.target.name === 'discount') o.discount = Math.max(int(e.target.value), 0);
      if (e.target.name === 'delivery_fee') o.delivery_fee = Math.max(int(e.target.value), 0);
      if (e.target.name === 'customer_phone') $('[data-wa]').disabled = !e.target.value.trim();
      drawTotals(); markDirty();
    });

    $('[data-wa]').addEventListener('click', function () {
      var data = collect();
      var t = totals();
      data.total = t.total;
      window.open('https://wa.me/' + waPhone(data.customer_phone) + '?text=' + encodeURIComponent(waTemplate(data)), '_blank', 'noopener');
    });

    if (isNew) {
      $('[data-paste]').addEventListener('click', function () {
        var box = openModal('<form><h2>Coller un message WhatsApp</h2><p>Collez le message reçu après « commander » sur le site : articles, tailles et couleurs sont repris automatiquement.</p>' +
          '<textarea class="textarea" name="t" rows="8" required placeholder="Bonjour mbedüm ndakaru, je souhaite commander :&#10;&#10;• Dakar With Pride — Noir / L × 1 = 12 000 FCFA"></textarea>' +
          '<div class="modal__actions"><button class="btn" type="button" data-modal-cancel>Annuler</button><button class="btn btn--primary" type="submit">Importer</button></div></form>', true);
        $('form', box).addEventListener('submit', function (e) {
          e.preventDefault();
          var r = parseWhatsApp(this.t.value, products);
          if (!r.lines.length) { toast('Aucun article reconnu dans ce message.', true); return; }
          /* une commande passée sur le site est déjà enregistrée sous sa référence */
          if (r.ref) {
            q(sb.from('orders').select('id').eq('ref', r.ref).maybeSingle()).then(function (found) {
              if (found) { closeModal(); toast('Commande ' + r.ref + ' déjà reçue depuis le site'); go('#/commandes/' + found.id); }
              else fill(r);
            }, fail);
          } else fill(r);
        });
        function fill(r) {
          o.lines = r.lines;
          if (r.ref) o.ref = r.ref;
          if (r.name) form.customer_name.value = r.name;
          if (r.address) form.address.value = r.address;
          closeModal();
          drawLines(); markDirty();
          toast(r.lines.length + ' article(s) importé(s)');
        }
      });
    } else {
      $('[data-delete]').addEventListener('click', function () {
        confirmDialog('Supprimer la commande ' + o.ref + ' ?', 'Elle disparaîtra des statistiques. Pour la garder dans l’historique, choisissez plutôt le statut « Annulée ».', 'Supprimer', true)
          .then(function (ok) {
            if (!ok) return;
            api.deleteOrder(o.id).then(function () { toast('Commande supprimée'); go('#/commandes'); }, fail);
          });
      });
    }

    function collect() {
      return {
        status: o.status,
        channel: form.channel.value,
        pay_method: form.pay_method.value,
        paid: form.paid.checked,
        customer_name: form.customer_name.value.trim(),
        customer_phone: form.customer_phone.value.trim(),
        address: form.address.value.trim(),
        notes: form.notes.value.trim(),
        lines: o.lines.map(function (l) { return { slug: l.slug, title: l.title, size: l.size, color: l.color, qty: l.qty, price: l.price }; }),
        discount: o.discount,
        delivery_fee: o.delivery_fee,
        ref: o.ref
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!o.lines.length) { toast('Ajoutez au moins un article.', true); return; }
      var data = collect();
      if (isNew) { data.source = 'admin'; if (!data.ref) delete data.ref; }
      else delete data.ref;
      var btn = $('[type=submit]', form);
      btn.disabled = true;
      api.saveOrder(data, isNew ? null : o.id).then(function (saved) {
        dirty = false;
        toast(isNew ? 'Commande ' + saved.ref + ' créée' : 'Commande enregistrée');
        if (isNew) go('#/commandes/' + saved.id); else route();
      }, function (err) { btn.disabled = false; fail(err); });
    });
  }

  /* ---------------------------------------------------------------- produits */

  var productFilter = { q: '', mode: '' };

  function pageProducts(args) {
    if (args[0] === 'nouveau') return api.products().then(function (all) { productForm(null, all); });
    if (args[0]) {
      return api.products().then(function (all) {
        var p = all.filter(function (x) { return x.slug === args[0]; })[0];
        if (!p) { view().innerHTML = emptyState('Produit introuvable', '', '<br><a class="btn" href="#/produits">Retour aux produits</a>'); return; }
        productForm(p, all);
      });
    }
    return api.products().then(drawProducts);
  }

  function priceHTML(p) {
    var sale = p.compare_at && p.compare_at > p.price;
    return (sale ? '<span class="strike">' + money(p.compare_at) + '</span>' : '') + money(p.price);
  }

  function drawProducts(all) {
    var modes = [['', 'Tous'], ['on', 'En ligne'], ['off', 'Masqués'], ['promo', 'En promo']];
    view().innerHTML =
      '<div class="page-head"><div><h1>Produits</h1><p>' + all.length + ' produit' + (all.length > 1 ? 's' : '') + ' · l’ordre ici est celui du site</p></div>' +
        '<div class="page-head__actions"><button class="btn" type="button" data-export>Exporter (CSV)</button><a class="btn btn--primary" href="#/produits/nouveau">+ Nouveau produit</a></div></div>' +
      '<div class="toolbar"><input class="input" type="search" placeholder="Rechercher un produit…" value="' + esc(productFilter.q) + '" data-q>' +
        '<div class="seg" data-mode>' + modes.map(function (m) { return '<button type="button" data-m="' + m[0] + '" class="' + (productFilter.mode === m[0] ? 'is-on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card" data-list></div>';

    function list() {
      var qs = productFilter.q.toLowerCase().trim();
      return all.filter(function (p) {
        if (productFilter.mode === 'on' && !p.published) return false;
        if (productFilter.mode === 'off' && p.published) return false;
        if (productFilter.mode === 'promo' && !(p.compare_at && p.compare_at > p.price)) return false;
        return !qs || (p.title + ' ' + p.slug + ' ' + p.description).toLowerCase().indexOf(qs) > -1;
      });
    }

    function draw() {
      var rows = list();
      var canMove = !productFilter.q && !productFilter.mode;
      $('[data-list]').innerHTML = rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Produit</th><th class="hide-sm">Catégorie</th><th class="hide-sm">Collection</th><th class="num">Prix</th><th>Sur le site</th><th class="actions"></th></tr></thead><tbody>' +
        rows.map(function (p) {
          var i = all.indexOf(p);
          return '<tr data-slug="' + esc(p.slug) + '">' +
            '<td><a class="prod-cell" href="#/produits/' + encodeURIComponent(p.slug) + '" style="text-decoration:none">' +
              (p.images[0] ? '<img class="thumb" src="' + esc(thumbUrl(p.images[0])) + '" alt="" loading="lazy">' : '<span class="thumb"></span>') +
              '<span><strong>' + esc(p.title) + '</strong><span class="muted">' + p.images.length + ' photo' + (p.images.length > 1 ? 's' : '') + ' · ' + p.colors.length + ' couleur' + (p.colors.length > 1 ? 's' : '') + '</span></span></a></td>' +
            '<td class="hide-sm">' + esc(CATS[p.category] || p.category) + '</td>' +
            '<td class="hide-sm">' + (p.collection === 'heritage' ? esc(COLLS[p.collection]) : '<span class="badge badge--accent badge--plain">' + esc(COLLS[p.collection] || p.collection) + '</span>') + '</td>' +
            '<td class="num">' + priceHTML(p) + '</td>' +
            '<td><label class="check"><input type="checkbox" data-pub' + (p.published ? ' checked' : '') + '> <span class="muted">' + (p.published ? 'En ligne' : 'Masqué') + '</span></label></td>' +
            '<td class="actions">' +
              (canMove ? '<button class="btn btn--ghost btn--icon" type="button" data-move="-1" title="Monter"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
                '<button class="btn btn--ghost btn--icon" type="button" data-move="1" title="Descendre"' + (i === all.length - 1 ? ' disabled' : '') + '>↓</button>' : '') +
              '<a class="btn btn--sm" href="#/produits/' + encodeURIComponent(p.slug) + '">Modifier</a></td></tr>';
        }).join('') + '</tbody></table></div>' :
        emptyState(all.length ? 'Aucun produit ne correspond' : 'Catalogue vide', all.length ? ' Modifiez la recherche ou le filtre.' : ' Ajoutez votre premier produit, ou chargez le catalogue de départ (supabase/seed.sql).',
          all.length ? '' : '<br><a class="btn btn--primary" href="#/produits/nouveau">+ Nouveau produit</a>');
    }
    draw();

    $('[data-q]').addEventListener('input', debounce(function () { productFilter.q = this.value; draw(); }, 150));
    $('[data-mode]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]');
      if (!b) return;
      productFilter.mode = b.getAttribute('data-m');
      $$('[data-m]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      draw();
    });
    $('[data-list]').addEventListener('change', function (e) {
      if (!e.target.matches('[data-pub]')) return;
      var slug = e.target.closest('[data-slug]').getAttribute('data-slug');
      var p = all.filter(function (x) { return x.slug === slug; })[0];
      var v = e.target.checked;
      api.setPublished(slug, v).then(function () {
        p.published = v;
        toast(p.title + (v ? ' est en ligne' : ' est masqué du site'));
        draw();
      }, function (err) { e.target.checked = !v; fail(err); });
    });
    $('[data-list]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-move]');
      if (!b) return;
      var slug = b.closest('[data-slug]').getAttribute('data-slug');
      var i = all.findIndex(function (x) { return x.slug === slug; });
      var j = i + int(b.getAttribute('data-move'));
      if (j < 0 || j >= all.length) return;
      var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
      draw();
      /* renumérote seulement les produits dont la place a changé */
      var jobs = [];
      all.forEach(function (p, k) { if (p.position !== k) { p.position = k; jobs.push(api.setPosition(p.slug, k)); } });
      Promise.all(jobs).catch(fail);
    });
    $('[data-export]').addEventListener('click', function () {
      csv('produits-' + new Date().toISOString().slice(0, 10) + '.csv',
        ['Slug', 'Titre', 'Catégorie', 'Collection', 'Prix', 'Prix barré', 'Tailles', 'Couleurs', 'En ligne'],
        all.map(function (p) { return [p.slug, p.title, CATS[p.category] || p.category, COLLS[p.collection] || p.collection, p.price, p.compare_at || '', p.sizes.join(' '), p.colors.join(' '), p.published ? 'oui' : 'non']; }));
    });
  }

  function productForm(product, all) {
    var isNew = !product;
    var p = product ? JSON.parse(JSON.stringify(product)) : {
      slug: '', title: '', category: 'tshirts', collection: 'nouveau', price: 0, compare_at: null, currency: 'FCFA',
      description: '', images: [], sizes: ['M', 'L', 'XL', '2XL', '3XL', '4XL'], colors: ['Noir'], color_images: {},
      source_slug: null, published: true, position: all.length
    };
    var slugTouched = !isNew;

    var knownColors = [];
    all.forEach(function (x) { x.colors.forEach(function (c) { if (knownColors.indexOf(c) < 0) knownColors.push(c); }); });
    p.colors.forEach(function (c) { if (knownColors.indexOf(c) < 0) knownColors.push(c); });
    var knownSizes = SIZES.slice();
    p.sizes.forEach(function (s) { if (knownSizes.indexOf(s) < 0) knownSizes.push(s); });

    function selectOpts(map, v) {
      var keys = Object.keys(map);
      if (v && keys.indexOf(v) < 0) keys.push(v);
      return keys.map(function (k) { return '<option value="' + esc(k) + '"' + (k === v ? ' selected' : '') + '>' + esc(map[k] || k) + '</option>'; }).join('');
    }

    view().innerHTML =
      '<a class="back" href="#/produits">← Produits</a>' +
      '<div class="page-head"><div><h1>' + (isNew ? 'Nouveau produit' : esc(p.title)) + '</h1>' +
        (isNew ? '' : '<p>Modifié le ' + esc(fdatetime(p.updated_at)) + '</p>') + '</div>' +
        (isNew ? '' : '<div class="page-head__actions"><a class="btn" href="../produit.html?p=' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener">Voir sur le site ↗</a><button class="btn" type="button" data-duplicate>Dupliquer</button></div>') +
      '</div>' +
      '<form class="form" data-form novalidate><div class="grid grid--main">' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Informations</h2></div><div class="card__body"><div class="fields">' +
            '<label class="field"><span>Nom du produit</span><input class="input" name="title" value="' + esc(p.title) + '" maxlength="160" required></label>' +
            '<label class="field"><span>Identifiant dans l’adresse (slug)</span><input class="input" name="slug" value="' + esc(p.slug) + '" maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" required>' +
              '<small>produit.html?p=<strong data-slug-preview>' + esc(p.slug || '…') + '</strong>' + (isNew ? '' : ' — le changer casse les liens déjà partagés') + '</small></label>' +
            '<label class="field"><span>Description</span><textarea class="textarea" name="description" rows="5">' + esc(p.description) + '</textarea></label>' +
          '</div></div></div>' +
          '<div class="card"><div class="card__head"><h2>Photos</h2><span class="muted">La première est la photo principale</span></div><div class="card__body">' +
            '<div class="imgs" data-imgs></div>' +
            '<input type="file" accept="image/*" multiple hidden data-file>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>Tailles et couleurs</h2></div><div class="card__body" style="display:grid;gap:16px">' +
            '<div class="field"><span class="label">Tailles disponibles</span><div class="chips" data-sizes></div></div>' +
            '<div class="field"><span class="label">Couleurs disponibles</span><div class="chips" data-colors></div></div>' +
            '<div class="field"><span class="label">Photo affichée pour chaque couleur</span><small>Choisie au panier et en tête de fiche quand le client sélectionne la couleur.</small><div class="color-map" data-color-map></div></div>' +
          '</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="card"><div class="card__head"><h2>Visibilité</h2></div><div class="card__body" style="display:grid;gap:14px">' +
            '<label class="check"><input type="checkbox" name="published"' + (p.published ? ' checked' : '') + '> En ligne sur le site</label>' +
            '<label class="field"><span>Catégorie</span><select class="select" name="category">' + selectOpts(CATS, p.category) + '</select></label>' +
            '<label class="field"><span>Collection</span><select class="select" name="collection">' + selectOpts(COLLS, p.collection) + '</select><small>« Nouveauté » et « Gaïndé » affichent un badge sur le site.</small></label>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><h2>Prix</h2></div><div class="card__body" style="display:grid;gap:14px">' +
            '<label class="field"><span>Prix de vente</span><div class="prefix"><input class="input" type="number" min="0" step="500" name="price" value="' + (p.price || '') + '" required><span>FCFA</span></div></label>' +
            '<label class="field"><span>Prix barré (promotion)</span><div class="prefix"><input class="input" type="number" min="0" step="500" name="compare_at" value="' + (p.compare_at || '') + '" placeholder="Aucun"><span>FCFA</span></div><small data-saving>Laisser vide s’il n’y a pas de promotion.</small></label>' +
          '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="form-actions">' +
        (isNew ? '' : '<button class="btn btn--danger spacer" type="button" data-delete>Supprimer</button>') +
        '<a class="btn" href="#/produits">Annuler</a>' +
        '<button class="btn btn--primary" type="submit">' + (isNew ? 'Créer le produit' : 'Enregistrer') + '</button>' +
      '</div></form>';

    var form = $('[data-form]');

    function drawImgs() {
      var arrow = function (d) { return '<svg viewBox="0 0 24 24"><path d="' + (d < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6') + '"/></svg>'; };
      $('[data-imgs]').innerHTML = p.images.map(function (src, i) {
        return '<div class="imgs__item" data-i="' + i + '"><img src="' + esc(thumbUrl(src)) + '" alt="" onerror="this.parentNode.classList.add(\'is-broken\')">' +
          (i === 0 ? '<span class="imgs__tag">Principale</span>' : '') +
          '<div class="imgs__bar"><button type="button" data-img="-1" title="Avancer"' + (i === 0 ? ' disabled' : '') + '>' + arrow(-1) + '</button>' +
          '<button type="button" data-img="x" title="Retirer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
          '<button type="button" data-img="1" title="Reculer"' + (i === p.images.length - 1 ? ' disabled' : '') + '>' + arrow(1) + '</button></div></div>';
      }).join('') +
        '<button class="imgs__add" type="button" data-upload><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>Téléverser<br>des photos</button>' +
        '<button class="imgs__add" type="button" data-library><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m4 16 5-5 5 5 2-2 4 4"/></svg>Choisir parmi<br>les photos du site</button>';
      drawColorMap();
    }

    function drawChips() {
      $('[data-sizes]').innerHTML = knownSizes.map(function (s) {
        return '<button type="button" class="chip' + (p.sizes.indexOf(s) > -1 ? ' is-on' : '') + '" data-size="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '<button type="button" class="chip chip--add" data-add-size>+ Autre</button>';
      $('[data-colors]').innerHTML = knownColors.map(function (c) {
        return '<button type="button" class="chip' + (p.colors.indexOf(c) > -1 ? ' is-on' : '') + '" data-color="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '<button type="button" class="chip chip--add" data-add-color>+ Couleur</button>';
      drawColorMap();
    }

    function drawColorMap() {
      var el = $('[data-color-map]');
      if (!p.colors.length) { el.innerHTML = '<small class="help">Sélectionnez au moins une couleur.</small>'; return; }
      el.innerHTML = p.colors.map(function (c) {
        var cur = p.color_images[c] || '';
        return '<div class="color-map__row"><span>' + esc(c) + '</span><select class="select" data-cmap="' + esc(c) + '">' +
          '<option value="">Photo principale</option>' +
          p.images.map(function (src, i) { return '<option value="' + esc(src) + '"' + (src === cur ? ' selected' : '') + '>Photo ' + (i + 1) + '</option>'; }).join('') +
          '</select>' + (cur || p.images[0] ? '<img src="' + esc(thumbUrl(cur || p.images[0])) + '" alt="">' : '<span></span>') + '</div>';
      }).join('');
    }

    function drawSaving() {
      var price = int(form.price.value), cmp = int(form.compare_at.value);
      $('[data-saving]').textContent = cmp && cmp > price ? 'Le site affichera « Économisez ' + money(cmp - price) + ' ».'
        : cmp ? 'Le prix barré doit être supérieur au prix de vente.' : 'Laisser vide s’il n’y a pas de promotion.';
    }

    drawImgs(); drawChips(); drawSaving();

    form.addEventListener('input', function (e) {
      markDirty();
      if (e.target.name === 'title' && !slugTouched) form.slug.value = slugify(e.target.value);
      if (e.target.name === 'slug') slugTouched = true;
      if (e.target.name === 'title' || e.target.name === 'slug') $('[data-slug-preview]').textContent = form.slug.value || '…';
      if (e.target.name === 'price' || e.target.name === 'compare_at') drawSaving();
    });

    $('[data-imgs]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-img]');
      if (b) {
        var i = int(b.closest('[data-i]').getAttribute('data-i')), a = b.getAttribute('data-img');
        if (a === 'x') {
          var gone = p.images.splice(i, 1)[0];
          Object.keys(p.color_images).forEach(function (c) { if (p.color_images[c] === gone) delete p.color_images[c]; });
        } else {
          var j = i + int(a), t = p.images[i]; p.images[i] = p.images[j]; p.images[j] = t;
        }
        drawImgs(); markDirty();
        return;
      }
      if (e.target.closest('[data-upload]')) {
        if (!form.slug.value) { toast('Donnez d’abord un nom au produit.', true); form.title.focus(); return; }
        $('[data-file]').click();
      }
      if (e.target.closest('[data-library]')) openLibrary();
    });

    $('[data-file]').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files);
      this.value = '';
      if (!files.length) return;
      var btn = $('[data-upload]');
      var done = 0;
      btn.disabled = true;
      btn.textContent = 'Envoi 0/' + files.length + '…';
      files.reduce(function (chain, f) {
        return chain.then(function () {
          return api.upload(form.slug.value, f).then(function (url) {
            p.images.push(url);
            done++;
            btn.textContent = 'Envoi ' + done + '/' + files.length + '…';
          });
        });
      }, Promise.resolve()).then(function () {
        toast(done + ' photo(s) ajoutée(s) — pensez à enregistrer');
      }, fail).then(function () { drawImgs(); markDirty(); });
    });

    function openLibrary() {
      var pool = Object.keys(IMG).filter(function (k) { return k.indexOf('assets/img/') === 0; });
      all.forEach(function (x) { x.images.forEach(function (s) { if (pool.indexOf(s) < 0) pool.push(s); }); });
      var picked = p.images.slice();
      var box = openModal('<h2>Photos du site</h2><p>Sélectionnez une ou plusieurs photos.</p><div class="lib" data-lib>' +
        pool.map(function (src) {
          return '<button type="button" data-src="' + esc(src) + '" class="' + (picked.indexOf(src) > -1 ? 'is-on' : '') + '"><img src="' + esc(thumbUrl(src)) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div><div class="modal__actions"><button class="btn" type="button" data-modal-cancel>Annuler</button><button class="btn btn--primary" type="button" data-ok>Valider</button></div>', true);
      $('[data-lib]', box).addEventListener('click', function (e) {
        var b = e.target.closest('[data-src]');
        if (!b) return;
        var src = b.getAttribute('data-src'), k = picked.indexOf(src);
        if (k > -1) picked.splice(k, 1); else picked.push(src);
        b.classList.toggle('is-on', k < 0);
      });
      $('[data-ok]', box).addEventListener('click', function () {
        p.images = picked;
        Object.keys(p.color_images).forEach(function (c) { if (picked.indexOf(p.color_images[c]) < 0) delete p.color_images[c]; });
        closeModal(); drawImgs(); markDirty();
      });
    }

    $('[data-sizes]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-size]');
      if (b) {
        var s = b.getAttribute('data-size'), k = p.sizes.indexOf(s);
        if (k > -1) p.sizes.splice(k, 1);
        else p.sizes = knownSizes.filter(function (x) { return x === s || p.sizes.indexOf(x) > -1; });
        drawChips(); markDirty();
      } else if (e.target.closest('[data-add-size]')) {
        promptDialog('Ajouter une taille', 'Taille (ex. 5XL, Unique)').then(function (v) {
          if (!v) return;
          if (knownSizes.indexOf(v) < 0) knownSizes.push(v);
          if (p.sizes.indexOf(v) < 0) p.sizes.push(v);
          drawChips(); markDirty();
        });
      }
    });
    $('[data-colors]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-color]');
      if (b) {
        var c = b.getAttribute('data-color'), k = p.colors.indexOf(c);
        if (k > -1) { p.colors.splice(k, 1); delete p.color_images[c]; } else p.colors.push(c);
        drawChips(); markDirty();
      } else if (e.target.closest('[data-add-color]')) {
        promptDialog('Ajouter une couleur', 'Nom de la couleur').then(function (v) {
          if (!v) return;
          v = v.charAt(0).toUpperCase() + v.slice(1);
          if (knownColors.indexOf(v) < 0) knownColors.push(v);
          if (p.colors.indexOf(v) < 0) p.colors.push(v);
          drawChips(); markDirty();
        });
      }
    });
    $('[data-color-map]').addEventListener('change', function (e) {
      var c = e.target.getAttribute('data-cmap');
      if (!c) return;
      if (e.target.value) p.color_images[c] = e.target.value; else delete p.color_images[c];
      drawColorMap(); markDirty();
    });

    if (!isNew) {
      $('[data-delete]').addEventListener('click', function () {
        confirmDialog('Supprimer « ' + p.title + ' » ?', 'Le produit disparaîtra du site. Les commandes passées le conservent. Pour le retirer temporairement, décochez plutôt « En ligne ».', 'Supprimer', true)
          .then(function (ok) {
            if (!ok) return;
            api.deleteProduct(product.slug).then(function () { toast('Produit supprimé'); go('#/produits'); }, fail);
          });
      });
      $('[data-duplicate]').addEventListener('click', function () {
        var copy = JSON.parse(JSON.stringify(product));
        var base = copy.slug + '-copie', s = base, n = 2;
        while (all.some(function (x) { return x.slug === s; })) s = base + '-' + n++;
        copy.slug = s;
        copy.title += ' (copie)';
        copy.published = false;
        copy.position = all.length;
        delete copy.created_at; delete copy.updated_at;
        api.saveProduct(copy, null).then(function () { toast('Copie créée (masquée)'); go('#/produits/' + encodeURIComponent(s)); }, fail);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.is-invalid', form).forEach(function (x) { x.classList.remove('is-invalid'); });
      var errors = [];
      var title = form.title.value.trim(), slug = form.slug.value.trim();
      var price = int(form.price.value), cmp = form.compare_at.value.trim() ? int(form.compare_at.value) : null;
      if (!title) { errors.push('Le nom est obligatoire.'); form.title.classList.add('is-invalid'); }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { errors.push('Slug invalide : minuscules, chiffres et tirets.'); form.slug.classList.add('is-invalid'); }
      else if (slug !== (product && product.slug) && all.some(function (x) { return x.slug === slug; })) { errors.push('Ce slug est déjà pris.'); form.slug.classList.add('is-invalid'); }
      if (!price) { errors.push('Indiquez un prix.'); form.price.classList.add('is-invalid'); }
      if (cmp !== null && cmp <= price) { errors.push('Le prix barré doit dépasser le prix de vente.'); form.compare_at.classList.add('is-invalid'); }
      if (!p.sizes.length) errors.push('Choisissez au moins une taille.');
      if (!p.colors.length) errors.push('Choisissez au moins une couleur.');
      if (form.published.checked && !p.images.length) errors.push('Ajoutez au moins une photo avant de mettre en ligne.');
      if (errors.length) { toast(errors[0], true); return; }

      var row = {
        slug: slug, title: title, description: form.description.value.trim(),
        category: form.category.value, collection: form.collection.value,
        price: price, compare_at: cmp, currency: 'FCFA',
        images: p.images, sizes: p.sizes, colors: p.colors, color_images: p.color_images,
        published: form.published.checked
      };
      if (isNew) row.position = all.length;
      var btn = $('[type=submit]', form);
      btn.disabled = true;
      api.saveProduct(row, isNew ? null : product.slug).then(function (saved) {
        dirty = false;
        toast(isNew ? 'Produit créé' : 'Produit enregistré — visible sur le site');
        if (isNew || saved.slug !== product.slug) go('#/produits/' + encodeURIComponent(saved.slug));
        else route();
      }, function (err) { btn.disabled = false; fail(err); });
    });
  }

  /* ----------------------------------------------------------------- clients */

  function pageClients() {
    return api.orders().then(function (orders) {
      var map = {};
      orders.forEach(function (o) {
        var key = waPhone(o.customer_phone) || (o.customer_name || '').toLowerCase().trim();
        if (!key) return;
        var c = map[key] || (map[key] = { name: '', phone: '', address: '', count: 0, spent: 0, last: null });
        if (!c.name && o.customer_name) c.name = o.customer_name;
        if (!c.phone && o.customer_phone) c.phone = o.customer_phone;
        if (!c.address && o.address) c.address = o.address;
        if (o.status !== 'annulee') { c.count++; c.spent += o.total; }
        if (!c.last || o.created_at > c.last) c.last = o.created_at;
      });
      var clients = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.spent - a.spent; });
      var qs = '';

      view().innerHTML =
        '<div class="page-head"><div><h1>Clients</h1><p>' + clients.length + ' client' + (clients.length > 1 ? 's' : '') + ', regroupés par téléphone à partir des commandes</p></div>' +
          '<div class="page-head__actions"><button class="btn" type="button" data-export>Exporter (CSV)</button></div></div>' +
        '<div class="toolbar"><input class="input" type="search" placeholder="Rechercher un client…" data-q></div>' +
        '<div class="card" data-list></div>';

      function draw() {
        var rows = clients.filter(function (c) { return !qs || (c.name + ' ' + c.phone + ' ' + c.address).toLowerCase().indexOf(qs) > -1; });
        $('[data-list]').innerHTML = rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Client</th><th class="hide-sm">Adresse</th><th class="num">Commandes</th><th class="num">Total dépensé</th><th class="hide-sm">Dernière</th><th class="actions"></th></tr></thead><tbody>' +
          rows.map(function (c) {
            return '<tr><td><strong>' + esc(c.name || 'Sans nom') + '</strong><div class="muted">' + esc(c.phone) + '</div></td>' +
              '<td class="hide-sm muted">' + esc(c.address) + '</td><td class="num">' + c.count + '</td><td class="num">' + money(c.spent) + '</td>' +
              '<td class="hide-sm muted">' + esc(fdate(c.last)) + '</td>' +
              '<td class="actions"><button class="btn btn--sm" type="button" data-see="' + esc(c.phone || c.name) + '">Commandes</button>' +
              (c.phone ? ' <a class="btn btn--sm" href="https://wa.me/' + waPhone(c.phone) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' :
          emptyState(clients.length ? 'Aucun client ne correspond' : 'Pas encore de clients', clients.length ? '' : ' Ils apparaissent dès qu’une commande a un nom ou un téléphone.');
      }
      draw();
      $('[data-q]').addEventListener('input', debounce(function () { qs = this.value.toLowerCase().trim(); draw(); }, 150));
      $('[data-list]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-see]');
        if (!b) return;
        orderFilter = { status: '', q: b.getAttribute('data-see') };
        go('#/commandes');
      });
      $('[data-export]').addEventListener('click', function () {
        csv('clients-' + new Date().toISOString().slice(0, 10) + '.csv', ['Nom', 'Téléphone', 'Adresse', 'Commandes', 'Total dépensé', 'Dernière commande'],
          clients.map(function (c) { return [c.name, c.phone, c.address, c.count, c.spent, fdate(c.last)]; }));
      });
    });
  }

  /* ---------------------------------------------------------------- messages */

  var messageTab = 'todo';

  function pageMessages() {
    return api.messages().then(function (all) {
      refreshCounts(null, all);
      var tabs = [['todo', 'À traiter'], ['done', 'Traités'], ['all', 'Tous']];
      view().innerHTML =
        '<div class="page-head"><div><h1>Messages</h1><p>Envoyés depuis le formulaire de contact du site</p></div></div>' +
        '<div class="tabs" data-tabs>' + tabs.map(function (t) {
          var n = all.filter(function (m) { return t[0] === 'all' || (t[0] === 'done') === m.handled; }).length;
          return '<button type="button" data-t="' + t[0] + '" class="' + (messageTab === t[0] ? 'is-on' : '') + '">' + t[1] + '<span>' + n + '</span></button>';
        }).join('') + '</div><div data-list></div>';

      function draw() {
        var rows = all.filter(function (m) { return messageTab === 'all' || (messageTab === 'done') === m.handled; });
        $('[data-list]').innerHTML = rows.length ? rows.map(function (m) {
          return '<div class="card" data-id="' + m.id + '"><div class="card__head"><h2>' + esc(m.name || 'Anonyme') + '</h2><span class="muted">' + esc(fdatetime(m.created_at)) + '</span></div>' +
            '<div class="card__body"><p style="margin:0 0 12px;white-space:pre-wrap">' + esc(m.message) + '</p>' +
            '<div class="toolbar" style="margin:0">' +
              (m.email ? '<a class="btn btn--sm" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re : votre message à mbedüm ndakaru') + '">Répondre à ' + esc(m.email) + '</a>' : '') +
              '<button class="btn btn--sm" type="button" data-handle>' + (m.handled ? 'Remettre à traiter' : 'Marquer comme traité') + '</button>' +
              '<button class="btn btn--sm btn--ghost" type="button" data-del style="margin-left:auto;color:var(--bad)">Supprimer</button>' +
            '</div></div></div>';
        }).join('') : '<div class="card">' + emptyState(messageTab === 'todo' ? 'Aucun message à traiter' : 'Aucun message', '') + '</div>';
      }
      draw();
      $('[data-tabs]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]');
        if (!b) return;
        messageTab = b.getAttribute('data-t');
        $$('[data-t]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        draw();
      });
      $('[data-list]').addEventListener('click', function (e) {
        var card = e.target.closest('[data-id]');
        if (!card) return;
        var id = int(card.getAttribute('data-id'));
        var m = all.filter(function (x) { return x.id === id; })[0];
        if (e.target.closest('[data-handle]')) {
          api.setHandled(id, !m.handled).then(function () { m.handled = !m.handled; refreshCounts(null, all); route(); }, fail);
        } else if (e.target.closest('[data-del]')) {
          confirmDialog('Supprimer ce message ?', '', 'Supprimer', true).then(function (ok) {
            if (ok) api.deleteMessage(id).then(function () { toast('Message supprimé'); route(); }, fail);
          });
        }
      });
    });
  }

  /* -------------------------------------------------------------- newsletter */

  function pageSubscribers() {
    return api.subscribers().then(function (all) {
      view().innerHTML =
        '<div class="page-head"><div><h1>Newsletter</h1><p>' + all.length + ' abonné' + (all.length > 1 ? 's' : '') + '</p></div>' +
          '<div class="page-head__actions"><button class="btn" type="button" data-copy' + (all.length ? '' : ' disabled') + '>Copier les emails</button>' +
          '<button class="btn" type="button" data-export' + (all.length ? '' : ' disabled') + '>Exporter (CSV)</button></div></div>' +
        '<div class="card">' + (all.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Email</th><th>Nom</th><th class="hide-sm">Téléphone</th><th class="hide-sm">Inscription</th><th class="actions"></th></tr></thead><tbody>' +
          all.map(function (s) {
            return '<tr data-id="' + s.id + '"><td>' + esc(s.email) + '</td><td>' + esc(s.name) + '</td><td class="hide-sm">' + esc(s.phone) + '</td>' +
              '<td class="hide-sm muted">' + esc(fdate(s.created_at)) + '</td><td class="actions"><button class="btn btn--sm btn--ghost" type="button" data-del style="color:var(--bad)">Retirer</button></td></tr>';
          }).join('') + '</tbody></table></div>' : emptyState('Aucun abonné pour l’instant', ' Les inscriptions du formulaire « Newsletter » du site arrivent ici.')) + '</div>';

      var copy = $('[data-copy]');
      copy.addEventListener('click', function () {
        var text = all.map(function (s) { return s.email; }).join(', ');
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
          toast(all.length + ' email(s) copié(s)');
        }, function () { promptDialog('Emails des abonnés', 'Copiez la liste', text); });
      });
      $('[data-export]').addEventListener('click', function () {
        csv('newsletter-' + new Date().toISOString().slice(0, 10) + '.csv', ['Email', 'Nom', 'Téléphone', 'Inscription'],
          all.map(function (s) { return [s.email, s.name, s.phone, fdate(s.created_at)]; }));
      });
      $('.card', view()).addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]');
        if (!b) return;
        var id = int(b.closest('[data-id]').getAttribute('data-id'));
        confirmDialog('Retirer cet abonné ?', '', 'Retirer', true).then(function (ok) {
          if (ok) api.deleteSubscriber(id).then(function () { toast('Abonné retiré'); route(); }, fail);
        });
      });
    });
  }

  /* ---------------------------------------------------------------- réglages */

  function pageSettings() {
    return api.settings().then(function (s) {
      function f(name, label, help, type) {
        return '<label class="field"><span>' + esc(label) + '</span><input class="input" name="' + name + '" type="' + (type || 'text') + '" value="' + esc(s[name] == null ? '' : s[name]) + '">' +
          (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
      }
      view().innerHTML =
        '<div class="page-head"><div><h1>Réglages</h1><p>Appliqués immédiatement au site</p></div></div>' +
        '<form class="form" data-form>' +
          '<div class="card"><div class="card__head"><h2>Boutique</h2></div><div class="card__body"><div class="fields fields--2">' +
            f('name', 'Nom de la marque') + f('tagline', 'Slogan') + f('city', 'Ville') + f('since', 'Depuis (année)') +
          '</div></div></div>' +
          '<div class="card"><div class="card__head"><h2>Contact et commandes</h2></div><div class="card__body"><div class="fields fields--2">' +
            f('whatsapp', 'Numéro WhatsApp des commandes', 'Format international sans + ni espaces, ex. 221789271531', 'tel') +
            f('phone', 'Téléphone affiché', 'ex. +221 78 927 15 31', 'tel') +
            f('email', 'Email de contact', '', 'email') +
            f('deliveryFee', 'Frais de livraison par défaut', 'Pré-rempli dans les commandes saisies à la main (FCFA)', 'number') +
          '</div></div></div>' +
          '<div class="card"><div class="card__head"><h2>Réseaux sociaux</h2></div><div class="card__body"><div class="fields fields--2">' +
            f('instagram', 'Instagram', '', 'url') + f('tiktok', 'TikTok', '', 'url') +
          '</div></div></div>' +
          '<div class="card"><div class="card__head"><h2>Barre d’annonce</h2></div><div class="card__body">' +
            '<label class="field"><span>Messages défilants</span><textarea class="textarea" name="announcements" rows="5">' + esc((s.announcements || []).join('\n')) + '</textarea><small>Un message par ligne.</small></label>' +
          '</div></div>' +
          '<div class="form-actions"><button class="btn btn--primary" type="submit">Enregistrer les réglages</button></div>' +
        '</form>' +
        '<div class="card"><div class="card__head"><h2>Mon compte</h2></div><div class="card__body">' +
          '<form class="fields fields--2" data-pw style="align-items:end"><label class="field"><span>Nouveau mot de passe</span><input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
          '<div><button class="btn" type="submit">Changer le mot de passe</button></div></form>' +
          '<p class="help" style="margin:12px 0 0">Connecté en tant que ' + esc(me && me.email) + '.</p>' +
        '</div></div>';

      var form = $('[data-form]');
      form.addEventListener('input', markDirty);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = JSON.parse(JSON.stringify(s));
        ['name', 'tagline', 'city', 'since', 'whatsapp', 'phone', 'email', 'instagram', 'tiktok'].forEach(function (k) { data[k] = form[k].value.trim(); });
        data.whatsapp = data.whatsapp.replace(/\D/g, '');
        data.deliveryFee = int(form.deliveryFee.value);
        data.announcements = form.announcements.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        if (data.whatsapp.length < 9) { toast('Numéro WhatsApp incomplet.', true); form.whatsapp.classList.add('is-invalid'); return; }
        api.saveSettings(data).then(function () { dirty = false; toast('Réglages enregistrés'); route(); }, fail);
      });
      $('[data-pw]').addEventListener('submit', function (e) {
        e.preventDefault();
        var f2 = this;
        q(sb.auth.updateUser({ password: f2.pw.value })).then(function () { f2.reset(); toast('Mot de passe modifié'); }, fail);
      });
    });
  }

  /* --------------------------------------------------------- authentification */

  function showLogin(message, isError) {
    $('[data-app]').hidden = true;
    $('[data-lock]').hidden = false;
    $('[data-login]').hidden = false;
    $('[data-setup]').hidden = true;
    var err = $('[data-login-error]');
    err.textContent = message || '';
    err.style.color = isError === false ? 'var(--ok)' : '';
  }

  function showApp(user) {
    me = user;
    $('[data-lock]').hidden = true;
    $('[data-app]').hidden = false;
    $('[data-user]').textContent = user.email;
    route();
    // pastilles du menu : commandes nouvelles et messages non traités
    Promise.all([api.orders(), api.messages()]).then(function (r) { refreshCounts(r[0], r[1]); }, function () {});
  }

  /* seule une adresse listée dans la table « admins » passe */
  function enter(session) {
    if (!session) { showLogin(); return; }
    q(sb.rpc('is_admin')).then(function (ok) {
      if (ok) showApp(session.user);
      else sb.auth.signOut().then(function () { showLogin('Ce compte n’a pas les droits administrateur.'); });
    }, function (err) {
      showLogin(/is_admin/.test(err.message || '') ? 'La base n’est pas encore installée (supabase/schema.sql).' : 'Connexion à la base impossible.');
    });
  }

  function init() {
    if (!CFG.url || !CFG.anonKey || !window.supabase) {
      $('[data-lock]').hidden = false;
      $('[data-login]').hidden = true;
      $('[data-setup]').hidden = false;
      return;
    }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, storageKey: 'ndk-admin-auth' } });

    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        $('[data-lock]').hidden = true;
        $('[data-app]').hidden = true;
        modalResolve = null;
        var box = openModal('<form><h2>Nouveau mot de passe</h2><p>Choisissez votre nouveau mot de passe (8 caractères minimum).</p>' +
          '<input class="input" type="password" name="pw" minlength="8" required autocomplete="new-password">' +
          '<div class="modal__actions"><button class="btn btn--primary" type="submit">Enregistrer</button></div></form>');
        $('form', box).addEventListener('submit', function (e) {
          e.preventDefault();
          q(sb.auth.updateUser({ password: this.pw.value })).then(function () {
            closeModal(); toast('Mot de passe enregistré'); enter(session);
          }, fail);
        });
      } else if (event === 'SIGNED_OUT') {
        showLogin();
      }
    });

    sb.auth.getSession().then(function (r) { enter(r.data && r.data.session); });

    $('[data-login]').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = this, btn = $('[type=submit]', f);
      btn.disabled = true;
      $('[data-login-error]').textContent = '';
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        btn.disabled = false;
        if (r.error) { showLogin(/invalid/i.test(r.error.message) ? 'Email ou mot de passe incorrect.' : r.error.message); return; }
        f.password.value = '';
        enter(r.data.session);
      });
    });

    $('[data-forgot]').addEventListener('click', function () {
      var email = $('[data-login]').email.value.trim();
      if (!email) { showLogin('Saisissez d’abord votre email.'); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] }).then(function (r) {
        showLogin(r.error ? r.error.message : 'Si ce compte existe, un lien de réinitialisation vient d’être envoyé.', r.error ? true : false);
      });
    });

    $('[data-logout]').addEventListener('click', function () {
      if (dirty && !window.confirm('Des modifications ne sont pas enregistrées. Se déconnecter quand même ?')) return;
      dirty = false;
      sb.auth.signOut();
    });
  }

  $('[data-menu]').addEventListener('click', function () { $('[data-side]').classList.toggle('is-open'); });
  document.addEventListener('click', function (e) {
    var side = $('[data-side]');
    if (side.classList.contains('is-open') && !e.target.closest('[data-side]') && !e.target.closest('[data-menu]')) side.classList.remove('is-open');
  });
  window.addEventListener('hashchange', function () { if (me) route(); });

  init();
})();
