"""
migrate_team_size_constraint.py
--------------------------------
Migration: relax min_team_size check constraint from >= 2 to >= 1.

PostgreSQL requires DROP + ADD to change a CHECK constraint.
Safe to run multiple times — idempotent.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"statement_cache_size": 0},  # required for PgBouncer transaction pooling
)

CONSTRAINT_NAME = "ck_team_size_consistency"
TABLE_NAME      = "club_events"

NEW_CHECK = (
    "(event_type = 'individual') OR "
    "(event_type = 'team' AND min_team_size IS NOT NULL AND max_team_size IS NOT NULL "
    "AND min_team_size >= 1 AND max_team_size >= min_team_size)"
)

async def migrate():
    async with engine.begin() as conn:

        # 1. Check current constraint definition
        # Use string interpolation for the table name cast (safe — hardcoded constant)
        check_sql = text(f"""
            SELECT pg_get_constraintdef(c.oid) AS def
            FROM   pg_constraint c
            JOIN   pg_class t ON t.oid = c.conrelid
            WHERE  c.conname = :cname
              AND  t.relname = :tname
        """)
        result = await conn.execute(check_sql, {"cname": CONSTRAINT_NAME, "tname": TABLE_NAME})
        row = result.fetchone()

        if row is None:
            print(f"⚠  Constraint '{CONSTRAINT_NAME}' not found on '{TABLE_NAME}' — adding fresh.")
        else:
            current_def = row[0]
            print(f"Current constraint definition:\n  {current_def}")
            if "min_team_size >= 1" in current_def:
                print("\n✅ Already up-to-date (min_team_size >= 1). Nothing to do.")
                return
            print("\n🔄 Old constraint detected (>= 2). Updating...")

        # 2. Drop old constraint
        await conn.execute(text(f'ALTER TABLE {TABLE_NAME} DROP CONSTRAINT IF EXISTS "{CONSTRAINT_NAME}"'))
        print(f"   ✓ Dropped: {CONSTRAINT_NAME}")

        # 3. Add updated constraint
        await conn.execute(text(f'ALTER TABLE {TABLE_NAME} ADD CONSTRAINT "{CONSTRAINT_NAME}" CHECK ({NEW_CHECK})'))
        print(f"   ✓ Added:   {CONSTRAINT_NAME}  (min_team_size >= 1)")

        print("\n✅ Migration complete successfully.")


if __name__ == "__main__":
    asyncio.run(migrate())
