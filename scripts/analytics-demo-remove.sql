-- Deletes the "Analytics demo" workspace made by scripts/analytics-demo.sql.
-- Exact id only; channels, posts, targets and readings go with it (cascade).
delete from orgs where id = 'd3d0a000-0000-4000-8000-000000000001';
