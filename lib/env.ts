const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const serverOnlyEnvVars = [
  "SUPABASE_SECRET_KEY",
  "EXCHANGERATE_API_KEY",
  "RAPIDAPI_KEY",
  "KIS_APP_KEY",
  "KIS_APP_SECRET",
  "KIS_BASE_URL",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

export function validateServerEnv() {
  validateEnv();

  const missing: string[] = [];

  for (const envVar of serverOnlyEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }
}
