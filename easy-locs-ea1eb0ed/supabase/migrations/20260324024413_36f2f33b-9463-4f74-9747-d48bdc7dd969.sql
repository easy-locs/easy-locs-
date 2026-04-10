-- Fix remaining dedup: reduce all count>=3 to max 2
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80' WHERE id = '5473d17e-f530-4620-84df-d05b57b05499';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800&q=80' WHERE id = '675ca14d-e7d7-4cf8-a4bf-dd72c1f46f4a';
UPDATE seed_merchants SET cover_image = 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=800&q=80' WHERE id = 'c7531468-8dfb-4752-b944-72f916208354';