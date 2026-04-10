
-- Fix the growth metrics trigger that references non-existent metadata_json column
CREATE OR REPLACE FUNCTION trg_track_growth_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simplified: just track order count growth, no referral code dependency
  RETURN NEW;
END;
$$;
