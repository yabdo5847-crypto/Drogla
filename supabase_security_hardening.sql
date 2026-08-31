-- ══════════════════════════════════════════════════════════════════════════
-- DROGLA STREETWEAR — SUPABASE DATABASE SECURITY & RLS HARDENING (UPDATED)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. التأكد من وجود الأعمدة المطلوبة في الجداول
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.shipping_rates ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.order_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE IF EXISTS public.order_items ADD COLUMN IF NOT EXISTS color TEXT;

-- 2. إنشاء جدول الأدمن (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. دالة التحقق من صلاحية الأدمن من خلال الـ Database
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
    ) OR (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    );
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 4. تفعيل الحماية المشددة (Row Level Security - RLS) على جميع الجداول
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════
-- 5. تنظيف السياسات القديمة
-- ══════════════════════════════════════════════════════════════════════════

-- Products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow all for products" ON public.products;
DROP POLICY IF EXISTS "Allow select for products" ON public.products;

-- Categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all for categories" ON public.categories;

-- Shipping Rates
DROP POLICY IF EXISTS "Public can view active shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Admins have full access to shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Allow all for shipping_rates" ON public.shipping_rates;

-- Store Settings
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins have full access to store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow all for store_settings" ON public.store_settings;

-- Orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all for orders" ON public.orders;

-- Order Items
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all for order_items" ON public.order_items;

-- Admin Users
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;

-- ══════════════════════════════════════════════════════════════════════════
-- 6. تطبيق السياسات الأمنية المحددة بدقة
-- ══════════════════════════════════════════════════════════════════════════

-- ── PRODUCTS ──
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (COALESCE(active, true) = true OR public.is_admin());

CREATE POLICY "Admins have full access to products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── CATEGORIES ──
CREATE POLICY "Public can view active categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (COALESCE(active, true) = true OR public.is_admin());

CREATE POLICY "Admins have full access to categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── SHIPPING RATES ──
CREATE POLICY "Public can view active shipping rates"
ON public.shipping_rates
FOR SELECT
TO anon, authenticated
USING (COALESCE(active, true) = true OR public.is_admin());

CREATE POLICY "Admins have full access to shipping rates"
ON public.shipping_rates
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── STORE SETTINGS ──
CREATE POLICY "Public can view store settings"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (id = 1);

CREATE POLICY "Admins have full access to store settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── ORDERS ──
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can select orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all for orders" ON public.orders;

CREATE POLICY "Public can insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can select orders"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins have full access to orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── ORDER ITEMS ──
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can select order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all for order_items" ON public.order_items;

CREATE POLICY "Public can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can select order items"
ON public.order_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins have full access to order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ── ADMIN USERS ──
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ══════════════════════════════════════════════════════════════════════════
-- 7. سياسات الـ STORAGE (product-images bucket)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
CREATE POLICY "Public Access product-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Upload Proof Receipts" ON storage.objects;
CREATE POLICY "Public Upload Proof Receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'product-images' AND
    (LOWER(name) LIKE 'proof-%' OR public.is_admin())
);

DROP POLICY IF EXISTS "Admin Full Storage Access" ON storage.objects;
CREATE POLICY "Admin Full Storage Access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- ══════════════════════════════════════════════════════════════════════════
-- 8. إضافة مستخدم كـ Admin (قم بتمرير الإيميل الخاي بك)
-- ══════════════════════════════════════════════════════════════════════════
-- شغّل هذا الكويري في Supabase SQL Editor لإعطاء صلاحية الأدمن للحساب:

INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'yabdo5847@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

