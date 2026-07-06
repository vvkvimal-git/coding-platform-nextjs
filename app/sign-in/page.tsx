"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand";
import { apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";

function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function SignIn() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const localToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (localToken) {
      router.push("/app");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const error = params.get("error");

    if (error) {
      if (error === "email_not_registered") {
        const msg = "Your email is not pre-registered in our assessment platform. Please contact your coordinator.";
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        const msg = "OAuth authentication failed. Please try again.";
        setErrorMsg(msg);
        toast.error(msg);
      }
      router.replace("/sign-in");
    } else if (accessToken && refreshToken) {
      const decoded = decodeJwt(accessToken);
      if (decoded) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("userName", decoded.name || decoded.email.split("@")[0]);
        localStorage.setItem("userRole", decoded.role);
        toast.success("Successfully signed in!");
      }
      router.push("/app");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative border-r border-border bg-white p-8 xl:p-12 flex-col justify-start gap-8 overflow-hidden h-screen">
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(60%_50%_at_20%_0%,var(--color-accent)_0%,transparent_60%)] opacity-[0.05]" />

        <div className="relative shrink-0 flex flex-col gap-6 xl:gap-8 max-w-xl">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-2">
              Institutional console
            </p>
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight text-balance">
              Assessment, run with the seriousness it deserves.
            </h1>
            <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed text-pretty">
              The control plane behind your examination program — calm, deliberate,
              and built for the people accountable to the result.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0 my-4 max-w-xl w-full">
          <motion.img
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            src="/Nerd-amico.png"
            alt="Illustration"
            className="max-w-full max-h-[58vh] xl:max-h-[64vh] object-contain mix-blend-multiply"
          />
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="lg:hidden mb-10">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with your institutional credentials.
          </p>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-md bg-destructive/15 border border-destructive/20 text-destructive text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={() => {
              setGoogleLoading(true);
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
              window.location.href = `${API_URL}/auth/google`;
            }}
            className="mt-6 w-full h-10 rounded-md border border-input bg-surface text-sm font-medium inline-flex items-center justify-center gap-2.5 hover:bg-muted/50 transition-colors disabled:opacity-70"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.47 12c0-.73.13-1.44.36-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
            )}
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form
            className="mt-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setErrorMsg(null);
               try {
                const response = await apiFetch("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                  skipAuthRedirect: true,
                });

                if (response.accessToken) {
                  localStorage.setItem("accessToken", response.accessToken);
                  localStorage.setItem("refreshToken", response.refreshToken);
                  localStorage.setItem("userName", response.user.email.split("@")[0]);
                  localStorage.setItem("userRole", response.user.role);
                  toast.success("Successfully signed in!");
                  router.push("/app");
                }
              } catch (err: any) {
                const msg = err.message || "Failed to sign in. Please verify your credentials.";
                setErrorMsg(msg);
                toast.error(msg);
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-surface text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="name@university.edu"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Password
                </label>
                <a href="#" className="text-[11px] font-medium text-accent hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
              <input
                type="checkbox"
                defaultChecked
                className="size-3.5 rounded border-input text-accent focus:ring-accent/40"
              />
              Keep me signed in on this device
            </label>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-10 mt-2 rounded-md bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : (<>Sign in <ArrowRight className="size-4" /></>)}
            </button>
          </form>

          <p className="mt-8 text-[12px] text-muted-foreground text-center">
            New to Bluebirds Solutions?{" "}
            <Link href="/" className="text-foreground font-medium hover:underline">
              Request an institutional account
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
