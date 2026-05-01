-- Admin ranks: super-admins can create ranks and restrict which admin sections each rank can access.
-- Profiles with role 'admin' can have an admin_rank_id; their sidebar and routes are limited to that rank's sections.
-- Super-admins and admins without a rank see all sections.

CREATE TABLE admin_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_rank_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_id UUID NOT NULL REFERENCES admin_ranks(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  UNIQUE(rank_id, section_key)
);

CREATE INDEX idx_admin_rank_permissions_rank_id ON admin_rank_permissions(rank_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_rank_id UUID REFERENCES admin_ranks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_admin_rank_id ON profiles(admin_rank_id);

COMMENT ON TABLE admin_ranks IS 'Admin ranks created by super_admins; each rank has a set of allowed admin sections.';
COMMENT ON TABLE admin_rank_permissions IS 'Which admin dashboard sections (e.g. orders, helpdesk) a rank can access.';
COMMENT ON COLUMN profiles.admin_rank_id IS 'When role is admin, limits dashboard access to this rank’s sections. Ignored for super_admin.';

CREATE TRIGGER admin_ranks_updated_at
  BEFORE UPDATE ON admin_ranks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
