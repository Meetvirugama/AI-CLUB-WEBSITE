import asyncio
import csv
import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from members.models import ClubMember
from projects.models import ClubProject
from db import async_session

CSV_PATH = "../Details For AI Club Website.csv"

def clean_na(val):
    v = val.strip()
    if v.lower() in ["n/a", "na", "0", "none", ""]:
        return None
    return v

def clean_github(val):
    val = clean_na(val)
    if val and not val.startswith("http"):
        if "/" not in val:
            val = f"https://github.com/{val}"
    return val

def format_drive_link(val):
    val = clean_na(val)
    if not val:
        return None
    match = re.search(r'(?:id=|\/d\/|src=)([a-zA-Z0-9_-]{25,})', val)
    if match:
        file_id = match.group(1)
        return f"https://lh3.googleusercontent.com/d/{file_id}"
    return val

async def main():
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        async with async_session() as session:
            for row in reader:
                name = row.get("Name", "").strip()
                if not name:
                    continue
                
                print(f"Processing: {name}")
                
                github = clean_github(row.get("Github Profile/link", ""))
                linkedin = clean_na(row.get("Linkedin Profile/link", ""))
                photo = format_drive_link(row.get("Passport size photo", ""))
                
                desc_parts = []
                extra = clean_na(row.get("Anything Extra You want to add about yourself in club website", ""))
                if extra: desc_parts.append(extra)
                    
                intern = clean_na(row.get("Have you Done any Intership Before?", ""))
                intern_det = clean_na(row.get("If Yes Specify what was Your Role there and a brief Info about Internship", ""))
                if intern and intern.lower() != "no":
                    desc_parts.append(f"Internship: {intern_det}" if intern_det else f"Internship: {intern}")
                
                hack = clean_na(row.get("Have You Attended Any Hackthon And Won it?", ""))
                if hack and "not attended" not in hack.lower():
                    desc_parts.append(f"Hackathons: {hack}")
                    
                events = clean_na(row.get("Events Attended during academic year 2025-2026", ""))
                if events and events != "0":
                    desc_parts.append(f"Events Attended: {events.replace(';', ', ')}")
                
                blog = clean_na(row.get("Any Blog link (if you want to post on website)", ""))
                if blog: desc_parts.append(f"Blog: {blog}")
                    
                description = "\n\n".join(desc_parts) if desc_parts else None
                
                stmt = select(ClubMember).where(ClubMember.name == name)
                result = await session.execute(stmt)
                member = result.scalar_one_or_none()
                
                if not member:
                    member = ClubMember(
                        name=name,
                        role="Member",
                        github=github,
                        linkedin=linkedin,
                        photo=photo,
                        description=description
                    )
                    session.add(member)
                    await session.flush()
                    print(f"  -> Added member {name} with ID {member.id}")
                else:
                    print(f"  -> Member {name} already exists.")
                    
                proj_names = clean_na(row.get("Name of AI/ML Projects (Write Name of Project Similar to the Name Published on Github)(if No Projects Write N/A)", ""))
                proj_descs = clean_na(row.get("Description of Projects (if 0 Projects then write NA)", ""))
                
                if proj_names:
                    pass
                    # title = proj_names
                    # if len(title) > 250:
                    #     title = title[:247] + "..."
                        
                    # stmt_proj = select(ClubProject).where(ClubProject.author_id == member.id, ClubProject.title == title)
                    # res_proj = await session.execute(stmt_proj)
                    # if res_proj.scalar_one_or_none() is None:
                    #     project = ClubProject(
                    #         title=title,
                    #         author=member.name,
                    #         author_id=member.id,
                    #         description=proj_descs or "No description provided.",
                    #         github_link=github or ""
                    #     )
                    #     session.add(project)
                    #     print(f"  -> Added project: {title[:30]}...")
                    
            await session.commit()
            print("Successfully committed to DB.")

if __name__ == "__main__":
    asyncio.run(main())
