import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    url = "postgresql://postgres.jtpkznqerxzxkhufgojs:Aiclubdaiict@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

    # Convert to asyncpg
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        if not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
    # Remove the +asyncpg part for asyncpg.connect()
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)

    print("Connecting to database...")
    try:
        conn = await asyncpg.connect(url, statement_cache_size=0)
        print("Connected!")
        
        try:
            await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;")
            print("Added is_admin column to users table.")
        except Exception as e:
            print(f"Error adding column: {e}")

        # Try to set SUPER_ADMIN_EMAIL to true
        super_admin_email = os.getenv("SUPER_ADMIN_EMAIL")
        if super_admin_email:
            emails = [e.strip() for e in super_admin_email.split(",") if e.strip()]
            for email in emails:
                await conn.execute("UPDATE users SET is_admin = TRUE WHERE email = $1;", email)
                print(f"Set is_admin=TRUE for {email}")

        print("Migration complete!")
        await conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
