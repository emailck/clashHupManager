const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
const shouldEnforceSecrets = isProduction && !isProductionBuild;

const insecureDefaults = new Set([
  "admin",
  "change-me",
  "dev-session-secret",
  "replace-with-a-long-random-string",
  "change-this-token",
  "replace-with-a-random-token",
]);

function readSecret(name: string, fallback: string, minLength: number) {
  const value = process.env[name] || (!shouldEnforceSecrets ? fallback : "");
  if (shouldEnforceSecrets) {
    if (!value) throw new Error(`${name} must be set in production.`);
    if (value.length < minLength) throw new Error(`${name} must be at least ${minLength} characters in production.`);
    if (insecureDefaults.has(value)) throw new Error(`${name} uses an insecure default value.`);
  }
  return value;
}

const adminPassword = readSecret("ADMIN_PASSWORD", "admin", 12);
const sessionSecret = readSecret("SESSION_SECRET", "dev-session-secret", 32);
const subToken = readSecret("SUB_TOKEN", "change-this-token", 24);

if (shouldEnforceSecrets && (adminPassword === sessionSecret || adminPassword === subToken || sessionSecret === subToken)) {
  throw new Error("ADMIN_PASSWORD, SESSION_SECRET and SUB_TOKEN must be distinct values in production.");
}

export const env = {
  adminPassword,
  sessionSecret,
  subToken,
  databasePath: process.env.DATABASE_PATH || "./data/app.db",
  baseUrl: (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
};
