# Base de données et admin — mise en route

Le site et l’admin (`/admin/`) utilisent le projet Supabase **ndakaruu**
(`https://lqrljynvoumnolaxzgdr.supabase.co`). À faire **une seule fois**, environ 10 minutes.

## 1. Créer les tables

Supabase → **SQL Editor** → **New query** :

1. coller tout le contenu de `supabase/schema.sql` → **Run** ;
2. nouvelle requête, coller `supabase/seed.sql` → **Run** (charge les 20 produits actuels et les réglages).

Les deux scripts peuvent être relancés sans risque : ils n’effacent rien.

## 2. Créer votre compte administrateur

1. **Authentication → Users → Add user → Create new user** : votre email + un mot de passe solide,
   cocher **Auto Confirm User**.
2. **SQL Editor**, en remplaçant par votre email :

   ```sql
   insert into public.admins (email) values ('votre-email@exemple.com');
   ```

Seules les adresses de la table `admins` ont accès à l’admin. Pour ajouter un associé : même chose
avec son email.

3. **Authentication → Sign In / Providers** : désactiver **Allow new users to sign up**. Personne ne
   pourra se créer de compte de lui-même.
4. **Authentication → URL Configuration** : mettre l’adresse du site dans **Site URL** et ajouter
   `https://votre-site/admin/` dans **Redirect URLs** (nécessaire pour « mot de passe oublié »).

## 3. Brancher le site

Supabase → **Project Settings → API** → copier la clé **anon public**, puis la coller dans
`assets/js/db.js` :

```js
anonKey: 'eyJhbGciOi…'
```

Cette clé est faite pour être publique. **Ne jamais** y mettre la clé `service_role`.

Une fois le fichier publié, le site lit le catalogue dans la base. Les commandes, les messages
de contact et les inscriptions à la newsletter y sont enregistrés.

## Ce que fait l’admin

| Page | Rôle |
| --- | --- |
| Tableau de bord | chiffre d’affaires, commandes, panier moyen, ventes par jour, meilleures ventes, points à surveiller |
| Commandes | commandes du site (avec leur référence WhatsApp) et saisies à la main ; statut, paiement, livraison, remise, historique, message WhatsApp au client, export CSV |
| Produits | créer, modifier, dupliquer, masquer, réordonner ; photos téléversées (réduites automatiquement), tailles, couleurs, photo par couleur, promotions |
| Clients | regroupés par téléphone : nombre de commandes, total dépensé, export CSV |
| Messages | formulaire de contact : à traiter / traités |
| Newsletter | abonnés, copie des emails, export CSV |
| Réglages | coordonnées, numéro WhatsApp des commandes, réseaux, barre d’annonce, frais de livraison par défaut, mot de passe |

Chaque modification est visible tout de suite sur le site, sans republier de fichier.

## Sécurité

- Les règles de `schema.sql` (Row Level Security) font le travail : un visiteur peut lire le catalogue
  et *envoyer* une commande, un message ou une inscription, mais ne peut rien lire d’autre.
- Le prix d’une commande venue du site est recalculé dans la base à partir du catalogue : un total
  modifié dans le navigateur est ignoré.
- Si la base ne répond pas, le site affiche le catalogue de `data/products.js` : il n’est jamais vide.
  Pensez donc à mettre ce fichier à jour de temps en temps si vous changez beaucoup le catalogue.
