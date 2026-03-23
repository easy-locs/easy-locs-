-- Enable realtime for app_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;

-- Seed products for PIZZA TIMES so the menu is actually visible
INSERT INTO public.products (shop_id, name, description, price, category, image_url, is_available, sort_order, currency)
VALUES
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Margherita Pizza', 'Classic tomato, mozzarella, fresh basil', 32, 'Pizza', null, true, 1, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Pepperoni Pizza', 'Spicy pepperoni, mozzarella, tomato sauce', 38, 'Pizza', null, true, 2, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'BBQ Chicken Pizza', 'Grilled chicken, BBQ sauce, red onion, cilantro', 42, 'Pizza', null, true, 3, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Caesar Salad', 'Romaine, parmesan, croutons, caesar dressing', 24, 'Salads', null, true, 4, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Garlic Bread', 'Toasted with garlic butter and herbs', 15, 'Sides', null, true, 5, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Fresh Lemonade', 'Freshly squeezed with mint', 12, 'Drinks', null, true, 6, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Iced Americano', 'Double shot espresso over ice', 16, 'Drinks', null, true, 7, 'AED'),
  ('41923f6f-600d-422a-98c7-7dc1fc30d0d0', 'Tiramisu', 'Classic Italian coffee dessert', 28, 'Desserts', null, true, 8, 'AED');