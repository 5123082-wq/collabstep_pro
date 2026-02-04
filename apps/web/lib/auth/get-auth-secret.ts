/**
 * Gets AUTH_SECRET from environment variables with proper validation.
 * 
 * In production runtime (NODE_ENV=production), AUTH_SECRET is strictly required
 * to prevent JWT token forgery vulnerabilities.
 * During build time or development, a fallback is used with a warning.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  
  // Next.js sets NEXT_PHASE during build process
  // This is the most reliable way to detect build-time vs runtime
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  // Check if we're in actual production runtime (not build time)
  // This applies to ANY production deployment (Vercel, Docker, VPS, etc.)
  const isProductionRuntime = 
    !isBuildTime &&
    process.env.NODE_ENV === 'production';
  
  // Require secret in ANY production runtime to prevent security vulnerabilities
  // Using a fixed fallback in production would allow JWT token forgery
  if (isProductionRuntime && !secret) {
    throw new Error(
      'AUTH_SECRET is required in production. ' +
      'Please set AUTH_SECRET or NEXTAUTH_SECRET environment variable. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  
  // In dev mode or build time, use fallback (not secure, but acceptable)
  if (!secret) {
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
    // Using a fixed fallback secret to ensure consistency across Edge/Node runtimes
    // if the environment variable is missing. Random values would break sessions.
    return 'dev-secret-do-not-use-in-production-fallback-key';
  }
  
  return secret;
}

