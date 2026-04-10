-- Final dedup: fix last 5 groups at count=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=800&q=80' WHERE name = 'Penne Club Barsha';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80' WHERE name = 'Sports City Residences' AND cover_image LIKE '%1502672260266%';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6b?w=800&q=80' WHERE name = 'Super Save Downtown' AND cover_image LIKE '%1534723452862%';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1488459716781-31db52582ff0?w=800&q=80' WHERE name = 'Organic Lane Downtown' AND cover_image LIKE '%1542838132%';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800&q=80' WHERE name = 'Quick Stop Bay' AND cover_image LIKE '%1604719312566%';