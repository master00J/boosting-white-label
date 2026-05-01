-- Add VPN country code to orders so boosters can indicate where they are working from
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vpn_country_code TEXT;
