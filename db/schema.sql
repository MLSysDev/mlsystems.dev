-- D1 schema for the per-post like counter.
-- Apply with:  npx wrangler d1 execute mlsystems --remote --file=db/schema.sql
CREATE TABLE IF NOT EXISTS likes (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
