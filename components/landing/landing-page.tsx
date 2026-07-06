"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect, lazy, Suspense } from "react";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Database,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
const DashboardMockup = lazy(() => import("@/components/landing/dashboard-mockup").then(m => ({ default: m.DashboardMockup })));
import { ParallaxX, ScrollMarquee } from "@/components/landing/parallax";
import { useCountUp } from "@/hooks/use-count-up";
import { useInView } from "@/hooks/use-in-view";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: EASE },
};
const revealItem = (i: number = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, delay: i * 0.08, ease: EASE },
});

const features = [
  { icon: ClipboardList, title: "Coding Rounds", body: "Run language-agnostic coding rounds with hidden test cases, time limits, plagiarism signals, and auto-grading on a sandboxed runner." },
  { icon: Database, title: "Quiz Authoring", body: "Compose MCQ, multi-select, code-output, and short-answer items. Version every change with reviewer sign-off before publish." },
  { icon: Users, title: "Candidate Management", body: "Cohort segmentation, single-link invites, SAML SSO, and accommodation profiles handled as first-class data." },
  { icon: BarChart3, title: "Live Analytics", body: "Per-question difficulty, completion velocity, and cohort comparison computed on live session telemetry." },
  { icon: Upload, title: "Bulk Operations", body: "CSV roster sync, QTI question import, and REST + webhook APIs for your SIS, LMS, or ATS." },
  { icon: FileText, title: "Audit-Ready Reports", body: "Exportable PDFs and CSVs scoped for accreditation reviews, faculty calibration, and hiring committees." },
];

const benefits = [
  { icon: Zap, title: "Author quizzes 4× faster", body: "Templates, AI-assisted distractor suggestions, and a keyboard-first editor compress authoring cycles." },
  { icon: Sparkles, title: "Grade coding rounds in seconds", body: "Deterministic test runners, time and memory limits, and partial-credit rubrics deliver scores the moment a candidate submits." },
  { icon: BarChart3, title: "Defensible scoring", body: "Item analysis, reliability coefficients, and bias review surface weak questions before they reach a high-stakes window." },
  { icon: ShieldCheck, title: "Enterprise security", body: "SOC 2 Type II, ISO 27001, FERPA-aligned, with EU and APAC data residency on enterprise plans." },
];

const stats = [
  { label: "Coding submissions graded", value: 1_482_000 },
  { label: "Candidates evaluated", value: 6_240_000 },
  { label: "Quiz items managed", value: 384_000 },
  { label: "Reports delivered", value: 92_400 },
];

const testimonials = [
  {
    quote:
      "We replaced three coding-test vendors with Bluebirds. The auto-grader and item analytics removed an entire layer of manual review.",
    name: "Dr. Aisha Mohammed",
    role: "Dean of Engineering, St. Jude University",
  },
  {
    quote:
      "Our engineering loop dropped from fourteen days to five. The quiz bank and coding-round runner are best in class.",
    name: "Marcus Aurelius",
    role: "Head of Talent, Lattice Capital",
  },
  {
    quote:
      "Faculty actually adopted it — the quiz editor is fast, the integrity signals are honest, and the reports defend themselves.",
    name: "Prof. Elena Vasquez",
    role: "Director of Assessment, Wexler College",
  },
];

const faqs = [
  { q: "What languages do the coding rounds support?", a: "Twenty-plus runtimes including Python, Java, C/C++, Go, Rust, JavaScript/TypeScript, Ruby, Kotlin, Swift, and SQL — each in an isolated, time- and memory-bounded sandbox." },
  { q: "How do you ensure integrity during quizzes and coding rounds?", a: "Layered signals: keystroke and focus telemetry, paste-source attribution, optional live or recorded proctoring, and tamper-evident session logs. You configure the policy per assessment — never blanket surveillance." },
  { q: "Can quizzes and coding rounds be combined in one assessment?", a: "Yes. A single assessment can chain MCQ sections, short-answer items, and multiple coding problems with per-section time limits and scoring weights." },
  { q: "Does it integrate with our LMS or ATS?", a: "Native connectors for Canvas, Blackboard, Moodle, D2L, Greenhouse, Lever, and Workday — plus a REST and webhook API for everything else." },
  { q: "How is pricing structured?", a: "Annual seat-based for candidates, with unlimited admin and faculty seats. Enterprise contracts include dedicated infrastructure, custom runtimes, and a named CSM." },
  { q: "Is there a free trial?", a: "Pilots run 60 days with up to 250 candidates and unlimited coding rounds. No credit card and no auto-conversion." },
];

function Counter({ value, suffix = "+" }: { value: number; suffix?: string }) {
  const { value: v, ref } = useCountUp(value);
  return (
    <span ref={ref} className="tabular-nums">
      {v.toLocaleString()}
      {suffix}
    </span>
  );
}

function LazyMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { rootMargin: "200px" });

  return (
    <div ref={ref} className="w-full aspect-[16/10]">
      {inView ? (
        <Suspense fallback={<div className="w-full h-full rounded-xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-[11px] font-mono text-muted-foreground">Loading interactive interface...</div>}>
          <DashboardMockup />
        </Suspense>
      ) : (
        <div className="w-full h-full rounded-xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-[11px] font-mono text-muted-foreground">Loading interactive interface...</div>
      )}
    </div>
  );
}

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 140]);
  const textY = useTransform(scrollY, [0, 600], [0, -60]);
  const mockY = useTransform(scrollY, [0, 600], [0, -120]);
  const mockRotate = useTransform(scrollY, [0, 600], [0, -2]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.4]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 pointer-events-none [background:radial-gradient(60%_50%_at_50%_0%,var(--color-brand)_0%,transparent_60%)] opacity-[0.10]"
        />
        <motion.div
          style={{ y: useTransform(scrollY, [0, 600], [0, 80]) }}
          className="absolute -top-32 -right-32 size-[520px] rounded-full pointer-events-none opacity-[0.07] [background:radial-gradient(circle,var(--color-accent)_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-[1440px] px-8 pt-20 pb-24 grid lg:grid-cols-12 gap-16 items-center">
          <motion.div style={{ y: textY, opacity: heroOpacity }} {...reveal} className="lg:col-span-6">
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
              Coding rounds and quizzes,{" "}
              <span className="text-muted-foreground">engineered for high-stakes hiring and exams.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl text-pretty">
              Bluebirds Solutions is the assessment platform behind serious
              engineering programs and recruitment teams — auto-graded coding
              rounds, calibrated quiz banks, and audit-ready reporting on a
              single secure runtime.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href={isAuthenticated ? "/app" : "/sign-in"}
                className="inline-flex items-center gap-1.5 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-md hover:opacity-90 transition-opacity"
              >
                Start free pilot <ArrowRight className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center text-sm font-medium px-4 py-2.5 rounded-md border border-border hover:bg-surface transition-colors"
              >
                See the platform
              </a>
            </div>
            <p className="mt-6 text-[12px] text-muted-foreground">
              60-day pilot · 250 candidates · No credit card
            </p>
          </motion.div>

          <motion.div
            style={{ y: mockY, rotate: mockRotate }}
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.1 }}
            className="lg:col-span-6"
          >
            <LazyMockup />
          </motion.div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="border-y border-border bg-surface/40 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-8 py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground text-center mb-6">
            Trusted by faculty and talent teams at
          </p>
          <ScrollMarquee speed={260}>
            <div className="flex items-center gap-x-12 text-muted-foreground whitespace-nowrap pr-12">
              {["ST·JUDE", "WEXLER", "LATTICE", "MERIDIAN", "NORTHFIELD", "KAIROS", "ATLAS·TECH", "ST·JUDE", "WEXLER", "LATTICE", "MERIDIAN"].map((n, i) => (
                <span key={`${n}-${i}`} className="text-base font-semibold tracking-[0.18em]">
                  {n}
                </span>
              ))}
            </div>
          </ScrollMarquee>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-[1440px] px-8 py-28">
        <motion.div {...reveal} className="max-w-2xl mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
            Platform
          </p>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-balance">
            Everything required to run coding rounds and quizzes at scale.
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            A sandboxed code runner, a versioned quiz authoring suite, and an
            analytics layer engineered to defend every score you publish.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...revealItem(i)}
              className="bg-card p-8 hover:bg-surface transition-colors"
            >
              <div className="size-9 rounded-md bg-accent/10 text-accent flex items-center justify-center mb-5">
                <f.icon className="size-4" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLATFORM SHOWCASE */}
      <section id="solutions" className="border-y border-border bg-surface/40 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-8 py-28">
          <motion.div {...reveal} className="max-w-2xl mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
              In the product
            </p>
            <h2 className="text-4xl font-semibold tracking-tight leading-tight text-balance">
              One control plane for coding rounds, quizzes, and review.
            </h2>
          </motion.div>
          <motion.div {...revealItem(1)}>
            <LazyMockup />
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-[1440px] px-8 py-28 overflow-hidden">
        <motion.div {...reveal} className="max-w-2xl mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
            Why Bluebirds Solutions
          </p>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-balance">
            Built for teams that cannot afford a wrong hire or a wrong grade.
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              {...revealItem(i)}
              className="rounded-xl border border-border bg-card p-6"
            >
              <b.icon className="size-5 text-accent" />
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-foreground text-background">
        <div className="mx-auto max-w-[1440px] px-8 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-4xl lg:text-5xl font-semibold tracking-tight">
                <Counter value={s.value} />
              </p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-background/60">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-[1440px] px-8 py-28">
        <motion.h2
          {...reveal}
          className="text-4xl font-semibold tracking-tight max-w-2xl mb-16 text-balance"
        >
          What hiring leaders and faculty say.
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              {...revealItem(i)}
              className="rounded-xl border border-border bg-card p-8 flex flex-col"
            >
              <blockquote className="text-base leading-relaxed text-foreground text-pretty flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="pricing" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-3xl px-8 py-28">
          <motion.div {...reveal} className="mb-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-3">
              FAQ
            </p>
            <h2 className="text-4xl font-semibold tracking-tight">Questions, answered.</h2>
          </motion.div>
          <motion.div {...reveal}>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-lg border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-8 py-28">
          <motion.div
            {...reveal}
            className="relative overflow-hidden rounded-2xl border border-border bg-foreground text-background p-12 lg:p-16"
          >
            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(50%_70%_at_80%_50%,var(--color-accent)_0%,transparent_60%)] opacity-20" />
            <div className="relative max-w-2xl">
              <Lock className="size-5 text-accent mb-6" />
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-balance">
                Bring coding rounds and quizzes under one roof.
              </h2>
              <p className="mt-5 text-base text-background/70 leading-relaxed">
                Talk to our team about a 60-day pilot. We migrate your quiz
                bank, configure your coding-round runtimes, and stay close
                through your first assessment window.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={isAuthenticated ? "/app" : "/sign-in"}
                  className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-md hover:opacity-90 transition-opacity"
                >
                  Start pilot <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center text-sm font-medium px-4 py-2.5 rounded-md border border-background/20 text-background hover:bg-background/10 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
