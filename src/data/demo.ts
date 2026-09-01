/**
 * ⚠️ DEMO DATA — DEVELOPMENT ONLY.
 * Everything here is placeholder content used while the PHP API is wired up.
 * Delete this file and swap the exported hooks/loaders for API calls; no
 * component imports these objects directly except through props.
 */

import type {
  Application,
  CareerProgress,
  Candidate,
  Company,
  Job,
  PipelineCounts,
  PlatformStats,
} from "@/types/skillbridge";

export const IS_DEMO_DATA = true;

export const demoStats: PlatformStats = {
  students: 12000,
  opportunities: 850,
  companies: 320,
  matches: 2400,
};

export const demoJobs: Job[] = [
  {
    id: "job-1",
    title: "Full Stack Developer",
    summary: "Ship product surfaces end to end across a React and PHP stack.",
    company: { id: "c1", name: "Northwind Labs", logoUrl: null, verified: true },
    location: "Chennai",
    type: "Full Time",
    salaryRange: "₹6–9 LPA",
    skills: ["React", "TypeScript", "PHP", "MySQL"],
    postedAt: "2h ago",
    match: {
      score: 92,
      matched: ["React", "TypeScript", "PHP", "MySQL"],
      missing: ["AWS"],
    },
  },
  {
    id: "job-2",
    title: "Frontend Engineering Intern",
    summary: "Build design-system components and dashboards with the product team.",
    company: { id: "c2", name: "Vector Studio", logoUrl: null, verified: true },
    location: "Remote",
    type: "Internship",
    salaryRange: "₹25k / month",
    skills: ["React", "TypeScript", "CSS"],
    postedAt: "6h ago",
    match: { score: 85, matched: ["React", "TypeScript"], missing: ["Testing"] },
  },
  {
    id: "job-3",
    title: "Data Analyst",
    summary: "Turn product and hiring funnels into decisions the team can act on.",
    company: { id: "c3", name: "Meridian Analytics", logoUrl: null, verified: false },
    location: "Bengaluru",
    type: "Full Time",
    salaryRange: "₹7–10 LPA",
    skills: ["Python", "SQL", "Power BI"],
    postedAt: "1d ago",
    match: { score: 68, matched: ["Python", "SQL"], missing: ["Power BI"] },
  },
  {
    id: "job-4",
    title: "Software Engineer — Backend",
    summary: "Design APIs and data models for a high-volume matching engine.",
    company: { id: "c4", name: "Kaveri Systems", logoUrl: null, verified: true },
    location: "Hyderabad",
    type: "Full Time",
    salaryRange: "₹8–12 LPA",
    skills: ["Java", "MySQL", "Cloud"],
    postedAt: "2d ago",
    match: { score: 74, matched: ["MySQL", "Java"], missing: ["Kubernetes"] },
  },
  {
    id: "job-5",
    title: "AI Engineering Intern",
    summary: "Prototype ranking models for skill-to-opportunity matching.",
    company: { id: "c5", name: "Loop Intelligence", logoUrl: null, verified: true },
    location: "Pune",
    type: "Internship",
    salaryRange: "₹30k / month",
    skills: ["Python", "AI", "Cloud"],
    postedAt: "3d ago",
    match: { score: 61, matched: ["Python"], missing: ["PyTorch", "Cloud"] },
  },
  {
    id: "job-6",
    title: "Product Design Engineer",
    summary: "Bridge design and code for the SkillBridge student experience.",
    company: { id: "c6", name: "Studio Aperture", logoUrl: null, verified: false },
    location: "Chennai",
    type: "Contract",
    salaryRange: "₹5–7 LPA",
    skills: ["React", "CSS", "Figma"],
    postedAt: "4d ago",
    match: { score: 79, matched: ["React", "CSS"], missing: ["Figma"] },
  },
];

export const demoProgress: CareerProgress = {
  percent: 78,
  steps: [
    { id: "profile", label: "Profile", complete: true },
    { id: "skills", label: "Skills", complete: true },
    { id: "resume", label: "Resume", complete: true },
    { id: "projects", label: "Projects", complete: true },
    { id: "certificates", label: "Certificates", complete: false },
  ],
};

export const demoPipeline: PipelineCounts = {
  applied: 14,
  shortlisted: 6,
  interview: 3,
  hired: 1,
};

export const demoApplications: Application[] = [
  {
    id: "a1",
    job: { id: "job-1", title: "Full Stack Developer", companyName: "Northwind Labs" },
    stage: "interview",
    updatedAt: "Today",
  },
  {
    id: "a2",
    job: { id: "job-2", title: "Frontend Engineering Intern", companyName: "Vector Studio" },
    stage: "shortlisted",
    updatedAt: "Yesterday",
  },
  {
    id: "a3",
    job: { id: "job-4", title: "Software Engineer — Backend", companyName: "Kaveri Systems" },
    stage: "applied",
    updatedAt: "3 days ago",
  },
];

export const demoCandidates: Candidate[] = [
  {
    id: "u1",
    name: "A. Kumar",
    avatarUrl: null,
    college: "MCA · Computer Science",
    program: "MCA",
    experience: "2 internships",
    skills: ["React", "TypeScript", "Node.js", "MySQL"],
    match: { score: 94, matched: ["React", "TypeScript", "Node.js"], missing: ["AWS"] },
    stage: "shortlisted",
    appliedAt: "2 hours ago",
  },
  {
    id: "u2",
    name: "S. Iyer",
    avatarUrl: null,
    college: "B.Tech · Information Technology",
    program: "B.Tech",
    experience: "1 internship",
    skills: ["Python", "SQL", "AI"],
    match: { score: 88, matched: ["Python", "SQL"], missing: ["Power BI"] },
    stage: "applied",
    appliedAt: "5 hours ago",
  },
  {
    id: "u3",
    name: "R. Fernandes",
    avatarUrl: null,
    college: "B.E · Computer Science",
    program: "B.E",
    experience: "Fresher",
    skills: ["Java", "MySQL", "PHP"],
    match: { score: 81, matched: ["Java", "MySQL"], missing: ["Spring"] },
    stage: "interview",
    appliedAt: "1 day ago",
  },
];

export const demoCompany: Company = {
  id: "c1",
  name: "Northwind Labs",
  logoUrl: null,
  industry: "Product Engineering",
  website: "https://example.com",
  verified: true,
  about:
    "Northwind Labs builds developer tooling for hiring teams across India. We hire early-career engineers and pair them with senior mentors from day one.",
  city: "Chennai",
  address: "4th Floor, Tidel Park, Taramani, Chennai 600113",
  latitude: 12.9897,
  longitude: 80.2478,
};
