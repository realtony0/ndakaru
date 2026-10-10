/* mbedüm:ndakaru — liaison avec la base Supabase (site et admin).

   Renseigner l'URL du projet et la clé « anon public » (Supabase → Project
   Settings → API). Cette clé est faite pour être publique : la sécurité repose
   sur les règles de supabase/schema.sql. Ne JAMAIS mettre ici la clé
   « service_role ».

   Clé vide → le site fonctionne comme avant, sur data/products.js, et
   commandes, messages et inscriptions ne sont simplement pas enregistrés. */
window.NDK_SUPABASE = {
  url: 'https://lqrljynvoumnolaxzgdr.supabase.co',
  // compte unique de l'admin : on ne saisit que le mot de passe
  adminEmail: 'admin@mbedumndakaru.com',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcmxqeW52b3Vtbm9sYXh6Z2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTY0ODAsImV4cCI6MjEwNzIzMjQ4MH0.M63xBF1TLYr9QJQqfF400eohaFv9MzHL6MMu4YccWMU'
};

(function () {
  'use strict';

  var CFG = window.NDK_SUPABASE || {};
  var on = !!(CFG.url && CFG.anonKey);

  function headers(extra) {
    var h = { apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey, 'Content-Type': 'application/json' };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function get(path) {
    return fetch(CFG.url + '/rest/v1/' + path, { headers: headers({}) }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* insertion sans relecture : un visiteur peut écrire mais pas lire ces tables.
     keepalive laisse partir la requête même si la page s'ouvre sur WhatsApp. */
  function insert(table, row) {
    if (!on) return Promise.resolve(false);
    return fetch(CFG.url + '/rest/v1/' + table, {
      method: 'POST',
      keepalive: true,
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(row)
    }).then(function (r) { return r.ok || r.status === 409; }, function () { return false; });
  }

  function toProduct(r) {
    return {
      slug: r.slug,
      title: r.title,
      category: r.category,
      collection: r.collection,
      price: r.price,
      compareAt: r.compare_at,
      currency: r.currency,
      description: r.description,
      images: r.images || [],
      sizes: r.sizes || [],
      colors: r.colors || [],
      colorImages: r.color_images || {},
      categories: r.categories || [],
      sourceSlug: r.source_slug
    };
  }

  /* Charge catalogue et réglages depuis la base. Si la base ne répond pas à
     temps, on garde les fichiers statiques : le site ne reste jamais vide. */
  function load(timeoutMs) {
    if (!on) return Promise.resolve(false);
    var data = Promise.all([
      get('products?select=*&published=eq.true&order=position.asc,created_at.asc'),
      get('settings?select=data&id=eq.1'),
      get('categories?select=*&order=position.asc,created_at.asc')
    ]).then(function (res) {
      if (res[0].length) window.PRODUCTS = res[0].map(toProduct);
      if (res[2].length) window.CATEGORIES = res[2];
      if (res[1][0] && res[1][0].data) {
        var s = res[1][0].data, store = window.STORE_CONFIG = window.STORE_CONFIG || {};
        for (var k in s) store[k] = s[k];
        store.fromDb = true;
      }
      return true;
    });
    var timer = new Promise(function (resolve) { setTimeout(function () { resolve(false); }, timeoutMs || 3000); });
    return Promise.race([data, timer]).catch(function () { return false; });
  }

  function newRef() {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  window.NDK_DB = {
    enabled: on,
    load: load,
    newRef: newRef,
    toProduct: toProduct,
    saveOrder: function (ref, lines) {
      return insert('orders', {
        ref: ref,
        lines: lines.map(function (l) {
          return { slug: l.slug, title: l.title, size: l.size, color: l.color, qty: l.qty, price: l.price };
        })
      });
    },
    subscribe: function (email, name, phone) {
      return insert('subscribers', { email: email, name: name || '', phone: phone || '' });
    },
    sendMessage: function (name, email, message) {
      return insert('messages', { name: name || '', email: email || '', message: message });
    }
  };
})();
