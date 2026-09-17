// src/components/MemberCard.tsx
// Drop-in card component for the Members section.
// Uses the members[] array from src/data/members.ts

import { Member } from "./club/Team";

interface MemberCardProps {
  member: Member;
}

export default function MemberCard({ member }: MemberCardProps) {
  return (
    <div className="member-card">
      {/* Photo */}
      <div className="member-photo-wrapper">
        {member.photo ? (
          <img src={member.photo} alt={member.name} className="member-photo" />
        ) : (
          <div className="member-photo-placeholder">
            {member.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="member-name">{member.name}</h3>

      {/* Social Links */}
      <div className="member-socials">
        {member.github && (
          <a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub Profile"
            className="social-link"
          >
            {/* GitHub SVG icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="GitHub"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.263.82-.582 0-.288-.012-1.243-.017-2.252-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.204.085 1.838 1.237 1.838 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.304-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.872.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.921.43.372.814 1.103.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.699.825.58C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        )}

        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn Profile"
            className="social-link"
          >
            {/* LinkedIn SVG icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="LinkedIn"
            >
              <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.984 1.984 0 1 1 0-3.967 1.984 1.984 0 0 1 0 3.967zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        )}
      </div>

      {/* Description */}
      <p className="member-description">{member.description}</p>
    </div>
  );
}


// ─────────────────────────────────────────────
// src/components/ProjectCard.tsx
// Drop-in card for the Projects tab.
// Uses the projects[] array from src/data/projects.ts
// ─────────────────────────────────────────────

// import { Project } from "../data/projects";

// interface ProjectCardProps {
//   project: Project;
// }

// export default function ProjectCard({ project }: ProjectCardProps) {
//   return (
//     <div className="project-card">
//       <h3 className="project-title">{project.title}</h3>
//       <p className="project-author">by {project.author}</p>
//       <p className="project-description">{project.description}</p>

//       <div className="project-tags">
//         {project.tags.map((tag) => (
//           <span key={tag} className="project-tag">
//             {tag}
//           </span>
//         ))}
//       </div>

//       <a
//         href={project.githubLink}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="project-github-link"
//       >
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           width="16"
//           height="16"
//           viewBox="0 0 24 24"
//           fill="currentColor"
//         >
//           <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.263.82-.582 0-.288-.012-1.243-.017-2.252-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.204.085 1.838 1.237 1.838 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.304-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.872.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.921.43.372.814 1.103.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.699.825.58C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
//         </svg>
//         View on GitHub
//       </a>
//     </div>
//   );
// }
