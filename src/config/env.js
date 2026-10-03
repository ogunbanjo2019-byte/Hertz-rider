import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = process.env.JWT_SECRET || '';
const requiredProduction = (name, value) => {
  if (isProduction && !value) throw new Error(`${name} must be configured in production.`);
  return value || '';
};
if (isProduction && configuredJwtSecret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? '' : '*');
if (isProduction && (corsOrigin === '*' || !/^https:\/\//.test(corsOrigin))) throw new Error('CORS_ORIGIN must be an exact HTTPS origin in production.');
const appPublicUrl = process.env.APP_PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 4000)}`;
if (isProduction && !/^https:\/\//.test(appPublicUrl)) throw new Error('APP_PUBLIC_URL must be HTTPS in production.');
const emailProvider = process.env.EMAIL_PROVIDER || 'development';
if (isProduction && !['resend', 'smtp'].includes(emailProvider)) throw new Error('EMAIL_PROVIDER must be resend or smtp in production.');
if (isProduction && emailProvider === 'resend') requiredProduction('RESEND_API_KEY', process.env.RESEND_API_KEY);
if (isProduction && emailProvider === 'smtp') ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'].forEach((name) => requiredProduction(name, process.env[name]));

export const env = {
  isProduction, port: Number(process.env.PORT || 4000), jwtSecret: configuredJwtSecret || 'development-only-secret-change-me', jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin, dailyFee: Number(process.env.DAILY_DRIVER_SUBSCRIPTION_FEE || 1500), cngUnit: process.env.DEFAULT_CNG_UNIT || 'kg',
  databaseProvider: process.env.DATABASE_PROVIDER || (process.env.NODE_ENV === 'test' ? 'memory' : 'supabase'), supabaseUrl: process.env.SUPABASE_URL || '', supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '', paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL || '',
  emailProvider, emailFrom: process.env.EMAIL_FROM || 'no-reply@switchride.local', appPublicUrl, resendApiKey: process.env.RESEND_API_KEY || '', smtpHost: process.env.SMTP_HOST || '', smtpPort: Number(process.env.SMTP_PORT || 587), smtpUser: process.env.SMTP_USER || '', smtpPassword: process.env.SMTP_PASSWORD || '', smtpSecure: process.env.SMTP_SECURE === 'true',
  storageBucket: process.env.SENSITIVE_STORAGE_BUCKET || 'sensitive-documents', signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 300), uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024),
  allowedUploadMimeTypes: (process.env.ALLOWED_UPLOAD_MIME_TYPES || 'image/jpeg,image/png,application/pdf').split(',').map((x) => x.trim()).filter(Boolean),
  otpRateLimit: Number(process.env.OTP_RATE_LIMIT || 5), resetRateLimit: Number(process.env.RESET_RATE_LIMIT || 5), identityProvider: process.env.IDENTITY_PROVIDER || '', identityProviderApiKey: process.env.IDENTITY_PROVIDER_API_KEY || '', payoutProvider: process.env.PAYOUT_PROVIDER || 'paystack', logLevel: process.env.LOG_LEVEL || 'info'
};
if (isProduction) { requiredProduction('SUPABASE_URL', env.supabaseUrl); requiredProduction('SUPABASE_SERVICE_ROLE_KEY', env.supabaseServiceRoleKey); requiredProduction('SENSITIVE_STORAGE_BUCKET', env.storageBucket); }
