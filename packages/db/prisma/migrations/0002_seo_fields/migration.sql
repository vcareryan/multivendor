-- SEO fields for store settings (Google Search Console verification + meta)
ALTER TABLE "store_settings" ADD COLUMN "metaKeywords" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "googleSiteVerification" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;
