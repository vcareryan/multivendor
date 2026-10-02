-- ─────────────────────────────────────────────────────────────────────────
-- UtanStore — Row-Level Security policies
--
-- Run this AFTER `prisma migrate deploy`, using the DIRECT (owner) connection:
--   pnpm --filter @utanstore/db rls
--
-- Model:
--   • The application connects as a NON-privileged role (utan_app) that does
--     NOT own the tables and does NOT have BYPASSRLS. RLS therefore applies to
--     every app query automatically.
--   • Per request the app sets:  SELECT set_config('app.current_tenant', $id, true);
--     inside a transaction, and the policy filters rows to that tenant.
--   • System/auth/super-admin queries set  app.bypass_rls = 'on'  (also tx-local)
--     to intentionally cross tenants (login lookups, host→tenant resolution,
--     super-admin dashboards). This is the ONLY sanctioned bypass path.
-- ─────────────────────────────────────────────────────────────────────────

-- Helper that enables RLS + a tenant-isolation policy on a table.
CREATE OR REPLACE FUNCTION apply_tenant_rls(tbl text, tenant_col text DEFAULT 'tenantId')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', tbl);
  EXECUTE format($f$
    CREATE POLICY tenant_isolation ON %1$I
    USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR %2$I = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
      current_setting('app.bypass_rls', true) = 'on'
      OR %2$I = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );
  $f$, tbl, tenant_col);
END; $$;

-- The tenant table keys on `id` (a session only sees its own store row).
SELECT apply_tenant_rls('stores', 'id');

-- All tenant-owned tables key on "tenantId".
SELECT apply_tenant_rls('users');
SELECT apply_tenant_rls('store_settings');
SELECT apply_tenant_rls('domains');
SELECT apply_tenant_rls('themes');
SELECT apply_tenant_rls('checkout_settings');
SELECT apply_tenant_rls('customer_auth_settings');
SELECT apply_tenant_rls('store_payment_settings');
SELECT apply_tenant_rls('google_auth_settings');
SELECT apply_tenant_rls('whatsapp_business_settings');
SELECT apply_tenant_rls('sms_provider_settings');
SELECT apply_tenant_rls('categories');
SELECT apply_tenant_rls('products');
SELECT apply_tenant_rls('product_images');
SELECT apply_tenant_rls('product_variants');
SELECT apply_tenant_rls('product_addons');
SELECT apply_tenant_rls('inventory_movements');
SELECT apply_tenant_rls('customers');
SELECT apply_tenant_rls('customer_identities');
SELECT apply_tenant_rls('carts');
SELECT apply_tenant_rls('orders');
SELECT apply_tenant_rls('order_items');
SELECT apply_tenant_rls('coupons');
SELECT apply_tenant_rls('delivery_areas');
SELECT apply_tenant_rls('payment_transactions');
SELECT apply_tenant_rls('otp_verifications');
SELECT apply_tenant_rls('tenant_subscriptions');
SELECT apply_tenant_rls('audit_logs');
SELECT apply_tenant_rls('whatsapp_order_logs');

-- Grant the runtime app role table privileges (DDL/ownership stays with owner).
-- Adjust the role name to match DATABASE_URL if you renamed it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'utan_app') THEN
    GRANT USAGE ON SCHEMA public TO utan_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO utan_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO utan_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO utan_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO utan_app;
  END IF;
END $$;
