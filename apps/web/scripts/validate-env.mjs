#!/usr/bin/env node
/**
 * Validates required environment variables for Vercel deployment
 * This script runs during build to catch missing variables early
 */

const requiredForVercel = [
  // Add variables that are optional for local dev but required for Vercel
  // 'DATABASE_URL', // if you use DB
];

const optionalWithFallback = [
  'AUTH_SECRET', // has fallback, but should be set for production
];

const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const isVercelProduction = isVercel && (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview');

const warnings = [];
const errors = [];

// Check required variables
for (const varName of requiredForVercel) {
  if (isVercelProduction && !process.env[varName]) {
    errors.push(`❌ ${varName} is required for Vercel ${process.env.VERCEL_ENV} but is not set`);
  }
}

// Check optional variables with warnings
for (const varName of optionalWithFallback) {
  if (isVercelProduction && !process.env[varName]) {
    warnings.push(`⚠️  ${varName} is not set for Vercel ${process.env.VERCEL_ENV}. Using fallback.`);
  }
}

if (warnings.length > 0) {
  console.warn('\n[validate-env] Warnings:');
  warnings.forEach(w => console.warn(w));
}

if (errors.length > 0) {
  console.error('\n[validate-env] Errors:');
  errors.forEach(e => console.error(e));
  console.error('\n💡 Tip: Set these variables in Vercel Dashboard → Settings → Environment Variables\n');
  process.exit(1);
}

if (warnings.length === 0 && errors.length === 0 && isVercel) {
  console.log('✓ Environment variables validated');
}

