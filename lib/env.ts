export const env = {
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  sessionSecret: process.env.SESSION_SECRET || "dev-session-secret",
  subToken: process.env.SUB_TOKEN || "change-this-token",
  databasePath: process.env.DATABASE_PATH || "./data/app.db",
  baseUrl: (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
};
