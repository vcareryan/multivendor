import { z } from 'zod';

/** Validates and types all environment variables at boot. Fail-fast on misconfig. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  APP_BASE_DOMAIN: z.string().default('utanstore.com'),
  SUPERADMIN_HOST: z.string().default('admin.utanstore.com'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  // Public IP of this server. Shown to store owners as the A-record target for
  // their custom domains (pointed directly here, proxy OFF). Optional: when
  // unset, the DNS instructions fall back to the CNAME method.
  SERVER_PUBLIC_IP: z.string().optional(),

  DATABASE_URL: z.string(),
  DIRECT_DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(2592000),
  COOKIE_DOMAIN: z.string().default('.utanstore.com'),

  ENCRYPTION_KEY: z.string().min(32),

  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('utanstore'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_PUBLIC_URL: z.string().default('http://localhost:9000/utanstore'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(120),

  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_RETRIES: z.coerce.number().default(5),
  OTP_RESEND_DELAY_SECONDS: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
