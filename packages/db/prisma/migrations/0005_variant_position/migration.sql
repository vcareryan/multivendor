-- Display order for product variants (e.g. S, M, L, XL / 500g, 1kg)
ALTER TABLE "product_variants" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
