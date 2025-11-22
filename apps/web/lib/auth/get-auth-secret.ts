/**
 * Gets AUTH_SECRET from environment variables with proper validation.
 * 
 * In production/Vercel runtime environments, AUTH_SECRET is required.
 * During build time or development, a fallback is used with a warning.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  
  // Check if we're in production runtime (not build time)
  // During build, Next.js sets NODE_ENV=production, but we can distinguish
  // runtime by checking for VERCEL_ENV or other runtime indicators
  const isProductionRuntime = 
    (process.env.VERCEL_ENV === 'production' ||
     process.env.VERCEL_ENV === 'preview' ||
     process.env.VERCEL) &&
    process.env.NODE_ENV === 'production';
  
  // For build time or local production builds, allow fallback
  // Only require secret in actual production runtime (Vercel deployment)
  if (isProductionRuntime && !secret) {
    throw new Error(
      'AUTH_SECRET is required in production runtime. ' +
      'Please set AUTH_SECRET or NEXTAUTH_SECRET environment variable. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  
  // In dev mode or build time, use fallback (not secure, but acceptable)
  if (!secret) {
    const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL;
    if (isBuildTime) {
      console.warn(
        '⚠️  AUTH_SECRET is not set during build. Using fallback secret. ' +
        'Make sure to set AUTH_SECRET in production runtime environment!'
      );
    } else {
      console.warn(
        '⚠️  AUTH_SECRET is not set. Using fallback secret for development. ' +
        'This is NOT secure for production!'
      );
    }
    return 'dev-secret-change-in-production-' + Date.now();
  }
  
  return secret;
}

