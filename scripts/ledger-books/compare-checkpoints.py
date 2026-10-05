#!/usr/bin/env python3
"""Compare two checkpoint.sql captures (JSON lines) from the #440 migration.

Usage: compare-checkpoints.py BEFORE.jsonl AFTER.jsonl [EXPECTED_CHANGES.txt]

Reads local files only and prints counts, relation names, row IDs and changed
field names, never row contents, so the output can go into the release record.
Every baseline row must survive unchanged except rows that legitimate
concurrent writes touched. List those as "relation id" lines in
EXPECTED_CHANGES.txt, built from the audit/WAL evidence (see the runbook).
Exit code 1 means an unexplained difference: stop the release.
"""

import json
import sys
from collections import Counter


def load(path):
    rows = {}
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if not line.startswith("{"):
                continue  # psql command tags if -q was forgotten
            item = json.loads(line)
            row = item["row"]
            key = (item["relation"], row.get("id") or json.dumps(row, sort_keys=True))
            if key in rows:
                sys.exit(f"duplicate row in {path}: {key[0]} {key[1]}")
            rows[key] = row
    return rows


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    before, after = load(sys.argv[1]), load(sys.argv[2])
    expected = set()
    if len(sys.argv) == 4:
        with open(sys.argv[3], encoding="utf-8") as handle:
            expected = {tuple(line.split()) for line in handle if line.strip()}

    missing = [k for k in before if k not in after]
    changed = [k for k in before if k in after and before[k] != after[k]]
    added = [k for k in after if k not in before]
    unexplained = [k for k in missing + changed + added if k not in expected]

    print(f"baseline rows: {len(before)}, after rows: {len(after)}")
    print(f"missing: {len(missing)}, changed: {len(changed)}, added: {len(added)}")
    print("added by relation:", dict(Counter(k[0] for k in added)))
    for key in changed:
        fields = sorted(f for f in before[key] if before[key][f] != after[key].get(f))
        print(f"changed {key[0]} {key[1]}: {', '.join(fields)}")
    for key in missing:
        print(f"missing {key[0]} {key[1]}")
    if unexplained:
        print(f"UNEXPLAINED: {len(unexplained)}")
        for key in unexplained:
            print(f"  {key[0]} {key[1]}")
        sys.exit(1)
    print("OK: every difference is listed in the expected changes")


if __name__ == "__main__":
    main()
