BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- USERS (create + upgrade)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  email CITEXT UNIQUE NOT NULL,
  email_verified_at TIMESTAMPTZ NULL,
  password_hash TEXT NULL,

  first_name TEXT NULL,
  last_name  TEXT NULL,
  phone      TEXT NULL,
  account_type TEXT NULL,
  address    TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS public_id UUID,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

UPDATE users SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_idx ON users(public_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_account_type_chk') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_type_chk
      CHECK (account_type IS NULL OR account_type IN ('residential','business'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at') THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- OAUTH IDENTITIES
CREATE TABLE IF NOT EXISTS oauth_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- EMAIL TOKENS
CREATE TABLE IF NOT EXISTS email_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_tokens_user_type_idx ON email_tokens(user_id, type);

-- USER ROLES (admin / worker / customer)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer','admin','worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);

-- default existing users to customer if they have zero roles
DO $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  SELECT u.id, 'customer'
  FROM users u
  WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
EXCEPTION WHEN others THEN
  NULL;
END$$;

-- SERVICES
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  title       TEXT NOT NULL,
  description TEXT NOT NULL,

  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,

  base_price_cents INT NULL,
  duration_minutes INT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(public_id)
);
CREATE INDEX IF NOT EXISTS idx_services_active_sort
  ON services (is_active, sort_order, title);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_services_set_updated_at') THEN
    CREATE TRIGGER trg_services_set_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- seed services if empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM services LIMIT 1) THEN
    INSERT INTO services (title, description, sort_order)
    VALUES
      ('Pest Extermination', 'Ants, roaches, bed bugs, fleas/ticks, flies, snails, earwigs, mites, crickets, mosquitoes, spiders, wasps, gophers, moles, voles, and rodents.', 10),
      ('Wildlife Control', 'Raccoon, skunk, possum, squirrel, and other wildlife—removal and prevention.', 20),
      ('Specialty Services', 'General Pest Control, Rodent Exclusion, Crawl/Attic Clean Up, Vapor Barrier, Rodent Proofing, Pigeon Exclusion, Animal Removal, Tree/Yard Spray, Sanitize & Deodorize.', 30),
      ('Commercial Services', 'Partnership-based approach for restaurants, healthcare, and retail—with documentation support.', 40),
      ('Eco/Green Options', 'Environmentally conscious treatments available upon request—ask what fits your situation.', 50),
      ('Customized Plans', 'Tailored solutions for residential and commercial needs based on your property and pest pressure.', 60);
  END IF;
END$$;

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  customer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','assigned','completed','cancelled')),

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL,
  time_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,

  address TEXT NOT NULL,
  notes   TEXT NULL,

  accepted_at  TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(public_id),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_time
  ON bookings (customer_user_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status_time
  ON bookings (status, starts_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_set_updated_at') THEN
    CREATE TRIGGER trg_bookings_set_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- Prevent overlaps for active bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING GIST (time_range WITH &&)
      WHERE (status IN ('pending','accepted','assigned'));
  END IF;
END$$;

-- BOOKING ASSIGNMENTS
CREATE TABLE IF NOT EXISTS booking_assignments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_user_id BIGINT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, worker_user_id)
);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_worker
  ON booking_assignments (worker_user_id, assigned_at DESC);

-- BOOKING EVENTS
CREATE TABLE IF NOT EXISTS booking_events (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  actor_user_id BIGINT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_time
  ON booking_events (booking_id, created_at DESC);

COMMIT;