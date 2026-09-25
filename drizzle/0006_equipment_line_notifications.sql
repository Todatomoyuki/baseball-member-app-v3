-- Run once, after 0005_lineup_permissions.sql and before deploying the app and weekly Worker.
-- Existing equipment remains opted in to weekly LINE notifications.
ALTER TABLE equipment_items ADD COLUMN notify_line INTEGER NOT NULL DEFAULT 1
  CONSTRAINT equipment_items_notify_line_check CHECK (notify_line IN (0, 1));
