-- ============================================================
-- Solar CRM MVP — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Departments ──────────────────────────────────────────────
CREATE TABLE departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name) VALUES
  ('Customer Service'),
  ('Service Team'),
  ('Document Staff'),
  ('Management');

-- ── Users ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'admin', 'manager', 'customer_service',
  'document_staff', 'service_team', 'technician', 'viewer'
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer_service',
  department_id INT REFERENCES departments(id),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Customers ────────────────────────────────────────────────
CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  phone      VARCHAR(30)  NOT NULL,
  phone2     VARCHAR(30),
  email      VARCHAR(255),
  line_id    VARCHAR(100),
  company    VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sites (Installation Locations) ──────────────────────────
CREATE TABLE sites (
  id                SERIAL PRIMARY KEY,
  customer_id       INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address           TEXT NOT NULL,
  system_size_kw    DECIMAL(8,2),
  inverter_brand    VARCHAR(100),
  inverter_serial   VARCHAR(200),
  panel_brand       VARCHAR(100),
  installation_date DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ticket Categories ────────────────────────────────────────
CREATE TABLE ticket_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  sla_hours   INT NOT NULL DEFAULT 48,
  description TEXT
);

INSERT INTO ticket_categories (name, sla_hours) VALUES
  ('งานแจ้งซ่อม',          48),
  ('ระบบหยุดผลิตไฟ',       8),
  ('งานเอกสาร',            72),
  ('งานเคลม',              72),
  ('ตรวจสอบระบบ',          120),
  ('ติดตามหลังติดตั้ง',    120),
  ('งานร้องเรียน',         24),
  ('งานอื่นๆ',             120);

-- ── Tickets ──────────────────────────────────────────────────
CREATE TYPE ticket_status   AS ENUM ('new','assigned','in_progress','waiting','done','closed','cancelled');
CREATE TYPE ticket_priority AS ENUM ('low','medium','high','critical');

CREATE TABLE tickets (
  id              SERIAL PRIMARY KEY,
  ticket_number   VARCHAR(20) UNIQUE NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  category_id     INT NOT NULL REFERENCES ticket_categories(id),
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  status          ticket_status   NOT NULL DEFAULT 'new',

  -- Customer & Site
  customer_id     INT NOT NULL REFERENCES customers(id),
  site_id         INT REFERENCES sites(id),

  -- Assignment
  owner_id        INT REFERENCES users(id),
  department_id   INT REFERENCES departments(id),
  assigned_by     INT REFERENCES users(id),
  assigned_at     TIMESTAMPTZ,

  -- Timeline
  due_date        DATE NOT NULL,
  sla_deadline    TIMESTAMPTZ NOT NULL,
  is_overdue      BOOLEAN GENERATED ALWAYS AS (
                    status NOT IN ('closed','cancelled') AND
                    NOW() > sla_deadline
                  ) STORED,

  -- Completion
  waiting_reason  TEXT,
  waiting_eta     DATE,
  done_note       TEXT,
  closed_by       INT REFERENCES users(id),
  customer_satisfaction SMALLINT CHECK (customer_satisfaction BETWEEN 1 AND 5),
  internal_note   TEXT,

  -- Audit
  created_by      INT NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status     ON tickets(status);
CREATE INDEX idx_tickets_owner      ON tickets(owner_id);
CREATE INDEX idx_tickets_customer   ON tickets(customer_id);
CREATE INDEX idx_tickets_due_date   ON tickets(due_date);
CREATE INDEX idx_tickets_is_overdue ON tickets(is_overdue);

-- ── Ticket Comments ──────────────────────────────────────────
CREATE TABLE ticket_comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ticket Attachments ───────────────────────────────────────
CREATE TABLE ticket_attachments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id  INT REFERENCES ticket_comments(id),
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  file_size   INT,
  mime_type   VARCHAR(100),
  uploaded_by INT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ticket Logs (Immutable Audit Trail) ─────────────────────
CREATE TABLE ticket_logs (
  id           SERIAL PRIMARY KEY,
  ticket_id    INT NOT NULL REFERENCES tickets(id),
  event_type   VARCHAR(50) NOT NULL,
  old_value    JSONB,
  new_value    JSONB,
  performed_by INT REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- Prevent delete/update on logs
CREATE RULE no_delete_ticket_logs AS ON DELETE TO ticket_logs DO INSTEAD NOTHING;
CREATE RULE no_update_ticket_logs AS ON UPDATE TO ticket_logs DO INSTEAD NOTHING;

CREATE INDEX idx_ticket_logs_ticket ON ticket_logs(ticket_id);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES users(id),
  ticket_id INT REFERENCES tickets(id),
  type      VARCHAR(50) NOT NULL,
  title     VARCHAR(255) NOT NULL,
  message   TEXT NOT NULL,
  is_read   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ── Auto-update updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_updated_at  BEFORE UPDATE ON tickets  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Ticket number sequence function ─────────────────────────
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  seq INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM tickets
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ── Seed: Admin user (password: admin1234) ───────────────────
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
  ('System Admin',      'admin@solar.com',   '$2b$12$LQv3c1yqBWVHxkd0LQ1Cbe5EHQMfSi1Y6vO9Y6/eFYJ8b3Q6wLm8K', 'admin',            4),
  ('สมชาย Manager',    'manager@solar.com', '$2b$12$LQv3c1yqBWVHxkd0LQ1Cbe5EHQMfSi1Y6vO9Y6/eFYJ8b3Q6wLm8K', 'manager',          4),
  ('วิไล CS',          'cs@solar.com',      '$2b$12$LQv3c1yqBWVHxkd0LQ1Cbe5EHQMfSi1Y6vO9Y6/eFYJ8b3Q6wLm8K', 'customer_service', 1),
  ('ช่างอนุชา Tech',   'tech@solar.com',    '$2b$12$LQv3c1yqBWVHxkd0LQ1Cbe5EHQMfSi1Y6vO9Y6/eFYJ8b3Q6wLm8K', 'technician',       2);

INSERT INTO customers (name, phone, email) VALUES
  ('สมหมาย ใจดี',   '0812345678', 'sommai@example.com'),
  ('กมลา รักษ์ไทย', '0898765432', 'kamala@example.com');

INSERT INTO sites (customer_id, address, system_size_kw, inverter_brand, installation_date) VALUES
  (1, '123 หมู่ 5 ต.บ้านดี อ.เมือง จ.นครราชสีมา', 10.0, 'Huawei', '2024-01-15'),
  (2, '456 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ', 6.5, 'SMA', '2024-03-20');
