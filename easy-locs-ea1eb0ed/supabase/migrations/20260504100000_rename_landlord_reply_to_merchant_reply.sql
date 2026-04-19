-- Rename landlord_reply → merchant_reply in reviews table
-- The application-layer code (merchant.service.ts) consistently uses merchant_reply;
-- this migration aligns the database column name with the codebase convention.
ALTER TABLE public.reviews
  RENAME COLUMN landlord_reply TO merchant_reply;
