
-- Add parent_entity_id for multi-location (brand → location children)
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS parent_entity_id uuid REFERENCES public.entities(id);

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_entities_parent ON public.entities (parent_entity_id) WHERE parent_entity_id IS NOT NULL;
