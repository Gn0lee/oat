#!/usr/bin/env python3
"""Two-session reclassify request races for issue #444.

Run only against the isolated scratch DB:
  python3 supabase/tests/ledger-reclassify-requests-concurrency.py
"""
import json
import subprocess
import time
import uuid


DB = 'oat_ledger_books_444_test'
CMD = [
    'docker', 'exec', '-i', 'supabase_db_oat', 'psql', '-X', '-qAt',
    '-U', 'supabase_admin', '-d', DB, '-v', 'ON_ERROR_STOP=1',
]


def sql(statement):
    result = subprocess.run(CMD, input=statement, text=True, capture_output=True, timeout=15)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


assert sql('select current_database()') == DB
author, requester, household, source, destination = [str(uuid.uuid4()) for _ in range(5)]


def as_actor(user):
    claims = json.dumps({'sub': user, 'role': 'authenticated'})
    return (
        f"set local role authenticated; set local request.jwt.claim.sub='{user}'; "
        f"set local request.jwt.claims='{claims}';"
    )


def session(name, user, statement):
    process = subprocess.Popen(
        CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1,
    )
    process.stdin.write(
        f"begin; set local statement_timeout='10s'; set local lock_timeout='8s'; "
        f"set application_name='{name}'; {as_actor(user)} {statement}\n"
    )
    process.stdin.flush()
    return process


def held(process, name):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if sql(
            "select count(*) from pg_stat_activity "
            f"where application_name='{name}' and state='idle in transaction'"
        ) == '1':
            return
        if process.poll() is not None:
            raise AssertionError(process.stderr.read())
        time.sleep(0.05)
    raise AssertionError('first transaction did not reach lock boundary within 5s')


def finish(process, expected_error=None):
    output, errors = process.communicate('commit;\n', timeout=12)
    if expected_error:
        assert process.returncode != 0 and expected_error in errors, (output, errors)
    else:
        assert process.returncode == 0, (output, errors)
    return output


def new_entry_and_request():
    entry = sql(
        f"begin; {as_actor(author)} select id from public.write_ledger_entry('create','{author}',"
        f"jsonb_build_object('householdId','{household}','bookId','{source}','type','expense',"
        f"'amount',10,'transactedAt','2026-10-05T09:00:00Z','title','Race')); commit;"
    ).splitlines()[-1]
    request = sql(
        f"begin; {as_actor(requester)} select id from public.create_ledger_reclassify_request("
        f"'{entry}','{destination}',(select updated_at from public.ledger_entries where id='{entry}'),null);"
        " commit;"
    ).splitlines()[-1]
    return entry, request


def race(label, first, second, expected_second_error, assertion):
    """first/second: (user, statement)."""
    name = '444_' + uuid.uuid4().hex[:12]
    one = session(name + '_a', *first)
    two = None
    try:
        held(one, name + '_a')
        two = session(name + '_b', *second)
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if sql(
                "select count(*) from pg_stat_activity "
                f"where application_name='{name}_b' and wait_event_type='Lock'"
            ) == '1':
                break
            assert two.poll() is None, two.stderr.read()
            time.sleep(0.05)
        else:
            raise AssertionError(label + ': second session never visibly waited on a lock')
        finish(one)
        output = finish(two, expected_second_error)
        sql('set plpgsql.check_asserts=on; do $$begin assert ' + assertion + '; end $$;')
        print('PASS:', label, '(observed lock wait, bounded completion)', flush=True)
        return output
    finally:
        for process in (one, two):
            if process is not None and process.poll() is None:
                process.kill()
                process.communicate(timeout=5)


def approve(request):
    return f"select status from public.resolve_ledger_reclassify_request('{request}','approved',null);"


def state(entry, request, book, status):
    return (
        f"(select book_id from public.ledger_entries where id='{entry}')='{book}' "
        f"and (select status::text from public.record_change_requests where id='{request}')='{status}'"
    )


sql(f"""begin;
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id,email) values('{author}','{author}@444-race.invalid'),('{requester}','{requester}@444-race.invalid');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id,email,name) values
('{author}','{author}@444-race.invalid','race author'),('{requester}','{requester}@444-race.invalid','race requester');
insert into public.households(id,name) values('{household}','444 reclassify races');
insert into public.household_members(household_id,user_id,role) values
('{household}','{author}','owner'),('{household}','{requester}','member');
insert into public.ledger_books(id,household_id,name,visibility,created_by) values
('{source}','{household}','Race source','shared','{author}'),
('{destination}','{household}','Race destination','shared','{author}');
commit;""")
try:
    entry, request = new_entry_and_request()
    race(
        'concurrent double approval moves once and rejects the second', (author, approve(request)),
        (author, approve(request)), 'REQUEST_NOT_PENDING', state(entry, request, destination, 'approved'),
    )

    entry, request = new_entry_and_request()
    output = race(
        'approval wins against requester cancel', (author, approve(request)),
        (requester, f"update public.record_change_requests set status='cancelled' "
                    f"where id='{request}' and status='pending' returning id;"),
        None, state(entry, request, destination, 'approved'),
    )
    assert request not in output, output

    entry, request = new_entry_and_request()
    race(
        'requester cancel wins against approval',
        (requester, f"update public.record_change_requests set status='cancelled' "
                    f"where id='{request}' and status='pending';"),
        (author, approve(request)), 'REQUEST_NOT_PENDING', state(entry, request, source, 'cancelled'),
    )

    entry, request = new_entry_and_request()
    race(
        'destination archive wins against approval',
        (author, f"select public.mutate_ledger_book('{destination}','archive');"),
        (author, approve(request)), 'REQUEST_NOT_PENDING', state(entry, request, source, 'expired'),
    )
    sql(f"begin; {as_actor(author)} select public.mutate_ledger_book('{destination}','reactivate'); commit;")

    entry, request = new_entry_and_request()
    version = sql(f"select updated_at from public.ledger_entries where id='{entry}'")
    edit = (
        f"select public.write_ledger_entry('update','{author}',"
        f"jsonb_build_object('memo','raced','expectedUpdatedAt','{version}'::timestamptz),'{entry}');"
    )
    race(
        'approval wins against stale author edit', (author, approve(request)),
        (author, edit), 'ENTRY_CHANGED', state(entry, request, destination, 'approved'),
    )

    entry, request = new_entry_and_request()
    version = sql(f"select updated_at from public.ledger_entries where id='{entry}'")
    edit = (
        f"select public.write_ledger_entry('update','{author}',"
        f"jsonb_build_object('memo','raced','expectedUpdatedAt','{version}'::timestamptz),'{entry}');"
    )
    race(
        'author edit wins against approval', (author, edit),
        (author, approve(request)), 'REQUEST_NOT_PENDING', state(entry, request, source, 'expired'),
    )
finally:
    sql(f"""begin;
delete from public.record_change_requests where household_id='{household}';
delete from public.households where id='{household}';
delete from auth.users where id in ('{author}','{requester}');
commit;""")
