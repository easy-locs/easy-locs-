
-- Classification fields on storefront_pages
ALTER TABLE storefront_pages
  ADD COLUMN IF NOT EXISTS classification_confidence integer,
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS classification_version text,
  ADD COLUMN IF NOT EXISTS classification_signals text[],
  ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_by_human boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_count integer DEFAULT 0;

-- Learning memory table
CREATE TABLE IF NOT EXISTS classification_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL,
  source_subcategory text,
  old_vertical text NOT NULL,
  corrected_vertical text NOT NULL,
  corrected_subcategory text,
  corrected_by text,
  correction_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pattern_key, corrected_vertical)
);

-- RLS
ALTER TABLE classification_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read classification_learning"
  ON classification_learning FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert classification_learning"
  ON classification_learning FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update classification_learning"
  ON classification_learning FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
