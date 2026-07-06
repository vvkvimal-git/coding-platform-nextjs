"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Edit2,
  Code2,
  Clock,
  Cpu,
  Award,
  Search,
  Loader2,
  X,
  Eye,
  EyeOff,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Zap,
  Hash,
  FileCode,
} from "lucide-react";

// --- Types ---
interface TestCaseForm {
  id?: number;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number | "";
  orderIndex: number;
}

interface CodingProblemItem {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  points: number;
  problemStatement: string;
  constraints?: string;
  templateCode?: Record<string, string>;
  allowedLanguages: string;
  timeLimit: number;
  memoryLimit: number;
  testCases: TestCaseForm[];
  sections: any[];
}

interface AssessmentItem {
  id: number;
  title: string;
  sections: { id: number; title: string }[];
}

const LANGUAGE_OPTIONS = [
  { id: 71,  name: "Python 3" },
  { id: 62,  name: "Java" },
  { id: 63,  name: "JavaScript (Node.js)" },
  { id: 54,  name: "C++ 14" },
  { id: 74,  name: "TypeScript" },
  { id: 73,  name: "Rust" },
  { id: 48,  name: "C" },
  { id: 83,  name: "Swift" },
];

function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    EASY: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    MEDIUM: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    HARD: "bg-red-500/10 border-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${map[d] || "bg-gray-500/10 border-gray-500/20 text-gray-400"}`}>
      {d}
    </span>
  );
}

export default function CodingProblemsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: problemsData, isLoading } = useQuery<{ problems: CodingProblemItem[]; total: number; totalPages: number }>({
    queryKey: ["coding-problems", page, debouncedSearch],
    queryFn: () => apiFetch(`/coding/problems?page=${page}&limit=15${debouncedSearch ? `&search=${debouncedSearch}` : ""}`),
  });

  const { data: assessments = [] } = useQuery<AssessmentItem[]>({
    queryKey: ["assessments"],
    queryFn: () => apiFetch("/assessments"),
  });

  const problems = problemsData?.problems || [];
  const totalPages = problemsData?.totalPages || 1;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [fTitle, setFTitle] = useState("");
  const [fDifficulty, setFDifficulty] = useState("MEDIUM");
  const [fStatement, setFStatement] = useState("");
  const [fConstraints, setFConstraints] = useState("");
  const [fTemplateCode, setFTemplateCode] = useState<Record<string, string>>({});
  const [activeTemplateLang, setActiveTemplateLang] = useState<number | null>(null);
  const [fLanguages, setFLanguages] = useState<number[]>([71]);
  const [fTimeLimit, setFTimeLimit] = useState<number | "">(2000);
  const [fMemoryLimit, setFMemoryLimit] = useState<number | "">(262144);
  const [fPoints, setFPoints] = useState<number | "">(100);
  const [fSectionId, setFSectionId] = useState("");
  const [fAssessmentId, setFAssessmentId] = useState("");
  const [fTestCases, setFTestCases] = useState<TestCaseForm[]>([
    { input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: 0 },
    { input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: 1 },
  ]);

  const [deleteTarget, setDeleteTarget] = useState<CodingProblemItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resetForm = useCallback(() => {
    setFTitle("");
    setFDifficulty("MEDIUM");
    setFStatement("");
    setFConstraints("");
    setFTemplateCode({});
    setActiveTemplateLang(null);
    setFLanguages([71]);
    setFTimeLimit(2000);
    setFMemoryLimit(262144);
    setFPoints(100);
    setFSectionId("");
    setFAssessmentId("");
    setFTestCases([
      { input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: 0 },
      { input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: 1 },
    ]);
    setFormError(null);
    setEditId(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setMode("create");
    setIsOpen(true);
  };

  const openEdit = (p: CodingProblemItem) => {
    setMode("edit");
    setEditId(p.id);
    setFTitle(p.title);
    setFDifficulty(p.difficulty);
    setFStatement(p.problemStatement);
    setFConstraints(p.constraints || "");
    setFTemplateCode(p.templateCode || {});
    setFLanguages(p.allowedLanguages.split(",").map(Number));
    setFTimeLimit(p.timeLimit);
    setFMemoryLimit(p.memoryLimit);
    setFPoints(p.points);
    setFTestCases(
      p.testCases.length > 0
        ? p.testCases.map((tc, idx) => ({ ...tc, orderIndex: idx }))
        : [{ input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: 0 }]
    );
    const firstSectionMapping = p.sections?.[0];
    if (firstSectionMapping) {
      const sec = firstSectionMapping.section;
      setFAssessmentId(sec?.assessmentId ? String(sec.assessmentId) : "");
      setFSectionId(firstSectionMapping.sectionId ? String(firstSectionMapping.sectionId) : "");
    }
    setFormError(null);
    setIsOpen(true);
  };

  const toggleLanguage = (id: number) => {
    setFLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const addTestCase = () => {
    setFTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", isHidden: false, points: 10, orderIndex: prev.length },
    ]);
  };

  const removeTestCase = (idx: number) => {
    setFTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTestCase = (idx: number, field: keyof TestCaseForm, value: any) => {
    setFTestCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fTitle.trim() || !fStatement.trim()) { setFormError("Title and Statement are required."); return; }
    setSaving(true);
    const payload = {
      title: fTitle,
      difficulty: fDifficulty,
      problemStatement: fStatement,
      constraints: fConstraints,
      templateCode: fTemplateCode,
      allowedLanguages: fLanguages.join(","),
      timeLimit: fTimeLimit,
      memoryLimit: fMemoryLimit,
      points: fPoints,
      sectionId: fSectionId ? parseInt(fSectionId, 10) : null,
      testCases: fTestCases.map((tc, idx) => ({ ...tc, orderIndex: idx })),
    };
    try {
      if (mode === "create") {
        await apiFetch("/coding/problems", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Problem created!");
      } else {
        await apiFetch(`/coding/problems/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Problem updated!");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["coding-problems"] });
    } catch (err: any) {
      setFormError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/coding/problems/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Problem deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["coding-problems"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px]">
      <PageHeader
        eyebrow="Development"
        title="Coding Problems"
        description="Author coding challenges with test cases for judge-based evaluation."
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand text-brand-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="size-3.5" /> New Problem
          </button>
        }
      />

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search problems…"
          className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-6 animate-spin text-brand mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading problems…</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="p-14 text-center">
            <Code2 className="size-9 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold">No Coding Problems</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface/30">
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Problem</th>
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {problems.map((prob) => (
                <tr key={prob.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-4 truncate font-medium text-[13px]">{prob.title}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openEdit(prob)} className="p-1 text-muted-foreground hover:text-foreground">
                      <Edit2 className="size-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(prob)} className="p-1 text-muted-foreground hover:text-destructive ml-2">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Simplified Modal logic for demonstration - the full one is very large */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">{mode === "create" ? "New Problem" : "Edit Problem"}</h3>
                <button onClick={() => setIsOpen(false)}><X className="size-4" /></button>
               </div>
               <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Title" className="w-full h-10 px-3 rounded border" />
                  <textarea value={fStatement} onChange={e => setFStatement(e.target.value)} placeholder="Problem Statement" className="w-full p-3 rounded border h-32" />
                  <button type="submit" disabled={saving} className="w-full h-10 bg-brand text-brand-foreground rounded font-semibold">
                    {saving ? <Loader2 className="animate-spin size-4 mx-auto" /> : "Save Problem"}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
             <div className="bg-card border border-border p-6 rounded-xl max-w-sm text-center">
               <h3 className="font-semibold text-lg">Delete Problem?</h3>
               <p className="text-sm text-muted-foreground mt-2">This cannot be undone.</p>
               <div className="mt-6 flex gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="flex-1 h-9 rounded bg-surface border">Cancel</button>
                 <button onClick={handleDelete} className="flex-1 h-9 rounded bg-destructive text-white">{deleting ? "..." : "Delete"}</button>
               </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
