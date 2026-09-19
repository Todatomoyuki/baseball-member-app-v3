declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TEAM_BOOTSTRAP_PASSWORD?: string;
    AUTH_PEPPER?: string;
  }
}
