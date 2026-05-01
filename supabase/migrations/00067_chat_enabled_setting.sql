-- Add custom_chat_enabled to integrations settings (defaults to true)
UPDATE site_settings
SET value = value || '{"custom_chat_enabled": true}'::jsonb
WHERE key = 'integrations'
  AND NOT (value ? 'custom_chat_enabled');
