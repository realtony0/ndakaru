# mbedüm:ndakaru

Site vitrine + boutique de **mbedüm ndakaru** — vêtements inspirés de Dakar.

Reprend toutes les données de `mbedumndakaru.com` (15 produits, prix en FCFA, tailles,
couleurs, descriptions, contacts) dans une direction artistique inspirée de `about---blank.com` :
minimalisme contemporain, tout en bas de casse, nommage en `mot:mot`, grandes images plein cadre.

**17 produits** au total : les 15 pièces héritage + la collection **gaïndé** (Gaïndé et Sunugaal),
ajoutée à partir des photos du shooting.

## Lancer en local

```bash
python3 -m http.server 4173
```

Puis ouvrir http://localhost:4173

Le site est 100 % statique (HTML/CSS/JS, aucune dépendance, aucun build).
Il fonctionne aussi en double-cliquant `index.html` — les produits sont chargés
depuis `data/products.js`, pas via `fetch`, donc pas de blocage `file://`.

## Mise en ligne

Déposer le dossier tel quel chez n'importe quel hébergeur statique
(Hostinger, Netlify, Vercel, GitHub Pages, cPanel…). Aucune configuration serveur.

## Structure

```
index.html        accueil (hero, gaïndé, nouveautés, lookbook, mosaïque, promo, membre)
boutique.html     grille + filtres (tout / gaïndé / t-shirts / hoodies / promo) + tri
produit.html      fiche produit, lue via ?p=<slug>
marque.html       histoire de la marque + galerie
contact.html      coordonnées, livraison, échanges, formulaire

data/products.json  source lisible des 17 produits
data/products.js    même contenu, injecté dans window.PRODUCTS (utilisé par le site)

assets/css/style.css  toute la mise en forme
assets/js/config.js   coordonnées, réseaux, messages de la barre d'annonce
assets/js/app.js      panier, tiroir, recherche, filtres, fiche produit
assets/img/products/  visuels produits
assets/img/site/      photos lookbook et bandeaux
```

## Modifier la boutique

**Coordonnées, réseaux, messages défilants** → `assets/js/config.js`.

**Produits** → éditer `data/products.json`, puis régénérer `data/products.js` :

```bash
python3 -c "import json;d=json.load(open('data/products.json',encoding='utf-8'));open('data/products.js','w',encoding='utf-8').write('window.PRODUCTS = '+json.dumps(d,ensure_ascii=False,indent=2)+';')"
```

Champs d'un produit : `slug`, `title`, `category` (`tshirts` | `hoodies`),
`collection` (`gainde` | `heritage`), `price`, `compareAt` (prix barré, ou `null`),
`description`, `images[]`, `sizes[]`, `colors[]`, et `colorImages` (facultatif : une image
par couleur — sert de vignette au panier et met la bonne vue en tête de la fiche produit).

## Note macOS

Les photos déposées depuis WhatsApp arrivent avec un attribut de quarantaine qui empêche
un serveur local de les lire (images en 404). Si ça se reproduit après avoir ajouté des
photos, exécutez depuis votre Terminal :

```bash
xattr -rc ~/Desktop/ndakaru/assets/img
```

Ce problème est propre à macOS : il disparaît dès que les fichiers sont mis en ligne.

## Commandes

Le panier est gardé dans le navigateur (`localStorage`). « commander:whatsapp »
ouvre WhatsApp avec le récapitulatif prérempli vers le **+221 78 927 15 31**
(modifiable dans `config.js`). Aucun paiement en ligne : paiement à la livraison.

Le formulaire de contact ouvre lui aussi WhatsApp. La newsletter n'est pas branchée
à un service (aucun envoi) — à connecter si besoin.
