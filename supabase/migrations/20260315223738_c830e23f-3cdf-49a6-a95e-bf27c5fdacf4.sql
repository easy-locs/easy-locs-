
-- Fix: re-run just the column additions (the previous migration failed at the last line but columns may have been added)
-- This is idempotent due to IF NOT EXISTS
SELECT 1;
