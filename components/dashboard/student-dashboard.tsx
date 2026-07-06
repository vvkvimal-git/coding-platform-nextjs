import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { ClipboardList, GraduationCap, Calendar, Clock, Award, CheckCircle2, User, Landmark, HelpCircle, Loader2, Trophy, TrendingUp, AlertCircle, Shield, Download, Laptop, Globe, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";


interface StudentProfile {
  fullName: string;
  registerNumber: string;
  mobileNumber?: string;
  department: string;
  batch: string;
  year: number;
  collegeName?: string;
  college?: {
    id: number;
    name: string;
    code: string;
  };
  email: string;
}

interface AssessmentItem {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  instructions?: string;
  duration: number;
  totalMarks: number;
  startTime: string;
  endTime: string;
  maxTabSwitches?: number;
  activeAttemptId?: number | null;
  activeAttemptStatus?: string | null;
}

interface CompletedItem {
  id: number;
  title: string;
  duration: number;
  totalMarks: number;
  passingScore: number;
  submissionTime: string;
  attemptId: number;
  status: string;
  score: number | null;
  percentage: number | null;
  accuracy: number | null;
}

interface TopicPerformance {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

interface ScoreTrend {
  assessmentName: string;
  percentage: number;
  date: string;
}

interface StudentAnalytics {
  totalAssessments: number;
  avgScore: number;
  bestScore: number;
  topicPerformance: TopicPerformance[];
  weakAreas: string[];
  strongAreas: string[];
  scoreTrend: ScoreTrend[];
}

interface AssessmentsData {
  available: AssessmentItem[];
  upcoming: AssessmentItem[];
  completed: CompletedItem[];
}

export function StudentDashboard() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const winDownloadUrl = `${API_URL}/downloads/desktop-app?platform=windows`;
  const macDownloadUrl = `${API_URL}/downloads/desktop-app?platform=mac`;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentsData>({
    available: [],
    upcoming: [],
    completed: [],
  });
  const [activeTab, setActiveTab] = useState<"available" | "upcoming" | "completed">("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [launcherModalOpen, setLauncherModalOpen] = useState(false);
  const [selectedAttemptUuid, setSelectedAttemptUuid] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch profile and assessments in parallel
        const [profileData, assessmentsData] = await Promise.all([
          apiFetch<StudentProfile>("/students/me/profile"),
          apiFetch<AssessmentsData>("/students/me/assessments"),
        ]);
        
        setProfile(profileData);
        setAssessments(assessmentsData);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Analytics data is fetched and displayed on the dedicated analytics page (/app/analytics)

  const handleStartTest = async (assessmentUuid: string) => {
    try {
      const response = await apiFetch<{
        attemptUuid: string;
        proctorCamera?: boolean;
        proctorScreenShare?: boolean;
      }>("/attempts/start", {
        method: "POST",
        body: JSON.stringify({ assessmentId: assessmentUuid }),
      });

      const needsSecureBrowser = !!response.proctorScreenShare;

      // If lockdown browser is not required (no screen proctoring),
      // bypass secure browser and navigate directly to the quiz.
      if (!needsSecureBrowser) {
        router.push(`/quiz/${response.attemptUuid}`);
        return;
      }

      // If running inside the Electron secure browser shell, navigate to system check first
      if (typeof window !== "undefined" && (window as any).secureBrowser) {
        router.push(`/system-check/${response.attemptUuid}`);
        return;
      }

      // Standard web browser — open Launcher Modal options
      setSelectedAttemptUuid(response.attemptUuid);
      setLauncherModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to start assessment.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-brand mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-3">
          <p className="font-semibold">Unable to Load Dashboard</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand text-brand-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1440px]">
      
      {/* 1. Header Hero section */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(40%_60%_at_80%_10%,var(--color-accent)_0%,transparent_80%)] opacity-[0.04]" />
        
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent mb-1.5">
            Student Portal
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile?.fullName || "Elena"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Access your assigned assessments, view scheduling, and inspect past performance reports.
          </p>
        </div>

        {(profile?.college?.name || profile?.collegeName) && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-surface shrink-0">
            <Landmark className="size-4 text-accent" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Institution</p>
              <p className="text-xs font-semibold mt-0.5">{profile.college?.name || profile.collegeName}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 2. Left Column: Student Details & Download Browser */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-muted-foreground" /> Academic Profile
              </h3>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Register Number</p>
                  <p className="font-semibold mt-0.5 text-foreground">{profile?.registerNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Department</p>
                  <p className="font-semibold mt-0.5 text-foreground">{profile?.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Batch Code</p>
                  <p className="font-semibold mt-0.5 text-foreground">{profile?.batch}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Academic Year</p>
                  <p className="font-semibold mt-0.5 text-foreground">Year {profile?.year}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Registered Email</p>
                <p className="mt-0.5 text-muted-foreground font-medium truncate">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Secure Browser Download Card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden relative">
            {/* Background glowing gradient */}
            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(50%_50%_at_20%_20%,var(--color-brand)_0%,transparent_100%)] opacity-[0.03] dark:opacity-[0.06]" />
            
            <div className="px-5 py-4 border-b border-border bg-surface/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="size-4 text-brand" /> Secure Exam Browser
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                To take active exams, you must run the official **Bluebirds Secure Browser**. This secure shell disables multi-monitors, screenshots, and unauthorized external tools.
              </p>
              
              <div className="pt-2 space-y-2.5">
                <a 
                  href={winDownloadUrl}
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-brand text-brand-foreground rounded-lg text-xs font-semibold hover:opacity-95 transition-all shadow-sm group hover:-translate-y-[1px]"
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="size-3.5" />
                    <span>Download for Windows (x64)</span>
                  </span>
                  <Download className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>

                <a 
                  href={macDownloadUrl}
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-surface border border-border hover:bg-muted/50 rounded-lg text-xs font-semibold hover:border-accent/40 text-foreground transition-all group hover:-translate-y-[1px]"
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="size-3.5" />
                    <span>Download for macOS (DMG)</span>
                  </span>
                  <Download className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>

              <div className="pt-3 border-t border-border flex items-start gap-2 text-[10px] text-muted-foreground">
                <AlertCircle className="size-3.5 text-warning shrink-0 mt-0.5" />
                <p>
                  Launch the exam directly from this web page to auto-launch the secure app once installed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Right Column: Assessments Tabbed View */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tabs Navigation (Pill-shaped track with spring transitions) */}
          <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 py-1 flex mb-4">
            <div className="p-1 bg-muted/60 dark:bg-muted border border-border rounded-full flex gap-1 items-center">
              {[
                { id: "available", label: "Available Now", count: assessments.available.length },
                { id: "upcoming", label: "Upcoming", count: assessments.upcoming.length },
                { id: "completed", label: "Past Attempts", count: assessments.completed.length },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold relative rounded-full transition-colors select-none focus-visible:outline-none ${
                    activeTab === t.id ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeTab === t.id && (
                    <motion.div 
                      layoutId="activeTabPill" 
                      className="absolute inset-0 bg-background rounded-full shadow-sm" 
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                    {t.label}
                    {t.count > 0 && (
                      <span className={`px-1.5 py-0.5 text-[9px] rounded-full border transition-colors ${
                        activeTab === t.id 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400" 
                          : "bg-background dark:bg-card border-border text-muted-foreground"
                      }`}>
                        {t.count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Panel (Fluid transition views) */}
          <div className="space-y-4 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="w-full"
              >
            
            {/* A. Available Tab */}
            {activeTab === "available" && (
              <div className="space-y-3">
                {assessments.available.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card">
                    <CheckCircle2 className="size-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-medium mt-3">All Caught Up!</p>
                    <p className="text-xs text-muted-foreground mt-1">No active assessments are currently assigned to you.</p>
                  </div>
                ) : (
                  assessments.available.map((item) => (
                    <div key={item.id} className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-shadow">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{item.title}</h4>
                          {item.activeAttemptId && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-warning/15 border border-warning/20 text-warning">
                              Paused / In Progress
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="size-3.5" /> {item.duration} Mins</span>
                          <span className="flex items-center gap-1"><Award className="size-3.5" /> {item.totalMarks} Marks</span>
                          {item.maxTabSwitches && (
                            <span className="flex items-center gap-1"><HelpCircle className="size-3.5" /> Max Tab Switches: {item.maxTabSwitches}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartTest(item.uuid)}
                        className="px-4 py-2 bg-brand text-brand-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        {item.activeAttemptId ? "Resume Test" : "Start Test"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* B. Upcoming Tab */}
            {activeTab === "upcoming" && (
              <div className="space-y-3">
                {assessments.upcoming.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card">
                    <Calendar className="size-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-medium mt-3">No Upcoming Tests</p>
                    <p className="text-xs text-muted-foreground mt-1">There are no future assessments scheduled for your batch.</p>
                  </div>
                ) : (
                  assessments.upcoming.map((item) => (
                    <div key={item.id} className="p-5 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-surface border border-border px-2 py-1 rounded">
                          Scheduled
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-accent" />
                          <span>Starts: {new Date(item.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <span>Duration: {item.duration} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="size-3.5" />
                          <span>Weight: {item.totalMarks} Marks</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* C. Completed Tab */}
            {activeTab === "completed" && (
              <div className="space-y-3">
                {assessments.completed.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card">
                    <Award className="size-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-medium mt-3">No Attempts Yet</p>
                    <p className="text-xs text-muted-foreground mt-1">You haven't finalized any assessment submissions on the platform.</p>
                  </div>
                ) : (
                  assessments.completed.map((item) => (
                    <div key={item.id} className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Score: <b className="text-foreground">{item.score}/{item.totalMarks}</b></span>
                          <span>Percentage: <b className="text-foreground">{item.percentage}%</b></span>
                          <span>Accuracy: <b className="text-foreground">{item.accuracy}%</b></span>
                          <span>Submitted: {item.submissionTime ? new Date(item.submissionTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "N/A"}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-success/15 border border-success/20 text-success select-none">
                        Completed
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}


              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {launcherModalOpen && selectedAttemptUuid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            {/* Backdrop animated overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setLauncherModalOpen(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl p-6 md:p-8 z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setLauncherModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
                  <Shield className="size-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-foreground">Launch Assessment</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to take your proctored exam</p>
                </div>
              </div>

              {/* Launcher Options */}
              <div className="space-y-4">
                
                {/* Option A: Secure Browser App */}
                <div 
                  onClick={() => {
                    const token = localStorage.getItem("accessToken") || "";
                    toast.success("Launching Bluebirds Secure Browser... Please click 'Open' if prompted.", {
                      duration: 6000,
                    });
                    setLauncherModalOpen(false);
                    setTimeout(() => {
                      window.location.href = `bluebirds-sb://start?attemptId=${selectedAttemptUuid}&token=${token}`;
                    }, 800);
                  }}
                  className="group relative flex items-start gap-4 p-4 rounded-xl border border-indigo-250 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25 hover:border-indigo-400 cursor-pointer transition-all duration-200 hover:-translate-y-[1px]"
                >
                  <div className="p-2 rounded-lg bg-indigo-500 text-white shrink-0 mt-0.5 shadow-sm">
                    <Laptop className="size-4" />
                  </div>
                  <div className="space-y-1 pr-6 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground">Option A: Use Secure Browser (Recommended)</h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-600 text-white tracking-wider">
                        Highly Secure
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Launch the exam inside the official desktop app. Disables multi-monitors, screen capture, and prevents tab switching for maximum integrity.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                      <span>Launch App</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                {/* Option B: Normal Browser */}
                <div 
                  onClick={() => {
                    setLauncherModalOpen(false);
                    router.push(`/system-check/${selectedAttemptUuid}?bypassAppCheck=true`);
                  }}
                  className="group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-accent/40 cursor-pointer transition-all duration-200 hover:-translate-y-[1px]"
                >
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-accent/15 group-hover:text-accent shrink-0 mt-0.5 border border-border">
                    <Globe className="size-4" />
                  </div>
                  <div className="space-y-1 pr-6 text-left">
                    <h4 className="font-semibold text-sm text-foreground">Option B: Continue in Normal Browser</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Take the assessment directly in Google Chrome, Safari, or Microsoft Edge.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-accent font-semibold pt-1">
                      <span>Continue in Browser</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Downloads Footer Helper */}
              <div className="mt-6 pt-5 border-t border-border flex flex-col gap-2.5 text-left">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Don't have the desktop application yet?</p>
                <div className="flex flex-wrap gap-2">
                  <a 
                    href={winDownloadUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted hover:bg-muted/70 text-[10px] font-bold border border-border transition-colors text-foreground"
                  >
                    <Download className="size-3" />
                    Windows (.exe)
                  </a>
                  <a 
                    href={macDownloadUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted hover:bg-muted/70 text-[10px] font-bold border border-border transition-colors text-foreground"
                  >
                    <Download className="size-3" />
                    macOS (.dmg)
                  </a>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
