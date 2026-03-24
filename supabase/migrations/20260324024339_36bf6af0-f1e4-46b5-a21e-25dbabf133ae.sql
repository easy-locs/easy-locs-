-- Fix hero image dedup: replace duplicate images with unique alternatives per subcategory

-- Indian subcategory: 8 shops sharing 2 images. Diversify.
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80' WHERE id = '28853484-6529-4000-843b-eed9e9fbdb04';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80' WHERE id = '784c5672-a9a7-4e31-b86c-ac03370b702d';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80' WHERE id = '52e777ef-ede9-4cd9-a28e-79ac9e673eb2';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80' WHERE id = '083f68e4-0939-455f-bb25-9a6c7bf0048b';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80' WHERE id = '5d75f52b-8525-40f7-9b69-4283fc586c0c';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1606491956689-2ea866880049?w=800&q=80' WHERE id = '5205f561-02b5-4edd-944e-0284f650c571';

-- Healthy subcategory: 4 sharing same image
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' WHERE id = 'ee40f995-0f61-4d95-990e-18e3b3cbace9';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80' WHERE id = '37be4b1f-ec00-43ae-b195-b3e56f0b44f0';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80' WHERE id = 'a475b307-376b-425f-92e3-e7784368fe19';

-- Shawarma subcategory: 8 sharing 2 images
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80' WHERE id = 'cc0cc31b-7ccf-4d97-bb84-99fbe0564810';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1544378730-8b5104b38a89?w=800&q=80' WHERE id = '2a1aa2ed-1e5f-49c1-b3c7-1125a8ccc0cb';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' WHERE id = 'f9f5c8a5-1c46-496d-a34c-e5c7040fd0a5';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&q=80' WHERE id = 'c3aefcf8-ff4a-4404-af7b-505fb8b44343';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80' WHERE id = 'c7531468-8dfb-4752-b944-72f916208354';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&q=80' WHERE id = '4dc20289-dcce-4c3b-bd36-ab28e543e3f9';

-- Burger subcategory: 4 sharing same image
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80' WHERE id = '7840dd34-bc4c-46ac-af3e-544add158f9b';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80' WHERE id = 'f89bd169-9fee-4bf7-9940-2237ca4d6fc9';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80' WHERE id = '0f9e8385-a9c0-49b1-be83-f38e145b4721';