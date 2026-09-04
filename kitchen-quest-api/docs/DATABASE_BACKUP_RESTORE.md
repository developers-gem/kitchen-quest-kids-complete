# Database Backup & Restore

FIXED (production readiness audit, finding E4): no backup/restore
procedure was documented or automated anywhere in this project. This is
a documented procedure using MongoDB's own standard tooling
(`mongodump`/`mongorestore`) -- it has not been run against a live
database in this environment (no MongoDB server is available in this
sandbox), so treat the exact commands as a verified-correct starting
point to test against your real deployment target, not as something
already exercised end-to-end here.

## Backup

```bash
# Full database dump, compressed, timestamped.
mongodump \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="kqk-backup-$(date +%Y%m%d-%H%M%S).gz"
```

Recommended cadence for launch: **daily automated backups, retained for
30 days**, plus a manual backup immediately before any schema-affecting
deploy or admin bulk-data operation. Automate via a scheduled job (a
cron-triggered container, a managed database provider's built-in backup
feature, or a CI scheduled workflow) that also uploads the resulting
archive to object storage (S3 or equivalent) -- a backup that only lives
on the same host as the database it backs up doesn't protect against a
host-level failure.

## Restore

```bash
# Restore into a fresh database -- never directly onto a live one you
# still need, in case something goes wrong partway through.
mongorestore \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="kqk-backup-20260901-030000.gz" \
  --drop
```

`--drop` removes existing collections before restoring their contents --
appropriate for a disaster-recovery restore into an empty/broken
database, **not** appropriate for restoring a single collection
alongside data you want to keep. For a partial restore, use
`--nsInclude=kitchen_quest.<collectionName>` instead of `--drop`.

## What to actually test before launch (not yet done)

1. **Run a real backup against a real deployed instance** and confirm
   the resulting archive is non-empty and restorable -- this document
   describes the correct commands but the procedure itself has not been
   exercised against a live database anywhere in this project yet.
2. **Time a full restore** against a database of realistic size, so the
   actual recovery-time expectation is a measured number, not a guess.
3. **Verify the backup archive itself is encrypted at rest** wherever it
   ends up stored (most object-storage providers offer this as a
   bucket-level setting) -- a database backup contains everything a
   production database breach would expose, including hashed passwords
   and PII for children's accounts, and deserves the same protection as
   the live database.
4. Decide and document a concrete retention policy consistent with the
   product's privacy policy and COPPA obligations (children's data
   shouldn't be retained in backups indefinitely just because backups are
   easy to keep forever).
