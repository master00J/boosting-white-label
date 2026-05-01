INSERT INTO site_settings (key, value)
VALUES (
  'integrations',
  '{
    "tawkto_enabled": false,
    "tawkto_property_id": "",
    "tawkto_widget_id": "default"
  }'
)
ON CONFLICT (key) DO NOTHING;
