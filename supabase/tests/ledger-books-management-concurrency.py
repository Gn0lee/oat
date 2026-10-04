#!/usr/bin/env python3
"""Two-session ledger book management races for issue #441.

Run only against the isolated scratch DB:
  python3 supabase/tests/ledger-books-management-concurrency.py
"""
import json
import subprocess
import time
import uuid


CMD = [
    'docker', 'exec', '-i', 'supabase_db_oat', 'psql', '-X', '-qAt',
    '-U', 'supabase_admin', '-d', 'oat_ledger_books_440_test',
    '-v', 'ON_ERROR_STOP=1',
]


def sql(statement):
    result = subprocess.run(CMD, input=statement, text=True, capture_output=True, timeout=15)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


assert sql('select current_database()') == 'oat_ledger_books_440_test'
owner, household, delete_first, insert_first, switch_archive, switch_delete, archive_switch = [
    str(uuid.uuid4()) for _ in range(7)
]
claims = json.dumps({'sub': owner, 'role': 'authenticated'})
actor = (
    f"set local role authenticated; set local request.jwt.claim.sub='{owner}'; "
    f"set local request.jwt.claims='{claims}';"
)


def session(name, statement):
    process = subprocess.Popen(
        CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1,
    )
    process.stdin.write(
        f"begin; set local statement_timeout='10s'; set local lock_timeout='8s'; "
        f"set application_name='{name}'; {actor} {statement}\n"
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


def insert_entry(book):
    return (
        "insert into public.ledger_entries "
        "(household_id, owner_id, book_id, type, amount, transacted_at, is_shared) values "
        f"('{household}','{owner}','{book}','expense',1,now(),true);"
    )


def race(label, book, first_statement, second_statement, expected_second_error, assertion):
    name = '441_' + uuid.uuid4().hex[:12]
    one = session(name + '_a', first_statement)
    two = None
    try:
        held(one, name + '_a')
        two = session(name + '_b', second_statement)
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
            raise AssertionError(label + ': second writer never visibly waited on a lock')
        finish(one)
        finish(two, expected_second_error)
        sql('set plpgsql.check_asserts=on; do $$begin assert ' + assertion + '; end $$;')
        print('PASS:', label, '(observed lock wait, bounded completion)', flush=True)
    finally:
        for process in (one, two):
            if process is not None and process.poll() is None:
                process.kill()
                process.communicate(timeout=5)


sql(f"""begin;
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id,email) values('{owner}','{owner}@441-book-race.invalid');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id,email,name) values('{owner}','{owner}@441-book-race.invalid','race owner');
insert into public.households(id,name) values('{household}','441 book management races');
insert into public.household_members(household_id,user_id,role) values('{household}','{owner}','owner');
insert into public.ledger_books(id,household_id,name,visibility,created_by) values
('{delete_first}','{household}','Delete first','shared','{owner}'),
('{insert_first}','{household}','Insert first','shared','{owner}'),
('{switch_archive}','{household}','Switch archive','shared','{owner}'),
('{switch_delete}','{household}','Switch delete','shared','{owner}'),
('{archive_switch}','{household}','Archive switch','shared','{owner}');
commit;""")
try:
    race(
        'delete wins against first direct entry insert', delete_first,
        f"select public.mutate_ledger_book('{delete_first}','delete');",
        insert_entry(delete_first), 'BOOK_UNAVAILABLE',
        f"not exists(select 1 from public.ledger_books where id='{delete_first}') "
        f"and not exists(select 1 from public.ledger_entries where book_id='{delete_first}')",
    )
    race(
        'entry insert wins against empty-book delete', insert_first,
        insert_entry(insert_first),
        f"select public.mutate_ledger_book('{insert_first}','delete');",
        'BOOK_NOT_EMPTY',
        f"exists(select 1 from public.ledger_books where id='{insert_first}') "
        f"and (select count(*)=1 and bool_and(owner_id='{owner}' and amount=1 and title is null) "
        f"from public.ledger_entries where book_id='{insert_first}')",
    )
    exactly_one_active_default = (
        f"(select count(*)=1 and bool_and(visibility='shared' and archived_at is null) "
        f"from public.ledger_books where household_id='{household}' and is_default)"
    )
    race(
        'default switch wins against archive', switch_archive,
        f"select public.make_default_ledger_book('{switch_archive}');",
        f"select public.mutate_ledger_book('{switch_archive}','archive');",
        'BOOK_DEFAULT_REQUIRED',
        exactly_one_active_default +
        f" and exists(select 1 from public.ledger_books where id='{switch_archive}' and is_default and archived_at is null)",
    )
    race(
        'default switch wins against delete', switch_delete,
        f"select public.make_default_ledger_book('{switch_delete}');",
        f"select public.mutate_ledger_book('{switch_delete}','delete');",
        'BOOK_DEFAULT_REQUIRED',
        exactly_one_active_default +
        f" and exists(select 1 from public.ledger_books where id='{switch_delete}' and is_default and archived_at is null)",
    )
    race(
        'archive wins against default switch', archive_switch,
        f"select public.mutate_ledger_book('{archive_switch}','archive');",
        f"select public.make_default_ledger_book('{archive_switch}');",
        'BOOK_ARCHIVED',
        exactly_one_active_default +
        f" and exists(select 1 from public.ledger_books where id='{archive_switch}' and not is_default and archived_at is not null)",
    )
finally:
    sql(f"""begin;
delete from public.households where id='{household}';
delete from auth.users where id='{owner}';
commit;""")
