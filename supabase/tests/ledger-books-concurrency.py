#!/usr/bin/env python3
"""Scratch-only two-session checks. Run: python3 supabase/tests/ledger-books-concurrency.py"""
import json
import subprocess
import time
import uuid

CMD = ['docker', 'exec', '-i', 'supabase_db_oat', 'psql', '-X', '-qAt', '-U',
       'supabase_admin', '-d', 'oat_ledger_books_440_test', '-v', 'ON_ERROR_STOP=1']


def sql(statement):
    result = subprocess.run(CMD, input=statement, text=True, capture_output=True, timeout=15)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


assert sql('select current_database()') == 'oat_ledger_books_440_test'
owner, household, a, b, swap1, swap2 = [str(uuid.uuid4()) for _ in range(6)]
claims = json.dumps({'sub': owner, 'role': 'authenticated'})
actor = f"set local role authenticated; set local request.jwt.claim.sub='{owner}'; set local request.jwt.claims='{claims}';"


def write(kind, amount, source=None, target=None, personal=False):
    payload = {'householdId': household, 'type': kind, 'amount': amount,
               'transactedAt': '2026-01-01Z', 'isShared': not personal}
    if source:
        payload['fromAccountId'] = source
    if target:
        payload['toAccountId'] = target
    return f"select public.write_ledger_entry('create','{owner}','{json.dumps(payload)}');"


def session(name, statement):
    process = subprocess.Popen(CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, bufsize=1)
    process.stdin.write(f"begin; set local statement_timeout='10s'; set local lock_timeout='8s'; set application_name='{name}'; {actor} {statement}\n")
    process.stdin.flush()
    return process


def held(process, name):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if sql(f"select count(*) from pg_stat_activity where application_name='{name}' and state='idle in transaction'") == '1':
            return
        if process.poll() is not None:
            raise AssertionError(process.stderr.read())
        time.sleep(0.05)
    raise AssertionError('first transaction did not reach lock boundary within 5s')


def finish(process, error=None):
    output, errors = process.communicate('commit;\n', timeout=12)
    if error:
        assert process.returncode != 0 and error in errors, (output, errors)
    else:
        assert process.returncode == 0, (output, errors)


def race(label, first, second, assertion, error=None):
    name = '440_' + uuid.uuid4().hex[:12]
    one = session(name + '_a', first)
    two = None
    try:
        held(one, name + '_a')
        two = session(name + '_b', second)
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if sql(f"select count(*) from pg_stat_activity where application_name='{name}_b' and wait_event_type='Lock'") == '1':
                break
            assert two.poll() is None, two.stderr.read()
            time.sleep(0.05)
        else:
            raise AssertionError(label + ': second writer never visibly waited on a lock')
        finish(one)
        finish(two, error)
        sql("set plpgsql.check_asserts=on; do $$begin assert " + assertion + "; end $$;")
        print('PASS:', label, '(observed lock wait, bounded completion)', flush=True)
    finally:
        for process in (one, two):
            if process is not None and process.poll() is None:
                process.kill()
                process.communicate(timeout=5)


sql(f"""begin;
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id,email) values('{owner}','{owner}@440-concurrency.invalid');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id,email,name) values('{owner}','{owner}@440-concurrency.invalid','concurrency');
insert into public.households(id,name) values('{household}','440 concurrency');
insert into public.household_members(household_id,user_id,role) values('{household}','{owner}','owner');
insert into public.accounts(id,household_id,owner_id,name,balance) values
('{a}','{household}','{owner}','a',100),('{b}','{household}','{owner}','b',100);
insert into public.ledger_books(id,household_id,name,visibility,created_by) values
('{swap1}','{household}','swap1','shared','{owner}'),('{swap2}','{household}','swap2','shared','{owner}');
commit;""")
try:
    legacy = f"insert into public.ledger_entries(household_id,owner_id,type,amount,transacted_at,is_shared) values('{household}','{owner}','expense',1,now(),false);"
    race('legacy personal one-time seed', legacy, legacy,
         f"(select count(*)=1 from public.ledger_books where household_id='{household}' and visibility='personal' and name='개인 생활비') and (select count(*)=2 and count(distinct book_id)=1 from public.ledger_entries where household_id='{household}')")
    race('default swaps exactly one', f"select public.make_default_ledger_book('{swap1}');",
         f"select public.make_default_ledger_book('{swap2}');",
         f"(select count(*)=1 and bool_and(id='{swap2}' and archived_at is null and visibility='shared') from public.ledger_books where household_id='{household}' and is_default)")
    race('concurrent account deltas', write('expense', 10, source=a), write('income', 20, target=a),
         f"(select balance=110 from public.accounts where id='{a}')")
    race('opposing transfer endpoints', write('transfer', 7, source=a, target=b), write('transfer', 3, source=b, target=a),
         f"(select balance=106 from public.accounts where id='{a}') and (select balance=104 from public.accounts where id='{b}')")
    archive = f"update public.ledger_books set archived_at=now() where household_id='{household}' and visibility='personal';"
    count = sql(f"select count(*) from public.ledger_entries where household_id='{household}'")
    race('archive wins against entry write', archive, write('expense', 10, source=a, personal=True),
         f"(select count(*)={count} from public.ledger_entries where household_id='{household}') and (select balance=106 from public.accounts where id='{a}')", 'LEDGER_BOOK_ARCHIVED')
    sql(f"begin; {actor} update public.ledger_books set archived_at=null where household_id='{household}' and visibility='personal'; commit;")
    race('entry write wins before archive', write('expense', 10, source=a, personal=True), archive,
         f"(select count(*)={int(count)+1} from public.ledger_entries where household_id='{household}') and (select balance=96 from public.accounts where id='{a}')")
finally:
    sql(f"""begin;
    update public.ledger_books set archived_at=null where household_id='{household}';
    delete from public.ledger_entries where household_id='{household}';
    delete from public.households where id='{household}';
    delete from auth.users where id='{owner}'; commit;""")
