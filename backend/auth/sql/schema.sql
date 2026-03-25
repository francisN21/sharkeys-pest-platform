BEGIN;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  email CITEXT UNIQUE NOT NULL,
  email_verified_at TIMESTAMPTZ NULL,
  password_hash TEXT NULL,

  first_name TEXT NULL,
  last_name TEXT NULL,
  phone TEXT NULL,
  account_type TEXT NULL,
  address TEXT NULL,

  -- CRM fields
  crm_tag TEXT NULL,
  crm_tag_note TEXT NULL,
  crm_tag_updated_at TIMESTAMPTZ NULL,
  crm_tag_updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- All columns above are defined in CREATE TABLE.
-- ALTER TABLE ADD COLUMN IF NOT EXISTS guards kept only for columns
-- that were added after initial schema creation (migration safety).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS crm_tag TEXT,
  ADD COLUMN IF NOT EXISTS crm_tag_note TEXT,
  ADD COLUMN IF NOT EXISTS crm_tag_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crm_tag_updated_by_user_id BIGINT;

UPDATE users SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_idx ON users(public_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_type_chk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_type_chk
      CHECK (account_type IS NULL OR account_type IN ('residential', 'business'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- LEADS (unregistered customers)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  email CITEXT UNIQUE NOT NULL,
  first_name TEXT NULL,
  last_name TEXT NULL,
  phone TEXT NULL,
  account_type TEXT NULL,
  address TEXT NULL,

  -- CRM fields
  crm_tag TEXT NULL,
  crm_tag_note TEXT NULL,
  crm_tag_updated_at TIMESTAMPTZ NULL,
  crm_tag_updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration guard for CRM columns added after initial schema creation.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS crm_tag TEXT,
  ADD COLUMN IF NOT EXISTS crm_tag_note TEXT,
  ADD COLUMN IF NOT EXISTS crm_tag_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crm_tag_updated_by_user_id BIGINT;

UPDATE leads SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE leads ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_public_id_idx ON leads(public_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_account_type_chk'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_account_type_chk
      CHECK (account_type IS NULL OR account_type IN ('residential', 'business'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'leads_set_updated_at'
  ) THEN
    CREATE TRIGGER leads_set_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- prevent a lead email from colliding with an existing registered user email
CREATE OR REPLACE FUNCTION spc_enforce_email_unique_leads()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users u
    WHERE u.email = NEW.email
  ) THEN
    RAISE EXCEPTION 'email % already exists in users', NEW.email
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_leads_email_unique_across_users'
  ) THEN
    CREATE TRIGGER trg_leads_email_unique_across_users
    BEFORE INSERT OR UPDATE OF email ON leads
    FOR EACH ROW
    EXECUTE FUNCTION spc_enforce_email_unique_leads();
  END IF;
END $$;

-- ============================================================
-- OAUTH IDENTITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'user_roles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%in%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_roles DROP CONSTRAINT %I', c_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_roles'::regclass
      AND conname = 'user_roles_role_chk'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_role_chk
      CHECK (role IN ('customer', 'admin', 'worker', 'superuser'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);

DO $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  SELECT u.id, 'customer'
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
  );
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,

  base_price_cents INT NOT NULL DEFAULT 0,
  duration_minutes INT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (public_id)
);

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS base_price_cents INT;

UPDATE services
SET base_price_cents = 0
WHERE base_price_cents IS NULL;

ALTER TABLE services
  ALTER COLUMN base_price_cents SET DEFAULT 0,
  ALTER COLUMN base_price_cents SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_base_price_cents_nonneg'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_base_price_cents_nonneg
      CHECK (base_price_cents >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_active_sort
  ON services (is_active, sort_order, title);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_services_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_services_set_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

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
END $$;

-- ============================================================
-- SURVEY SOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_sources (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM survey_sources LIMIT 1) THEN
    INSERT INTO survey_sources (code, label, sort_order)
    VALUES
      ('facebook', 'Facebook', 10),
      ('instagram', 'Instagram', 20),
      ('google', 'Google', 30),
      ('linkedin', 'LinkedIn', 40),
      ('referral', 'Referral', 50),
      ('other', 'Other', 60)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  customer_user_id BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
  service_id BIGINT NOT NULL REFERENCES services(id),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'assigned', 'completed', 'cancelled')),

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  time_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,

  address TEXT NOT NULL,
  notes TEXT NULL,

  accepted_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,

  assigned_worker_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  completed_worker_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (public_id),
  CHECK (ends_at > starts_at)
);

-- All bookings columns are defined in CREATE TABLE above.
-- Migration guard: drop NOT NULL on customer_user_id for lead-only bookings.
-- (The DO block below handles this idempotently.)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name = 'customer_user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN customer_user_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_customer_or_lead_chk'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_customer_or_lead_chk
      CHECK (
        (customer_user_id IS NOT NULL AND lead_id IS NULL)
        OR
        (customer_user_id IS NULL AND lead_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_time
  ON bookings (customer_user_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status_time
  ON bookings (status, starts_at DESC);

CREATE INDEX IF NOT EXISTS bookings_status_idx
  ON bookings (status);

CREATE INDEX IF NOT EXISTS bookings_assigned_worker_idx
  ON bookings (assigned_worker_user_id);

CREATE INDEX IF NOT EXISTS bookings_completed_worker_user_id_idx
  ON bookings (completed_worker_user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_lead_id
  ON bookings (lead_id);

CREATE INDEX IF NOT EXISTS idx_bookings_service_id
  ON bookings (service_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_bookings_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_bookings_set_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING GIST (time_range WITH &&)
      WHERE (status IN ('pending', 'accepted', 'assigned'));
  END IF;
END $$;

-- ============================================================
-- BOOKING PRICES
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_prices (
  booking_id BIGINT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  initial_price_cents INT NOT NULL DEFAULT 0,
  final_price_cents INT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  set_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_prices_booking_id_idx ON booking_prices(booking_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_booking_prices_updated_at'
  ) THEN
    CREATE TRIGGER trg_booking_prices_updated_at
    BEFORE UPDATE ON booking_prices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- BOOKING ASSIGNMENTS (one row per booking)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_assignments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_user_id BIGINT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_assignments_booking_id_key'
  ) THEN
    ALTER TABLE booking_assignments
      ADD CONSTRAINT booking_assignments_booking_id_key UNIQUE (booking_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_assignments_worker
  ON booking_assignments (worker_user_id, assigned_at DESC);

-- ============================================================
-- BOOKING EVENTS
-- ============================================================
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

-- ============================================================
-- BOOKING PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_participants (
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin', 'superuser')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ NULL,
  added_by_user_id BIGINT NULL REFERENCES users(id),
  removed_by_user_id BIGINT NULL REFERENCES users(id),
  PRIMARY KEY (booking_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS booking_participants_active_idx
  ON booking_participants (booking_id, user_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS booking_participants_booking_active_idx
  ON booking_participants (booking_id)
  WHERE removed_at IS NULL;

-- ============================================================
-- BOOKING MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_messages (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin', 'worker', 'superuser')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id_created_at
  ON booking_messages (booking_id, created_at);

-- ============================================================
-- PARTICIPANT SYNC TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION spc_sync_customer_participant()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.customer_user_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.customer_user_id IS NOT NULL
         AND (OLD.customer_user_id IS DISTINCT FROM NEW.customer_user_id)) THEN

    IF TG_OP = 'UPDATE' AND OLD.customer_user_id IS NOT NULL
       AND OLD.customer_user_id IS DISTINCT FROM NEW.customer_user_id THEN
      UPDATE booking_participants
      SET removed_at = now()
      WHERE booking_id = NEW.id
        AND role = 'customer'
        AND removed_at IS NULL;
    END IF;

    INSERT INTO booking_participants (booking_id, user_id, role, added_at, removed_at)
    VALUES (NEW.id, NEW.customer_user_id, 'customer', now(), NULL)
    ON CONFLICT (booking_id, user_id, role)
    DO UPDATE SET removed_at = NULL, added_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_spc_sync_customer_participant'
  ) THEN
    CREATE TRIGGER trg_spc_sync_customer_participant
    AFTER INSERT OR UPDATE OF customer_user_id ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION spc_sync_customer_participant();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION spc_sync_worker_participant_on_assignment()
RETURNS trigger AS $$
DECLARE
  v_booking_id BIGINT;
  v_worker_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_booking_id := OLD.booking_id;
    v_worker_id := OLD.worker_user_id;
  ELSE
    v_booking_id := NEW.booking_id;
    v_worker_id := NEW.worker_user_id;
  END IF;

  UPDATE booking_participants
  SET removed_at = now()
  WHERE booking_id = v_booking_id
    AND role = 'worker'
    AND removed_at IS NULL;

  IF TG_OP <> 'DELETE' AND v_worker_id IS NOT NULL THEN
    INSERT INTO booking_participants (booking_id, user_id, role, added_at, removed_at)
    VALUES (v_booking_id, v_worker_id, 'worker', now(), NULL)
    ON CONFLICT (booking_id, user_id, role)
    DO UPDATE SET removed_at = NULL, added_at = now();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_spc_sync_worker_participant_on_assignment'
  ) THEN
    CREATE TRIGGER trg_spc_sync_worker_participant_on_assignment
    AFTER INSERT OR DELETE OR UPDATE OF worker_user_id ON booking_assignments
    FOR EACH ROW
    EXECUTE FUNCTION spc_sync_worker_participant_on_assignment();
  END IF;
END $$;

-- ============================================================
-- LEAD CONVERSIONS (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_conversions (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  lead_public_id UUID NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (email),
  UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_converted_at
  ON lead_conversions (converted_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_user
  ON lead_conversions (user_id, converted_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NULL,
  booking_id BIGINT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_public_id UUID NULL,
  message_id BIGINT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_booking
  ON notifications (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_message_id
  ON notifications (message_id);

-- ============================================================
-- AVAILABILITY BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_blocks (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'business',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'manual',
  reason TEXT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT availability_blocks_public_id_unique UNIQUE (public_id),
  CONSTRAINT availability_blocks_scope_check CHECK (scope IN ('business')),
  CONSTRAINT availability_blocks_block_type_check CHECK (
    block_type IN ('manual', 'closed', 'holiday', 'travel_buffer', 'time_off')
  ),
  CONSTRAINT availability_blocks_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_starts_at
  ON availability_blocks (starts_at);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_ends_at
  ON availability_blocks (ends_at);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_scope_time
  ON availability_blocks (scope, starts_at, ends_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_availability_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_availability_blocks_updated_at
    BEFORE UPDATE ON availability_blocks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- EMAIL VERIFICATION CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id
  ON email_verification_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at
  ON email_verification_codes(expires_at);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

-- ============================================================
-- PASSWORD HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS user_password_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id_created_at
  ON user_password_history(user_id, created_at DESC);

-- ============================================================
-- EMPLOYEE INVITES
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_invites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invited_role TEXT NOT NULL CHECK (invited_role IN ('superuser', 'admin', 'worker')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_invites_user_id
  ON employee_invites(user_id);

CREATE INDEX IF NOT EXISTS idx_employee_invites_expires_at
  ON employee_invites(expires_at);

-- ============================================================
-- SITE ACCESS METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS site_access_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT NULL,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NULL REFERENCES sessions(id) ON DELETE SET NULL,
  ip INET NULL,
  ip_hash BYTEA NOT NULL,
  user_agent TEXT NULL,
  referer TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_site_access_events_time
  ON site_access_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_access_events_path_time
  ON site_access_events (path, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_access_events_user_time
  ON site_access_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_access_events_iphash_time
  ON site_access_events (ip_hash, occurred_at DESC);

CREATE TABLE IF NOT EXISTS site_unique_visitors_daily (
  day DATE NOT NULL,
  ip_hash BYTEA NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_site_unique_visitors_daily_day
  ON site_unique_visitors_daily (day);

-- ============================================================
-- ONE-TIME BOOKING SURVEY
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_survey_responses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id BIGINT NULL REFERENCES bookings(id) ON DELETE SET NULL,
  heard_from TEXT NOT NULL,
  referrer_name TEXT NULL,
  other_text TEXT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_survey_heard_from_chk'
  ) THEN
    ALTER TABLE booking_survey_responses
      ADD CONSTRAINT booking_survey_heard_from_chk
      CHECK (heard_from IN ('facebook', 'instagram', 'google', 'linkedin', 'referral', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_survey_referrer_required_chk'
  ) THEN
    ALTER TABLE booking_survey_responses
      ADD CONSTRAINT booking_survey_referrer_required_chk
      CHECK (
        (heard_from <> 'referral')
        OR (referrer_name IS NOT NULL AND length(btrim(referrer_name)) > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_survey_other_required_chk'
  ) THEN
    ALTER TABLE booking_survey_responses
      ADD CONSTRAINT booking_survey_other_required_chk
      CHECK (
        (heard_from <> 'other')
        OR (other_text IS NOT NULL AND length(btrim(other_text)) > 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_survey_heard_from
  ON booking_survey_responses (heard_from);

CREATE INDEX IF NOT EXISTS idx_booking_survey_heard_from_time
  ON booking_survey_responses (heard_from, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_survey_submitted_at
  ON booking_survey_responses (submitted_at DESC);

-- ============================================================
-- LEAD SURVEY RESPONSES (unauthenticated / public booking guests)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_survey_responses (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
  booking_id BIGINT NULL REFERENCES bookings(id) ON DELETE SET NULL,
  heard_from TEXT NOT NULL,
  referrer_name TEXT NULL,
  other_text TEXT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

DO $$
BEGIN
  -- Add yelp to survey_sources
  INSERT INTO survey_sources (code, label, sort_order)
  VALUES ('yelp', 'Yelp', 35)
  ON CONFLICT DO NOTHING;

  -- Expand heard_from constraint on booking_survey_responses to include yelp
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_survey_heard_from_chk'
  ) THEN
    ALTER TABLE booking_survey_responses DROP CONSTRAINT booking_survey_heard_from_chk;
  END IF;
  ALTER TABLE booking_survey_responses
    ADD CONSTRAINT booking_survey_heard_from_chk
    CHECK (heard_from IN ('facebook', 'instagram', 'google', 'linkedin', 'yelp', 'referral', 'other'));

  -- Constraints for lead_survey_responses
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_survey_heard_from_chk'
  ) THEN
    ALTER TABLE lead_survey_responses
      ADD CONSTRAINT lead_survey_heard_from_chk
      CHECK (heard_from IN ('facebook', 'instagram', 'google', 'linkedin', 'yelp', 'referral', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_survey_referrer_required_chk'
  ) THEN
    ALTER TABLE lead_survey_responses
      ADD CONSTRAINT lead_survey_referrer_required_chk
      CHECK (
        (heard_from <> 'referral')
        OR (referrer_name IS NOT NULL AND length(btrim(referrer_name)) > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_survey_other_required_chk'
  ) THEN
    ALTER TABLE lead_survey_responses
      ADD CONSTRAINT lead_survey_other_required_chk
      CHECK (
        (heard_from <> 'other')
        OR (other_text IS NOT NULL AND length(btrim(other_text)) > 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_survey_heard_from
  ON lead_survey_responses (heard_from);

CREATE INDEX IF NOT EXISTS idx_lead_survey_submitted_at
  ON lead_survey_responses (submitted_at DESC);

COMMIT;


-- ============================================================
-- CUSTOMER TAGS (CRM tagging for users + leads)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_tags (
  id BIGSERIAL PRIMARY KEY,

  -- distinguishes whether this is a registered user or a lead
  kind TEXT NOT NULL
    CHECK (kind IN ('registered', 'lead')),

  -- references either users.id or leads.id depending on kind
  entity_id BIGINT NOT NULL,

  tag TEXT NULL,
  note TEXT NULL,

  updated_by_user_id BIGINT NULL
    REFERENCES users(id)
    ON DELETE SET NULL,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (kind, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_kind_entity
  ON customer_tags (kind, entity_id);

CREATE INDEX IF NOT EXISTS idx_customer_tags_updated_at
  ON customer_tags (updated_at DESC);

-- ============================================================
-- Lead Invites
-- ============================================================  
CREATE TABLE IF NOT EXISTS lead_account_invites (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  sent_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_account_invites_lead_id
  ON lead_account_invites(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_account_invites_expires_at
  ON lead_account_invites(expires_at);
-- ============================================================
-- LOGIN ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT NOT NULL,
  ip INET NULL,
  user_agent TEXT NULL,
  reason TEXT NOT NULL, -- 'user_not_found' | 'wrong_password'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at
  ON login_attempts (created_at DESC);

-- ============================================================
-- ADMIN AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NULL,
  target_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_time
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action, created_at DESC);