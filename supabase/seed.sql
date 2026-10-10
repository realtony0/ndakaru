-- mbedüm:ndakaru — données de départ (catalogue actuel + réglages)
--
-- À lancer APRÈS schema.sql, dans Supabase → SQL Editor.
-- Ne remplace rien : un produit déjà présent (même slug) est laissé tel quel.
-- Fichier généré depuis data/products.json et assets/js/config.js.

insert into public.products
  (slug, title, category, collection, price, compare_at, currency, description,
   images, sizes, colors, color_images, source_slug, position)
values
  ('dakar-with-pride', 'Dakar With Pride', 'tshirts', 'nouveau', 12000, null, 'FCFA', 'Une pièce inspirée par les rues, les couleurs, l’architecture et l’énergie de Ndakaru. Un design qui mélange héritage culturel et esthétique streetwear vintage.', '["assets/img/products/dakar-pride-02.jpg", "assets/img/products/dakar-pride-01.jpg", "assets/img/products/dakar-pride-03.jpg", "assets/img/products/dakar-pride-04.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Noir", "Blanc"]'::jsonb, '{"Noir": "assets/img/products/dakar-pride-02.jpg", "Blanc": "assets/img/products/dakar-pride-01.jpg"}'::jsonb, null, 0),
  ('ndakaru-dice', 'Ndakaru Dice', 'tshirts', 'nouveau', 10000, null, 'FCFA', 'Un design inspiré des dés, entre hasard, chance et culture streetwear dakaroise. Le Ndakaru Dice mêle esthétique vintage et identité sénégalaise pour un look unique.', '["assets/img/products/ndakaru-dice-01.jpg", "assets/img/products/ndakaru-dice-02.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Noir"]'::jsonb, '{"Noir": "assets/img/products/ndakaru-dice-01.jpg"}'::jsonb, null, 1),
  ('ndate-yalla-mbodj-legacy', 'Ndaté Yalla Mbodj — Legacy', 'tshirts', 'nouveau', 12000, null, 'FCFA', 'Un hommage au Waalo Waalo et à l’héritage de Ndaté Yalla Mbodj, symbole de force, de fierté et de résistance.

Une pièce vintage pensée pour faire vivre notre histoire à travers le streetwear.', '["assets/img/products/ndate-yalla-01.jpg", "assets/img/products/ndate-yalla-02.jpg", "assets/img/products/ndate-yalla-03.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Noir", "Vert", "Blanc"]'::jsonb, '{"Blanc": "assets/img/products/ndate-yalla-01.jpg"}'::jsonb, null, 2),
  ('fuki-pench-ak-niar', 'Fuki Pench ak Niar', 'tshirts', 'nouveau', 10000, null, 'FCFA', 'Inspiré des 12 pënc traditionnels lébous, Fuki Pench ak Niar rend hommage aux racines profondes de Dakar et à ceux qui ont façonné son identité.

Une pièce entre héritage, mémoire et streetwear, où les codes de l’ancienne Dakar rencontrent l’esthétique contemporaine de Mbedüm Ndakaru.

12 foyers. Une histoire. Une identité. Dakar.', '["assets/img/products/fuki-pench-02.jpg", "assets/img/products/fuki-pench-01.jpg", "assets/img/products/fuki-pench-03.jpg", "assets/img/products/fuki-pench-04.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Noir", "Vert", "Marron"]'::jsonb, '{"Noir": "assets/img/products/fuki-pench-02.jpg", "Vert": "assets/img/products/fuki-pench-02.jpg", "Marron": "assets/img/products/fuki-pench-02.jpg"}'::jsonb, null, 3),
  ('gainde-t-shirt', 'Gaïndé (T-shirt)', 'tshirts', 'gainde', 10000, null, 'FCFA', 'Le maillot Gaïndé — le Lion.

Écusson Sunugaal FSF, monogramme Maison Ndakaru sur le cœur, lettrage ton sur ton. Coupe maillot, coton lourd, épaules tombantes.

Au dos, la sérigraphie Sunugaal : le stade, les drapeaux, la foule.

Trois coloris : noir, crème et blanc.', '["assets/img/products/gainde-noir-01.jpg", "assets/img/products/gainde-creme-04.jpg", "assets/img/products/gainde-creme-01.jpg", "assets/img/products/gainde-duo-01.jpg", "assets/img/products/sunugaal-dos-02.jpg", "assets/img/products/sunugaal-dos-01.jpg", "assets/img/products/gainde-blanc-01.jpg", "assets/img/products/gainde-noir-02.jpg", "assets/img/products/gainde-creme-02.jpg", "assets/img/products/gainde-noir-04.jpg", "assets/img/products/gainde-creme-03.jpg", "assets/img/products/gainde-noir-03.jpg", "assets/img/products/gainde-duo-02.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Noir", "Crème", "Blanc"]'::jsonb, '{"Noir": "assets/img/products/gainde-noir-01.jpg", "Crème": "assets/img/products/gainde-creme-01.jpg", "Blanc": "assets/img/products/gainde-blanc-01.jpg"}'::jsonb, null, 4),
  ('maaaam-tshirt', 'Maaaam (Tshirt)', 'tshirts', 'heritage', 10000, 12000, 'FCFA', '', '["assets/img/products/a4530b4e-c01b-4538-b2c9-46e2eb274839.jpg", "assets/img/products/9f19128a-194e-49cd-ba61-e91d8fda6adc.jpg", "assets/img/products/ce6ff982-0e7b-44c6-bb15-436a82eddb69.jpg", "assets/img/products/5be5a1df-cb87-4380-a81f-dcd9ed1b8553.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Beige", "Blanc", "Noir"]'::jsonb, '{}'::jsonb, 'maaaam-tshirt1', 5),
  ('ndakaru-bu-jekk-tshirt', 'Ndakaru bu jëkk (Tshirt)', 'tshirts', 'heritage', 10000, 12000, 'FCFA', '', '["assets/img/products/90f56d03-e5e0-4cab-974d-ef32b6fc5c7b.jpg", "assets/img/products/889a29fe-1504-42dd-9663-d059215674ab.jpg", "assets/img/products/5706efbf-ad8c-4c21-a4d4-6efc0d29fe37.jpg", "assets/img/products/9a73dca0-408e-4afd-bb39-a7a34f61d6a4.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Beige", "Blanc", "Noir"]'::jsonb, '{}'::jsonb, 'ndakaru-bu-jekk-tshirt1', 6),
  ('ndortel-tshirt', 'Ndortel (Tshirt)', 'tshirts', 'heritage', 10000, 12000, 'FCFA', '', '["assets/img/products/fa8f8933-b75e-4510-9102-31a9e88eb5c2.jpg", "assets/img/products/2336d2cc-31d6-4524-ae45-baa26969c77d.jpg", "assets/img/products/6860a8b1-d95f-4a6e-a94d-e5b9148018ac.jpg", "assets/img/products/fbe08622-174a-4307-83a1-dc74d6ce669a.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Beige", "Blanc", "Noir"]'::jsonb, '{}'::jsonb, 'ndortel-tshirt1', 7),
  ('kermel-hoodies', 'KERMEL (Hoodies)', 'hoodies', 'heritage', 15000, null, 'FCFA', 'Un hommage vintage au Marché Kermel, symbole du Dakar historique. Une pièce culturelle signée MBEDÜM NDAKARU.', '["assets/img/products/75f981be-6734-49a8-b4eb-656be9a6f133.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'kermel-hoodies-un-hommage-vintage-au-marche-kermel-symbole-du-dakar-historique-une-piece-culturelle-signee-mbedum-ndakaru', 8),
  ('kermel-t-shirt', 'KERMEL (T-SHIRT)', 'tshirts', 'heritage', 10000, null, 'FCFA', 'Un hommage vintage au Marché Kermel, symbole du Dakar historique. Une pièce culturelle signée MBEDÜM NDAKARU.', '["assets/img/products/c62b9eec-5bf8-4e37-90c5-a386fbbd3ff8.jpg", "assets/img/products/ea8aba72-56af-4092-8b17-68c2a88bc585.jpg", "assets/img/products/6eb121cf-1dec-49dc-9de2-26a8aa7d42c4.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'kermel-t-shirt-un-hommage-vintage-au-marche-kermel-symbole-du-dakar-historique-une-piece-culturelle-signee-mbedum-ndakaru', 9),
  ('teggu-hoodies', 'TËGGU (Hoodies)', 'hoodies', 'heritage', 15000, null, 'FCFA', 'L’héritage de Ndakaru, porté avec fierté.', '["assets/img/products/c08742ec-64f3-4181-83d3-fed1cf4eff06.jpg", "assets/img/products/9d07262e-4565-4267-a119-da422922dc57.jpg", "assets/img/products/03c6fee9-9f8e-457c-a3bd-844d1d0eae06.jpg", "assets/img/products/5a0baa42-223f-44f0-8aea-fdc230fdde77.jpg", "assets/img/products/4de538b1-fb5e-4beb-a42c-568c30c4d68b.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'teggu-hoodies-lheritage-de-ndakaru-porte-avec-fierte', 10),
  ('teggu-t-shirt', 'TËGGU (T-shirt)', 'tshirts', 'heritage', 10000, null, 'FCFA', 'L’héritage de Ndakaru, porté avec fierté.', '["assets/img/products/64dfc24e-eab9-433a-b3f0-6761c42d7d77.jpg", "assets/img/products/85095377-42e9-4c77-ad9c-1ee7c7ee934a.jpg", "assets/img/products/371fcca3-2443-4ea9-85b7-01267115bec2.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'teggu-t-shirt-lheritage-de-ndakaru-porte-avec-fierte', 11),
  ('ndakaru-cards-vintage-tee-hoodies', 'Ndakaru Cards Vintage Tee Hoodies', 'hoodies', 'heritage', 15000, null, 'FCFA', '', '["assets/img/products/e719f430-c702-4c56-946f-5e21e079af71.jpg", "assets/img/products/822e50be-a320-4d91-9c19-5fe44c7fb44b.jpg", "assets/img/products/878eaefb-df94-4932-9096-f9c00c9970bf.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'ndakaru-cards-vintage-tee-hoodies', 12),
  ('ndakaru-cards-vintage-tee-tshirt', 'Ndakaru Cards Vintage Tee tshirt', 'tshirts', 'heritage', 10000, null, 'FCFA', '', '["assets/img/products/88d3a439-2e95-45e1-aba5-6b33773baf1a.jpg", "assets/img/products/68483c39-547f-4801-945b-1074a27520e0.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'ndakaru-cards-vintage-tee-tshirt', 13),
  ('t-shirt-mariam-dicoh', 'T-shirt “Mariam Dicoh”', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Inspiré de la première femme chimiste de Côte d’Ivoire, représentée sur la pièce de 25 francs CFA.

Une création vintage qui rend hommage à la science, à la culture et à l’élégance africaine.

Fierté. Héritage. Savoir.', '["assets/img/products/mariam-dicoh-01.jpg", "assets/img/products/27706770-bf85-4e7b-8218-33d5d9b53592.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Beige", "Blanc", "Noir"]'::jsonb, '{"Beige": "assets/img/products/mariam-dicoh-01.jpg"}'::jsonb, 't-shirt-mariam-dicoh-', 14),
  ('t-shirt-renaissance-x-teranga', 'T-shirt Renaissance x Teranga', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Avec ses teintes douces et son graphisme végétal, ce modèle rend hommage à la Renaissance africaine et à l’âme de la Teranga.

Dakar, ville d’histoire et d’élégance, y est représentée comme une terre d’équilibre entre mémoire et fierté.

Ici naît l’élégance inspirée par l’Afrique.', '["assets/img/products/renaissance-teranga-01.jpg", "assets/img/products/15a2c1e7-57b8-47d0-bcbe-aa47862f5a08.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, '-t-shirt-renaissance-x-teranga', 15),
  ('t-shirt-dakar-heritage-mosquee-gare', 'T-shirt Dakar Heritage (Mosquée + Gare)', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Ce modèle unit deux symboles puissants de Dakar : la Mosquée de la Divinité et la Gare de Dakar.

Un mariage d’architecture, de foi et d’élégance.

Un hommage à la grandeur et à la beauté de la capitale.', '["assets/img/products/dakar-heritage-01.jpg", "assets/img/products/f05fee1c-0ffb-4efb-8f8a-4f69d961bf9f.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'vtements-uniques', 16),
  ('t-shirt-chambre-de-commerce-noir-gold', 'T-shirt Chambre de Commerce (Noir/Gold)', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Symbole de fierté et d’histoire, ce design rend hommage à l’un des plus anciens monuments de Dakar : la Chambre de Commerce.

Son style vintage et doré capture la noblesse du patrimoine sénégalais — une pièce qui relie tradition et modernité.

Un hommage à la ville où tout commence.', '["assets/img/products/2c25cae0-f7a2-4928-b6fd-c66cdb08cf6c.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'mode-dakar', 17),
  ('t-shirt-goree-renaissance', 'T-shirt Gorée Renaissance', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Mémoire, histoire et résilience.

Ce modèle s’inspire de l’île de Gorée, lieu de mémoire et de renaissance. Le visuel traduit la beauté poignante d’un passé gravé dans l’océan, revisité avec une touche artistique et élégante.

Un vêtement qui parle d’âme et d’identité.', '["assets/img/products/ddedef8f-def5-4ed2-84ae-e3efe017abeb.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'vtements-uniques-2', 18),
  ('t-shirt-senegal-sunset', 'T-shirt Sénégal Sunset', 'tshirts', 'heritage', 10000, 12000, 'FCFA', 'Inspiré par la côte dakaroise et la chaleur du couchant africain, ce design incarne la paix, la culture et la fierté du Sénégal.

Chaque détail évoque la lumière et l’énergie du pays de la Teranga.

L’Afrique, là où tout commence.', '["assets/img/products/1fa609df-be78-4a2a-b15f-c95c08c0914e.jpg"]'::jsonb, '["M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["Blanc", "Noir", "Beige"]'::jsonb, '{}'::jsonb, 'vtements-de-dakar-1', 19)
on conflict (slug) do nothing;

insert into public.settings (id, data) values (1, '{"name": "mbedüm ndakaru", "tagline": "vêtements inspirés de Dakar", "since": "1988", "email": "contact@mbedumndakaru.com", "phone": "+221 78 927 15 31", "whatsapp": "221789271531", "instagram": "https://www.instagram.com/mbedum_ndakaru", "tiktok": "https://www.tiktok.com/@mbedum_ndakaru", "city": "Dakar, Sénégal", "announcements": ["Promo été : jusqu’à 2 000 FCFA d’économie", "Livraison partout à Dakar · paiement à la livraison", "Gaïndé — nouvelle collection disponible"], "deliveryFee": 0}'::jsonb)
on conflict (id) do nothing;
