ALTER TABLE public.storefront_pages 
  ADD COLUMN IF NOT EXISTS launch_status text NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_storefront_pages_launch_status ON public.storefront_pages(launch_status);

COMMENT ON COLUMN public.storefront_pages.launch_status IS 'Controls outbound messaging: draft/ready/waiting_launch/launched. Only launched shops can send messages.';