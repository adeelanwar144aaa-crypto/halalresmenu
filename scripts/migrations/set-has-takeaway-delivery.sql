-- Run in Supabase SQL editor (Dashboard → SQL → New query)

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS has_takeaway BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false;

UPDATE restaurants
SET
  has_takeaway = true,
  has_delivery = false
WHERE has_takeaway IS NULL OR has_takeaway = false;
