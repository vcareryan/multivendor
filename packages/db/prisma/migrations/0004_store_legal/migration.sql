-- Legal / policy pages (Privacy, Terms, Refund) for payment-gateway stores
ALTER TABLE "store_settings" ADD COLUMN "showPolicies" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN "privacyPolicy" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "termsConditions" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "refundPolicy" TEXT;
