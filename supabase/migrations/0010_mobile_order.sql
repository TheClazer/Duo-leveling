-- =====================================================================
-- 0010 — per-user mobile bento order (Bible §10.5 mobile long-press reorder)
-- Stored separately from `layout` so reordering the mobile stack never
-- disturbs the desktop grid. Idempotent / safe to re-run.
-- =====================================================================
alter table public.dashboard_layouts add column if not exists mobile_order text[];
