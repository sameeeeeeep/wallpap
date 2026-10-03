-- Only aggregate dimensions. No raw requests or IP/identity columns.
CREATE TABLE IF NOT EXISTS daily_counts (
  day TEXT NOT NULL,
  app_version TEXT NOT NULL,
  event TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (day, app_version, event)
) WITHOUT ROWID;
