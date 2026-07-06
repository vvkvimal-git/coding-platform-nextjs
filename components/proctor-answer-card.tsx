import { useState } from "react";
import { toast } from "react-hot-toast";
import { Terminal, Check, Copy } from "lucide-react";

interface ProctorAnswerCardProps {
  ans: any;
  idx: number;
  attempt: any;
  isDark?: boolean;
}

export function ProctorAnswerCard({ ans, idx, attempt, isDark = true }: ProctorAnswerCardProps) {
  const isCoding = !!ans.question.codingProblem;
  const isMCQ = ans.question.type?.startsWith("MCQ") ?? false;
  
  // Local state to track selected submission for this specific coding question
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);

  if (isCoding) {
    const problemSubmissions = (attempt.codeSubmissions || []).filter(
      (sub: any) => sub.problemId === ans.question.codingProblem?.id
    );
    const maxScore = ans.question.codingProblem?.points ?? 100;
    const obtainedScore = problemSubmissions.reduce((max: number, sub: any) => Math.max(max, sub.score || 0), 0);
    const passedAll = problemSubmissions.some((sub: any) => sub.status === "ACCEPTED");

    return (
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Question {idx + 1} (Coding)</span>
            <p className="text-xs font-semibold text-foreground mt-1 leading-relaxed">
              {ans.question.text}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
            passedAll
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          }`}>
            {passedAll ? "PASSED" : `Score: ${obtainedScore}/${maxScore}`}
          </span>
        </div>

        {problemSubmissions.length === 0 ? (
          <div className="text-xs text-muted-foreground italic p-3 bg-background border border-border rounded-lg">
            No submissions or console runs recorded for this coding problem.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Submission Selection list */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Submission History & Timeline
              </span>
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {problemSubmissions.map((sub: any, sIdx: number) => {
                  const isSelected = selectedSubId === sub.id || (selectedSubId === null && sIdx === 0);
                  const displayTime = new Date(sub.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
                  
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubId(sub.id)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all text-xs cursor-pointer ${
                        isSelected
                          ? "border-cyan-600 bg-cyan-50/50 font-semibold text-cyan-700 dark:border-cyan-500 dark:bg-cyan-950/20 dark:text-cyan-400"
                          : "border-border bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                          sub.status === "ACCEPTED"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}>
                          {sub.status}
                        </span>
                        <span className="font-bold text-foreground">
                          {sub.isRun ? "Console Run" : "Grading Submit"}
                        </span>
                        <span className="opacity-80">
                          ({sub.passedTests}/{sub.totalTests} tests passed)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] opacity-75 sm:ml-auto">
                        <span>Time: {sub.executionTime ? `${sub.executionTime.toFixed(0)}ms` : "0ms"}</span>
                        <span>Memory: {sub.memoryUsed ? `${Math.round(sub.memoryUsed)}KB` : "0KB"}</span>
                        <span className="font-mono">{displayTime} IST</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Code Content */}
            {(() => {
              const activeSub = problemSubmissions.find(
                (sub: any, sIdx: number) => sub.id === selectedSubId || (selectedSubId === null && sIdx === 0)
              );
              if (!activeSub) return null;

              const getLangName = (id: number) => {
                if (id === 71) return "Python";
                if (id === 62) return "Java";
                if (id === 63) return "JavaScript";
                if (id === 54) return "C++";
                return "TypeScript";
              };

              return (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Code Content ({getLangName(activeSub.languageId)})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeSub.code);
                        toast.success("Code copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline hover:text-primary/90 bg-transparent border-none cursor-pointer"
                    >
                      <Copy className="size-3" /> Copy Code
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-[11px] leading-normal overflow-auto max-h-[240px] whitespace-pre tab-size-4 select-text shadow-inner">
                    <code>{activeSub.code}</code>
                  </pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // MCQ/Fill in Blank rendering
  const isCorrect = ans.selectedOption?.isCorrect ?? false;
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Question {idx + 1}</span>
          <p className="text-xs font-semibold text-foreground mt-1 leading-relaxed">
            {ans.question.text}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
          isCorrect
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            : "bg-red-500/10 text-red-500 border-red-500/20"
        }`}>
          {isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      {isMCQ ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {ans.question.options.map((opt: any) => {
            const isSelected = ans.selectedOptionId === opt.id;
            const showCorrect = opt.isCorrect;

            return (
              <div
                key={opt.id}
                className={`p-2 rounded border flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? showCorrect
                      ? "bg-success/10 border-success text-success-foreground font-semibold"
                      : "bg-destructive/10 border-destructive text-destructive-foreground font-semibold"
                    : showCorrect
                    ? "bg-success/5 border-success/30 text-success/80 font-medium"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                <span>{opt.text}</span>
                {isSelected && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-foreground/10 shrink-0">
                    Selected
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 rounded bg-background border border-border text-xs space-y-1.5">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Correct Answer(s):</span>
            <span className="font-mono text-success font-semibold">
              {ans.question.options.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(", ") || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Candidate Response:</span>
            <span className={`font-mono font-semibold ${isCorrect ? "text-success" : "text-destructive"}`}>
              {ans.fillText || <span className="italic text-muted-foreground text-[11px]">Blank / No Response</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
