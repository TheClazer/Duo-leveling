-- =====================================================================
-- Phase 3 perf — collapse the 7 layout count queries into one round trip.
-- =====================================================================

create or replace function public.get_project_summary(p_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'task_total',      (select count(*) from public.project_tasks      where project_id = p_id),
    'task_done',       (select count(*) from public.project_tasks      where project_id = p_id and status = 'done'),
    'milestone_count', (select count(*) from public.project_milestones where project_id = p_id),
    'note_count',      (select count(*) from public.project_notes      where project_id = p_id),
    'resource_count',  (select count(*) from public.project_resources  where project_id = p_id),
    'update_count',    (select count(*) from public.project_updates    where project_id = p_id),
    'total_minutes',   coalesce((select sum(minutes) from public.project_time_logs where project_id = p_id), 0)
  )
  where public.can_read_project(p_id);
$$;

grant execute on function public.get_project_summary(uuid) to authenticated;
