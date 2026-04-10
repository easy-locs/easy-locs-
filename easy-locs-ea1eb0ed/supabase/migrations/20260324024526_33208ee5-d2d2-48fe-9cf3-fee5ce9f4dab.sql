-- Final hero dedup pass: reduce ALL count>=3 groups to max 2

-- organic_store rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' WHERE id = '958c7487-088a-44b6-89a1-9cb2356d3fef';

-- desserts group 1 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80' WHERE id = '2d7ccec9-c777-4ce2-a44b-b6acf9e9e300';

-- breakfast group 1 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800&q=80' WHERE id = 'dc9c48b0-a4af-4661-8cdc-e01e9b970e49';

-- clinic rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80' WHERE id = '344840c0-504c-4c6c-b45c-615461b9fa4e';

-- apartment rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80' WHERE id = 'c529ca40-924a-42e0-904b-1e820b5c169a';

-- breakfast group 2 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80' WHERE id = '977207c0-58ca-4370-bf90-18444d45170f';

-- chinese group 1 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80' WHERE id = 'ce53c090-7289-4b45-b198-ed21568a403c';

-- breakfast group 3 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800&q=80' WHERE id = '88080fb3-b8ae-4535-a005-b9dc5a7f81cb';

-- desserts group 2 rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80' WHERE id = 'e89790e4-e9e1-49a2-8fb1-7d52771537e1';

-- chinese group 2 (photo-1585032226651) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- chinese group 3 (photo-1569718212165) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- supermarket group 1 (photo-1604719312566) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1608198093002-ad4e005571c3?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- pizza group 1 (photo-1574071318508) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- pizza group 2 (photo-1565299624946) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- mini_mart group 1 (photo-1604709177225) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- pasta group 1 (photo-1563379926898) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- mexican (photo-1565299585323) rn=3 and rn=4
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- mexican (photo-1599974579688) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- desserts group 3 (photo-1563729784474) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- cleaning (photo-1581578731548) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- supermarket group 2 (photo-1578916171728) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- mini_mart group 2 (photo-1601598851547) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1601598851547-4302969d0614?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);

-- pasta group 2 (photo-1621996346565) rn=3
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80' WHERE id IN (SELECT id FROM seed_merchants WHERE cover_image = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80' AND is_active = true ORDER BY name LIMIT 1 OFFSET 2);