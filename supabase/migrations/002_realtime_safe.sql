-- Safe re-run helper: add tables to realtime only if missing
do $$
begin
  begin
    alter publication supabase_realtime add table public.if_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.if_operators;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.if_network_stats;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.if_event_counts;
  exception when duplicate_object then null;
  end;
end $$;
