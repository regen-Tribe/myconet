#!/usr/bin/env bash
# Proves who can read and write user_intake and user_food (migration 20270103000000_profile_questions.sql)
# on a throwaway local Postgres. Never touches a community's database: it makes its own cluster in a
# temp folder on 127.0.0.1, seeds fake people, checks counts and error codes, and deletes everything.
#
#   bash supabase/tests/profile-questions-boundary.sh
#
# Needs initdb, pg_ctl and psql (brew install postgresql@17). The tables the migration builds on
# (user_profiles, circles, org_units, org_unit_members) and the helpers it calls (private.my_role,
# my_lead_circles, in_circle, can_lead_circle) are copied here from the core baseline; the migration
# itself is applied from its file, unchanged, twice (it must be safe to run again).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20270103000000_profile_questions.sql"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb || echo /opt/homebrew/opt/postgresql@17/bin/initdb)")}"
# A free port, so two sessions can run checks at once
PORT="${PORT:-$(python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")}"
DIR="$(mktemp -d)"
export LC_ALL=C   # Postgres refuses to start with a locale the machine does not have
export PGOPTIONS="-c client_min_messages=warning"
export PGHOST=127.0.0.1 PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres

cleanup() { "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust --locale=C -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -k $DIR" -l "$DIR/log" -w start >/dev/null

q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

# ── What Supabase and the core baseline provide ────────────────────────────────────────────────────
q <<'SQL'
create role anon nologin; create role authenticated nologin;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, private to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase gives both roles every right on new public tables; the migration has to take anon's away itself
alter default privileges in schema public grant all on tables to anon, authenticated;

create table public.user_profiles (
  id uuid primary key, username text not null, first_name text,
  role text default 'explorer' not null, lead_circles text[] default '{}' not null
);
create table public.circles (
  slug text primary key, name text not null, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.org_units (
  id uuid primary key default gen_random_uuid(), kind text not null, circle text not null, name text not null
);
create table public.org_unit_members (
  unit_id uuid not null references public.org_units (id), user_id uuid not null, role text default 'member' not null
);
create function public.touch_events_updated_at() returns trigger language plpgsql set search_path to ''
  as $$ begin new.updated_at = now(); return new; end $$;

-- Copied from the baseline and 20261124000000_meeting_pipeline.sql
create function private.my_role() returns text language sql stable security definer set search_path to ''
  as $$ select role from public.user_profiles where id = (select auth.uid()) $$;
create function private.my_lead_circles() returns text[] language sql stable security definer set search_path to ''
  as $$ select coalesce(lead_circles, '{}') from public.user_profiles where id = (select auth.uid()) $$;
create function private.can_lead_circle(p_circle text) returns boolean language sql stable security definer set search_path to ''
  as $$ select (select private.my_role()) = 'admin'
            or ((select private.my_role()) = 'circle_lead' and p_circle = any (private.my_lead_circles())) $$;
create function private.in_circle(p_circle text) returns boolean language sql stable security definer set search_path to ''
  as $$ select p_circle is not null and (
          p_circle = any (coalesce((select lead_circles from public.user_profiles where id = (select auth.uid())), '{}'))
          or exists (select 1 from public.org_unit_members m join public.org_units u on u.id = m.unit_id
                      where m.user_id = (select auth.uid()) and u.circle = p_circle)) $$;
grant execute on all functions in schema private to authenticated;
SQL

q -f "$MIGRATION"
q -f "$MIGRATION"   # safe to run again

# ── Fake people ────────────────────────────────────────────────────────────────────────────────────
OWNER=00000000-0000-0000-0000-000000000001      # explorer; the answers are theirs
MEMBER=00000000-0000-0000-0000-000000000002     # a full member in no special circle
ADMIN=00000000-0000-0000-0000-000000000003
HOST=00000000-0000-0000-0000-000000000004       # circle lead of the hosting circle
FARMLEAD=00000000-0000-0000-0000-000000000005   # circle lead of another circle
COOK=00000000-0000-0000-0000-000000000006       # a member of the kitchen circle
EXHOST=00000000-0000-0000-0000-000000000007     # hosting in lead_circles, but no longer a circle lead
q <<SQL
insert into public.circles (slug, name, duties) values
  ('hospitality', 'Hospitality', '{hosting}'), ('kitchen', 'Kitchen', '{kitchen}'), ('farming', 'Farming', '{}');
insert into public.org_units (id, kind, circle, name) values
  ('10000000-0000-0000-0000-000000000001', 'circle', 'kitchen', 'Kitchen');
insert into public.user_profiles (id, username, role, lead_circles) values
  ('$OWNER', 'fake-owner', 'explorer', '{}'), ('$MEMBER', 'fake-member', 'member', '{}'),
  ('$ADMIN', 'fake-admin', 'admin', '{}'), ('$HOST', 'fake-host', 'circle_lead', '{hospitality}'),
  ('$FARMLEAD', 'fake-farm-lead', 'circle_lead', '{farming}'), ('$COOK', 'fake-cook', 'member', '{}'),
  ('$EXHOST', 'fake-ex-host', 'member', '{hospitality}');
insert into public.org_unit_members (unit_id, user_id) values ('10000000-0000-0000-0000-000000000001', '$COOK');
SQL

# as <role> <user id or ''> <sql> → the result, or the SQLSTATE of the error
as() {
  psql -X -q -At -v VERBOSITY=sqlstate -c "set role $1" -c "select set_config('request.jwt.claim.sub', '$2', false)" -c "$3" 2>&1 \
    | grep -v "^$2\$" | sed -E 's/^ERROR: +([0-9A-Z]{5}).*/\1/' | tail -1
}
PASS=0; FAIL=0
check() { # check <what> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS + 1)); printf '  ✓ %s\n' "$1"
  else FAIL=$((FAIL + 1)); printf '  ✗ %s: expected %s, got %s\n' "$1" "$2" "$3"; fi
}
INTAKE="select count(*) from public.user_intake"
FOOD="select count(*) from public.user_food"

echo "The person writes their own answers"
check "saves their own intake" "1" "$(as authenticated "$OWNER" "with i as (insert into public.user_intake (user_id, what_brings_you, daily_work, keep_posted) values ('$OWNER', 'fake answer', 'part_time', true) returning 1) select count(*) from i")"
check "saves their own diet and allergies" "1" "$(as authenticated "$OWNER" "with i as (insert into public.user_food (user_id, diet, allergies) values ('$OWNER', '{vegan,gluten_free}', 'fake allergy') returning 1) select count(*) from i")"
check "reads their own intake" "1" "$(as authenticated "$OWNER" "$INTAKE")"
check "reads their own diet and allergies" "1" "$(as authenticated "$OWNER" "$FOOD")"
check "changes their own diet" "1" "$(as authenticated "$OWNER" "with u as (update public.user_food set diet = '{vegetarian}' returning 1) select count(*) from u")"
check "can't save answers for someone else (intake)" "42501" "$(as authenticated "$OWNER" "insert into public.user_intake (user_id) values ('$MEMBER')")"
check "can't save answers for someone else (food)" "42501" "$(as authenticated "$OWNER" "insert into public.user_food (user_id) values ('$MEMBER')")"
check "an unknown diet is refused" "23514" "$(as authenticated "$OWNER" "update public.user_food set diet = '{carnivore}'")"
check "an unknown daily work answer is refused" "23514" "$(as authenticated "$OWNER" "update public.user_intake set daily_work = 'sometimes'")"

echo "Who else reads them"
check "a member reads nobody's intake" "0" "$(as authenticated "$MEMBER" "$INTAKE")"
check "a member reads nobody's diet or allergies" "0" "$(as authenticated "$MEMBER" "$FOOD")"
check "another circle's lead reads no intake" "0" "$(as authenticated "$FARMLEAD" "$INTAKE")"
check "another circle's lead reads no diet or allergies" "0" "$(as authenticated "$FARMLEAD" "$FOOD")"
check "an admin reads intake" "1" "$(as authenticated "$ADMIN" "$INTAKE")"
check "an admin reads diet and allergies" "1" "$(as authenticated "$ADMIN" "$FOOD")"
check "the hosting circle's lead reads intake" "1" "$(as authenticated "$HOST" "$INTAKE")"
check "the hosting circle's lead reads diet and allergies" "1" "$(as authenticated "$HOST" "$FOOD")"
check "the kitchen reads diet and allergies" "1" "$(as authenticated "$COOK" "$FOOD")"
check "the kitchen reads no intake" "0" "$(as authenticated "$COOK" "$INTAKE")"
check "hosting left in lead_circles without the circle lead role reads no intake" "0" "$(as authenticated "$EXHOST" "$INTAKE")"
check "a visitor is refused intake" "42501" "$(as anon "" "$INTAKE")"
check "a visitor is refused diet and allergies" "42501" "$(as anon "" "$FOOD")"

echo "Readers can't change or delete"
for who in "$MEMBER" "$ADMIN" "$HOST" "$COOK"; do
  check "$(psql -X -q -At -c "select username from public.user_profiles where id = '$who'") changes nobody's diet" "0" \
    "$(as authenticated "$who" "with u as (update public.user_food set allergies = 'changed' returning 1) select count(*) from u")"
  check "$(psql -X -q -At -c "select username from public.user_profiles where id = '$who'") deletes nobody's intake" "0" \
    "$(as authenticated "$who" "with d as (delete from public.user_intake returning 1) select count(*) from d")"
done
check "the answers are unchanged" "fake allergy" "$(psql -X -q -At -c "select allergies from public.user_food where user_id = '$OWNER'")"

echo "Duties are what open it"
q -c "update public.circles set duties = '{}' where slug = 'kitchen'"
check "a kitchen circle without the duty reads no diet" "0" "$(as authenticated "$COOK" "$FOOD")"
q -c "update public.circles set archived_at = now() where slug = 'hospitality'"
check "an archived hosting circle's lead reads no intake" "0" "$(as authenticated "$HOST" "$INTAKE")"
check "an unknown duty is refused" "23514" "$(psql -X -q -At -v VERBOSITY=sqlstate -c "update public.circles set duties = '{finance}' where slug = 'farming'" 2>&1 | sed -E 's/^ERROR: +([0-9A-Z]{5}).*/\1/')"
check "a visitor can't call the helpers" "42501" "$(as anon "" "select private.reads_food_needs()")"

echo "Deleting the person deletes their answers"
q -c "delete from public.user_profiles where id = '$OWNER'"
check "no intake left" "0" "$(psql -X -q -At -c "$INTAKE")"
check "no diet or allergies left" "0" "$(psql -X -q -At -c "$FOOD")"

echo
echo "$PASS passed, $FAIL failed (local Postgres on 127.0.0.1:$PORT, fake people only, cluster deleted)"
[ "$FAIL" -eq 0 ]
