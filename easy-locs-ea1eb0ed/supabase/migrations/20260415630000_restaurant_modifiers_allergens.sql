-- Restaurant Modifiers, Allergens & Nutritional Info
-- Task #140: Enrich menu_items + create modifier tables

-- Enrich menu_items with allergens, dietary labels, nutritional info
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_labels TEXT[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS spice_level INTEGER DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories_kcal INTEGER;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS protein_g NUMERIC;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS carbs_g NUMERIC;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS fat_g NUMERIC;

-- Add check constraint for spice_level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_spice_level_check'
  ) THEN
    ALTER TABLE menu_items ADD CONSTRAINT menu_items_spice_level_check CHECK (spice_level >= 0 AND spice_level <= 5);
  END IF;
END $$;

-- Modifier groups table
CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('radio', 'checkbox')),
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 10,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Modifier options table
CREATE TABLE IF NOT EXISTS menu_modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES menu_modifier_groups(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  price_adjustment NUMERIC DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modifier_groups_menu_item ON menu_modifier_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON menu_modifier_options(group_id);

-- Enable RLS
ALTER TABLE menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for modifier groups
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_groups_select_all') THEN
    CREATE POLICY modifier_groups_select_all ON menu_modifier_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_groups_insert_owner') THEN
    CREATE POLICY modifier_groups_insert_owner ON menu_modifier_groups FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM menu_items mi
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mi.id = menu_modifier_groups.menu_item_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_groups_update_owner') THEN
    CREATE POLICY modifier_groups_update_owner ON menu_modifier_groups FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM menu_items mi
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mi.id = menu_modifier_groups.menu_item_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_groups_delete_owner') THEN
    CREATE POLICY modifier_groups_delete_owner ON menu_modifier_groups FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM menu_items mi
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mi.id = menu_modifier_groups.menu_item_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS policies for modifier options (scoped through group → item → shop owner)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_options_select_all') THEN
    CREATE POLICY modifier_options_select_all ON menu_modifier_options FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_options_insert_owner') THEN
    CREATE POLICY modifier_options_insert_owner ON menu_modifier_options FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM menu_modifier_groups mg
          JOIN menu_items mi ON mi.id = mg.menu_item_id
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mg.id = menu_modifier_options.group_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_options_update_owner') THEN
    CREATE POLICY modifier_options_update_owner ON menu_modifier_options FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM menu_modifier_groups mg
          JOIN menu_items mi ON mi.id = mg.menu_item_id
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mg.id = menu_modifier_options.group_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modifier_options_delete_owner') THEN
    CREATE POLICY modifier_options_delete_owner ON menu_modifier_options FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM menu_modifier_groups mg
          JOIN menu_items mi ON mi.id = mg.menu_item_id
          JOIN storefront_pages sp ON sp.id = mi.storefront_id
          WHERE mg.id = menu_modifier_options.group_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;
