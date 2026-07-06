export type AssessmentStatus = "live" | "draft" | "completed" | "scheduled";

export type Assessment = {
  id: string;
  title: string;
  category: string;
  owner: string;
  participants: number;
  avgScore: number | null;
  status: AssessmentStatus;
  modified: string;
  duration: number;
};

export type StudentStatus = "active" | "inactive" | "invited";

export type Student = {
  id: string;
  name: string;
  email: string;
  program: string;
  cohort: string;
  assessments: number;
  avgScore: number;
  status: StudentStatus;
  joined: string;
};

export const assessments: Assessment[] = [
  { id: "A-4821", title: "CS101 Mid-term Examination", category: "Computer Science", owner: "Dr. Elena Vance", participants: 412, avgScore: 78.4, status: "live", modified: "2h ago", duration: 90 },
  { id: "A-4822", title: "Senior Frontend Architect Screen", category: "Recruitment", owner: "M. Aurelius", participants: 28, avgScore: null, status: "draft", modified: "5h ago", duration: 60 },
  { id: "A-4823", title: "Advanced Quantum Dynamics", category: "Physics", owner: "Prof. R. Feynman", participants: 156, avgScore: 64.2, status: "completed", modified: "1d ago", duration: 120 },
  { id: "A-4824", title: "Organic Chemistry — Unit 3", category: "Chemistry", owner: "Dr. P. Curie", participants: 198, avgScore: 71.0, status: "completed", modified: "2d ago", duration: 75 },
  { id: "A-4825", title: "Data Engineer Technical Loop", category: "Recruitment", owner: "Talent Ops", participants: 64, avgScore: null, status: "scheduled", modified: "3d ago", duration: 90 },
  { id: "A-4826", title: "Introductory Linear Algebra", category: "Mathematics", owner: "Dr. A. Turing", participants: 312, avgScore: 82.1, status: "live", modified: "4d ago", duration: 60 },
  { id: "A-4827", title: "Comparative Constitutional Law", category: "Law", owner: "Prof. R. Ginsburg", participants: 88, avgScore: 76.5, status: "completed", modified: "1w ago", duration: 120 },
  { id: "A-4828", title: "Microeconomics — Spring Cohort", category: "Economics", owner: "Dr. J. Yellen", participants: 240, avgScore: 79.8, status: "live", modified: "1w ago", duration: 90 },
  { id: "A-4829", title: "Backend Engineer — System Design", category: "Recruitment", owner: "Talent Ops", participants: 42, avgScore: 68.2, status: "completed", modified: "2w ago", duration: 75 },
  { id: "A-4830", title: "Machine Learning Foundations", category: "Computer Science", owner: "Dr. Y. Bengio", participants: 184, avgScore: 74.6, status: "scheduled", modified: "2w ago", duration: 90 },
];

export const students: Student[] = [
  { id: "S-90112", name: "Amelia Okonkwo", email: "a.okonkwo@stjude.edu", program: "Computer Science", cohort: "2026", assessments: 14, avgScore: 88.4, status: "active", joined: "Sep 2024" },
  { id: "S-90113", name: "Rafael Mendez", email: "r.mendez@stjude.edu", program: "Mathematics", cohort: "2025", assessments: 22, avgScore: 91.2, status: "active", joined: "Aug 2023" },
  { id: "S-90114", name: "Priya Raghavan", email: "p.raghavan@stjude.edu", program: "Physics", cohort: "2027", assessments: 9, avgScore: 76.8, status: "active", joined: "Jan 2025" },
  { id: "S-90115", name: "Daniel Kowalski", email: "d.kowalski@stjude.edu", program: "Economics", cohort: "2026", assessments: 11, avgScore: 82.0, status: "inactive", joined: "Sep 2024" },
  { id: "S-90116", name: "Yuki Tanaka", email: "y.tanaka@stjude.edu", program: "Computer Science", cohort: "2025", assessments: 28, avgScore: 94.6, status: "active", joined: "Aug 2023" },
  { id: "S-90117", name: "Sophia Laurent", email: "s.laurent@stjude.edu", program: "Law", cohort: "2026", assessments: 16, avgScore: 79.5, status: "active", joined: "Sep 2024" },
  { id: "S-90118", name: "Marcus Aurelius", email: "m.aurelius@stjude.edu", program: "Philosophy", cohort: "2027", assessments: 6, avgScore: 84.1, status: "invited", joined: "Mar 2025" },
  { id: "S-90119", name: "Elena Vasquez", email: "e.vasquez@stjude.edu", program: "Chemistry", cohort: "2025", assessments: 19, avgScore: 87.3, status: "active", joined: "Aug 2023" },
  { id: "S-90120", name: "Theo Brennan", email: "t.brennan@stjude.edu", program: "Engineering", cohort: "2026", assessments: 13, avgScore: 71.4, status: "active", joined: "Sep 2024" },
  { id: "S-90121", name: "Noor Khalil", email: "n.khalil@stjude.edu", program: "Computer Science", cohort: "2027", assessments: 8, avgScore: 89.0, status: "active", joined: "Jan 2025" },
  { id: "S-90122", name: "Henrik Larsson", email: "h.larsson@stjude.edu", program: "Mathematics", cohort: "2026", assessments: 15, avgScore: 81.6, status: "active", joined: "Sep 2024" },
  { id: "S-90123", name: "Aisha Mohammed", email: "a.mohammed@stjude.edu", program: "Medicine", cohort: "2025", assessments: 24, avgScore: 92.8, status: "active", joined: "Aug 2023" },
];

export const trendData = [
  { month: "Jan", assessments: 184, completion: 87 },
  { month: "Feb", assessments: 212, completion: 89 },
  { month: "Mar", assessments: 248, completion: 91 },
  { month: "Apr", assessments: 296, completion: 90 },
  { month: "May", assessments: 342, completion: 92 },
  { month: "Jun", assessments: 318, completion: 93 },
  { month: "Jul", assessments: 286, completion: 91 },
  { month: "Aug", assessments: 374, completion: 94 },
  { month: "Sep", assessments: 442, completion: 93 },
  { month: "Oct", assessments: 498, completion: 95 },
  { month: "Nov", assessments: 524, completion: 94 },
  { month: "Dec", assessments: 612, completion: 96 },
];

export const studentGrowth = [
  { month: "Jan", students: 4820 },
  { month: "Feb", students: 5140 },
  { month: "Mar", students: 5380 },
  { month: "Apr", students: 5720 },
  { month: "May", students: 6010 },
  { month: "Jun", students: 6280 },
  { month: "Jul", students: 6420 },
  { month: "Aug", students: 6890 },
  { month: "Sep", students: 7320 },
  { month: "Oct", students: 7680 },
  { month: "Nov", students: 7984 },
  { month: "Dec", students: 8240 },
];

export const performanceDistribution = [
  { band: "0–40", count: 142 },
  { band: "40–60", count: 318 },
  { band: "60–75", count: 824 },
  { band: "75–90", count: 1242 },
  { band: "90–100", count: 486 },
];

export const recentRegistrations = students.slice(0, 5);
export const recentAssessments = assessments.slice(0, 5);
