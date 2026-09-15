import { AnimatePresence, motion, useAnimationFrame, useInView, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export type TeamMember = {
  name: string;
  image: string;
  linkedin?: string;
  github?: string;
  website?: string;
  bio: string;
};

export type FacultyMember = {
  id: string;
  name: string;
  designation: string;
  department: string;
  roleInAura: string;
  specialization: string;
  researchAreas: string[];
  experience: string;
  education: string;
  email: string;
  office: string;
  quote: string;
  linkedin: string;
  photo: string;
  contributions: string[];
  skills: string[];
};

export const teamMembers: TeamMember[] = [
  {
    name: 'Vedant Shah',
    image: '/vedant-shah.jpg',
    linkedin: 'https://www.linkedin.com/in/vedant-shah-07a87331a/',
    github: 'https://github.com/Vedant-1016',
    bio: 'Building at the intersection of Machine Learning, NLP, RL, RAG and Deep Learning. Driven to challenge and redesign systems with a focus on intelligence and scalability.',
  },
  {
    name: 'Parth Agrawal',
    image: '/parth-agrawal.png',
    linkedin: 'https://www.linkedin.com/in/parth-agrawal-368869325/',
    github: 'https://github.com/ParthAgrawal-07',
    bio: 'I build backend systems and applied AI/ML. On AURA, I built a 12-role RBAC system with Google SSO, implemented document-level Pinecone retrieval filtering, and designed ERPConnector.',
  },
  {
    name: 'Meet Virugama',
    image: '/meet-virugama.png',
    linkedin: 'https://www.linkedin.com/in/meet-virugama-76a107320/',
    github: 'https://github.com/Meetvirugama',
    bio: 'I architect and build end-to-end ML systems — from data engineering to scalable production deployment. I am currently focused on Generative AI, RAG architectures, and Autonomous Agents.',
  },
  {
    name: 'Madhav Thesiya',
    image: '/madhav-thesiya.png',
    linkedin: 'https://www.linkedin.com/in/madhavthesiya/',
    github: 'https://github.com/madhavthesiya',
    bio: 'Codeforces Expert, LeetCode Knight, and CodeChef 4-Star with 2000+ problems solved. I enjoy building scalable backend systems focusing on caching, concurrency, database optimization, and performance engineering using C++, Java, Spring Boot, and Redis.',
  },
  {
    name: 'Bhagyashree Khemwani',
    image: '/bhagyashree-khemwani.png?v=latest',
    linkedin: 'https://www.linkedin.com/in/bhagyashree-khemwani/',
    github: 'https://github.com/bhagy-shr',
    bio: 'I am a B.Tech ICT student at DAU, passionate about AI/ML and everything in between. Core Member of AI Club DAU and a Google Gemini Student Ambassador, exploring how AI can solve real, everyday problems.',
  },
  {
    name: 'Manal Patel',
    image: '/manal-patel.png',
    linkedin: 'https://www.linkedin.com/in/manal-patel-a87b11382/',
    github: 'https://github.com/manalPatel2557',
    bio: 'I am a student at DAU with a strong passion for software development. I enjoy building diverse projects spanning observability platforms in Python, QR code scanners in C++, and database management systems in C.',
  },
  {
    name: 'GDG DAU',
    image: '/gdg.png',
    linkedin: '',
    github: 'https://github.com/ossdaiict',
    website: 'https://dscdaiict.in/',
    bio: 'The Google Developer Group (GDG) club at DAU is a student-run organization fostering development in ML, Android, Web, and UI/UX. Led by Convener Abhishek Abbi, GDG partners with AURA for major tech initiatives like SLoP and Dev-o-lution.',
  },
];

export const facultyMembers: FacultyMember[] = [
  {
    id: 'f1',
    name: 'Dr. G Venkatesh',
    designation: 'Director',
    department: 'School of Technology',
    roleInAura: 'Vision',
    specialization: 'Theoretical Computer Science, Embedded Systems, VLSI',
    researchAreas: ['Theoretical Computer Science', 'Embedded Systems', 'VLSI', 'Digital Circuits'],
    experience: '40+ Years',
    education: 'Ph.D. in Computer Science (TIFR), B.Tech in Electronics (IIT Madras)',
    email: '',
    office: 'Block 2, Room 412',
    quote: 'An academic who wandered into the industry, spent 18 years there... and have returned to academics.',
    linkedin: 'https://in.linkedin.com/in/venkatesh-g-a02a58',
    photo: '/venkatesh-g.png',
    contributions: ['Project Vision', 'Research Direction', 'Mentoring', 'Technical Guidance'],
    skills: ['Theoretical CS', 'Embedded Systems', 'VLSI'],
  },
  {
    id: 'f2',
    name: 'Dr. Arpit Rana',
    designation: 'Assistant Professor',
    department: 'Computer Science',
    roleInAura: 'System Architecture & Project Supervision',
    specialization: 'Applied Machine Learning, Recommendation Systems, Multimodality',
    researchAreas: ['Recommender Systems', 'Multimodality', 'Applied ML', 'Digital Innovation'],
    experience: '10+ Years',
    education: 'Ph.D. (UCC), M.Tech (LNMIIT)',
    email: '',
    office: 'Block 2, Room 305',
    quote: 'A good architecture survives future requirements.',
    linkedin: 'https://in.linkedin.com/in/arpitrana',
    photo: '/arpit-rana.png',
    contributions: ['Architecture', 'Backend', 'Code Reviews', 'Project Supervision'],
    skills: ['Data Mining', 'Recommender Systems', 'Applied ML'],
  },
  {
    id: 'f3',
    name: 'Mr. Ashvin Chaudhari',
    designation: 'System Administrator',
    department: 'IT & Infrastructure',
    roleInAura: 'Infrastructure Setup',
    specialization: 'System & Network Administration, VMware',
    researchAreas: [],
    experience: '16+ Years',
    education: '',
    email: '',
    office: '',
    quote: 'Building the resilient infrastructure that powers AURA.',
    linkedin: 'https://in.linkedin.com/in/ashvin-chaudhari-64a20661',
    photo: '/ashwin-chaudhary.png',
    contributions: ['Infrastructure Setup', 'Deployment', 'Server Config'],
    skills: ['VMware', 'Linux Admin', 'Windows Admin', 'Networking'],
  },
];

export const nodeRoles = [
  'AI Club',
  'AI Club',
  'AI Club',
  'Programming Club',
  'AI Club',
  'AI Club',
  'Google Developer Groups',
] as const;

export const getInitials = (name: string) =>
  name
    .replace(/^(Prof\.|Mr\.|Dr\.)\s*/i, '')
    .split(' ')
    .map((part) => part[0])
    .join('');


export const LoadingSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);
  const messages = [
    'Initializing Knowledge...',
    'Loading Faculty...',
    'Connecting Models...',
    'Preparing Assistant...',
    'Launching AURA...',
  ];

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(1), 700),
      window.setTimeout(() => setPhase(2), 1400),
      window.setTimeout(() => setPhase(3), 2100),
      window.setTimeout(() => setPhase(4), 2800),
      window.setTimeout(() => setPhase(5), 4500),
      window.setTimeout(onComplete, 5500),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 5 ? 0 : 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay" />

      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(234,88,12,0.2) 0%, rgba(234,88,12,0) 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200 mb-8 flex h-24 drop-shadow-[0_0_20px_rgba(255,145,0,0.6)]">
          <AnimatePresence>
            {[['A', 1], ['U', 2], ['R', 3], ['A', 4]].map(([letter, index]) => (
              phase >= (index as number) ? (
                <motion.span
                  key={`${letter}-${index}`}
                  initial={{ opacity: 0, y: 40, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="inline-block"
                >
                  {letter as string}
                </motion.span>
              ) : null
            ))}
          </AnimatePresence>
        </h1>

        <div className="h-8 mt-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="text-orange-400 font-mono text-sm tracking-widest uppercase"
              style={{ textShadow: '0 0 10px rgba(255, 145, 0, 0.8)' }}
            >
              {messages[Math.min(phase, 4)]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const generateParticle = (id: number) => ({
  id,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  speedX: (Math.random() - 0.5) * 0.05,
  speedY: (Math.random() - 0.5) * 0.05,
  opacity: Math.random() * 0.3 + 0.1,
});

export const FloatingParticles = () => {
  const shouldReduceMotion = useReducedMotion();
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, index) => generateParticle(index)),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAnimationFrame(() => {
    if (shouldReduceMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < 0) particle.x = 100;
      if (particle.x > 100) particle.x = 0;
      if (particle.y < 0) particle.y = 100;
      if (particle.y > 100) particle.y = 0;

      ctx.beginPath();
      ctx.arc(
        (particle.x / 100) * canvas.width,
        (particle.y / 100) * canvas.height,
        particle.size,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(249, 115, 22, ${particle.opacity})`;
      ctx.fill();
    });
  });

  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasRef.current.width = Math.floor(window.innerWidth * dpr);
      canvasRef.current.height = Math.floor(window.innerHeight * dpr);
      canvasRef.current.style.width = `${window.innerWidth}px`;
      canvasRef.current.style.height = `${window.innerHeight}px`;

      const ctx = canvasRef.current.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-50 mix-blend-screen"
    />
  );
};

export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0,
    nX: 0,
    nY: 0,
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: event.clientX,
        y: event.clientY,
        nX: (event.clientX / window.innerWidth) * 2 - 1,
        nY: (event.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return mousePosition;
};

export const AnimatedCounter = ({
  value,
  duration = 2,
}: {
  value: string;
  duration?: number;
}) => {
  const numericValue = Number(value.replace(/[^0-9]/g, ''));
  const isPlus = value.includes('+');
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const displayValue = useTransform(spring, (current) => {
    return `${Math.floor(current).toLocaleString()}${isPlus ? '+' : ''}`;
  });

  useEffect(() => {
    if (isInView && Number.isFinite(numericValue)) {
      spring.set(numericValue);
    }
  }, [isInView, numericValue, spring]);

  if (!Number.isFinite(numericValue)) return <span>{value}</span>;

  return <motion.span ref={ref}>{displayValue}</motion.span>;
};
