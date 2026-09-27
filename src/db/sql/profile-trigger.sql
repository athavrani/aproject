-- Auto-creates a public.profiles row whenever a new user is created in
-- Supabase's auth.users table. Not managed by Drizzle migrations because it
-- touches the auth schema; run manually against the database once, and again
-- after any change to this file.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
