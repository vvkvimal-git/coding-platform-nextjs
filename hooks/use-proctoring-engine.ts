import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { apiFetch } from "@/lib/api-client";

const GRACE_PERIOD_SECONDS = 45;
// Poll every 800ms — sufficient detection speed without excessive CPU load
const POLL_INTERVAL_MS = 800;
// Startup grace: time to allow requestFullscreen() to resolve before enforcing
const STARTUP_GRACE_MS = 1200;
// Grace after unblock before violation counting restarts (ms)
const UNBLOCK_GRACE_MS = 3000;

interface ProctoringOptions {
  attemptId: string | number;
  proctorFullscreen?: boolean;
  proctorTabSwitch?: boolean;
  proctorDevTools?: boolean;
  proctorCamera?: boolean;
  proctorScreenShare?: boolean;
  maxFullscreenExits?: number;
  maxTabSwitches?: number;
  onForceSubmit?: (reason: string) => void;
  onUnblock?: () => void;
  enabled?: boolean;
  isActive?: boolean;
  initialTabSwitches?: number;
  initialFullscreenExits?: number;
}

// ─── IndexedDB Upload Queue helpers ────────────────────────────────────────────
const IDB_DB_NAME = "proctor-video-queue";
const IDB_STORE_NAME = "pending-uploads";

async function idbGetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbEnqueue(payload: {
  attemptId: string | number;
  eventType: string;
  details: string;
  blob: Blob;
}): Promise<void> {
  const db = await idbGetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).add(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDequeueAndUpload(): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await idbGetDB();
  } catch {
    return;
  }

  const items: Array<{ key: IDBValidKey; value: any }> = await new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const req = tx.objectStore(IDB_STORE_NAME).openCursor();
    const results: Array<{ key: IDBValidKey; value: any }> = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => resolve([]);
  });

  for (const item of items) {
    try {
      const formData = new FormData();
      formData.append("video", item.value.blob, `violation-${Date.now()}.webm`);
      formData.append("eventType", item.value.eventType);
      formData.append("details", item.value.details);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const accessToken = localStorage.getItem("accessToken");

      const resp = await fetch(
        `${API_URL}/attempts/${item.value.attemptId}/violate-video`,
        {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: formData,
        },
      );

      if (resp.ok) {
        // Remove successfully uploaded item from IndexedDB
        await new Promise<void>((resolve) => {
          const tx = db.transaction(IDB_STORE_NAME, "readwrite");
          tx.objectStore(IDB_STORE_NAME).delete(item.key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch {
      // Network failure — leave in queue for next retry
    }
  }
}

// Detect if running on macOS
function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|MacIntel|MacPPC|Mac68K/.test(navigator.platform) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // also catches iPad
}

// Detect if running on mobile device
function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1; // iPad Safari desktop mode fallback
  return isMobileUA || isIPadOS;
}

// Detect macOS native fullscreen (green button / ⌃⌘F).
// In this mode the browser window fills the entire screen BUT document.fullscreenElement is null.
// We treat this as secure if the browser window dimensions match the screen.
function isMacNativeFullscreen(): boolean {
  if (!isMac()) return false;
  if (typeof window === "undefined") return false;
  const widthDiff = Math.abs(window.outerWidth - window.screen.width);
  const heightDiff = Math.abs(window.outerHeight - window.screen.height);
  // Allow up to 5px tolerance for macOS menu bar / dock rounding
  return widthDiff <= 5 && heightDiff <= 5;
}

// Works across all browsers + handles the "maximised window but not HTML5 fullscreen" case
function checkIsInHtmlFullscreen(baselineWidth: number | null, baselineHeight: number | null): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  
  // If running in secure Electron desktop browser, treat as always fullscreen
  if ((window as any).secureBrowser !== undefined) {
    return true;
  }
  
  // Standard HTML5 fullscreen check
  const isHtmlFs = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );

  // Only HTML5 fullscreen is accepted for the exam.
  // macOS native fullscreen (green button) is intentionally NOT accepted here —
  // it conflicts with HTML5 fullscreen and the user is shown instructions to exit it first.
  if (!isHtmlFs) return false;
  
  // Secondary check: verify the browser window actually occupies the hardware screen dimensions.
  // This detects OS-level tiling, snap layout, or split-screen operations (such as macOS Sequoia Move & Resize)
  // where the browser window is shrunk but the HTML5 fullscreen state is not cleared instantly.
  const widthDiff = Math.abs(window.outerWidth - window.screen.width);
  const heightDiff = Math.abs(window.outerHeight - window.screen.height);
  
  // If we have a recorded baseline, compare the current dimensions against it.
  // Since the baseline was captured when the window successfully went fullscreen,
  // this is 100% immune to Brave's fingerprinting farbling and allows a super-strict 15px threshold.
  if (baselineWidth !== null && baselineHeight !== null) {
    const baselineWidthDiff = Math.abs(window.outerWidth - baselineWidth);
    const baselineHeightDiff = Math.abs(window.outerHeight - baselineHeight);
    if (baselineWidthDiff > 15 || baselineHeightDiff > 15) {
      return false;
    }
  } else {
    // Fallback if no baseline exists yet (e.g. initial render)
    const isBrave = typeof navigator !== "undefined" && (navigator as any).brave !== undefined;
    const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isFirefox = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("firefox");
    const threshold = (isBrave || isSafari || isFirefox) ? 150 : 20;

    if (widthDiff > threshold || heightDiff > threshold) {
      return false;
    }
  }
  
  return true;
}

export function useProctoringEngine({
  attemptId,
  proctorFullscreen = true,
  proctorTabSwitch = true,
  proctorDevTools = true,
  proctorCamera = false,
  proctorScreenShare = false,
  maxFullscreenExits = 3,
  maxTabSwitches = 3,
  onForceSubmit,
  onUnblock,
  enabled = true,
  isActive = true,
  initialTabSwitches = 0,
  initialFullscreenExits = 0,
}: ProctoringOptions) {
  const [violations, setViolations] = useState(initialTabSwitches);
  const [isFullscreenRequired, setIsFullscreenRequired] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isMobileDevice()) return false;
    if (!enabled || !isActive || !proctorFullscreen) return false;
    return !checkIsInHtmlFullscreen(null, null) || !document.hasFocus();
  });
  const [fullscreenCountdown, setFullscreenCountdown] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`exam-fullscreen-countdown-${attemptId}`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= GRACE_PERIOD_SECONDS) {
          return parsed;
        }
      }
    }
    return GRACE_PERIOD_SECONDS;
  });
  const [fullscreenExitCount, setFullscreenExitCount] = useState(initialFullscreenExits);
  const [isEnteringFullscreen, setIsEnteringFullscreen] = useState(false);

  // Electron secure desktop app violation state
  const [desktopViolation, setDesktopViolation] = useState<{
    type: string | null;
    process?: string;
    message: string | null;
  } | null>(null);

  // Proctoring streams and permission states
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<"NOT_REQUESTED" | "GRANTED" | "DENIED">("NOT_REQUESTED");
  const [screenSharePermissionState, setScreenSharePermissionState] = useState<"NOT_REQUESTED" | "GRANTED" | "DENIED">("NOT_REQUESTED");
  const [isCameraMuted, setIsCameraMuted] = useState(false);

  // Sync refs to avoid stale closure issues in intervals/timers
  const cameraPermissionStateRef = useRef(cameraPermissionState);
  const screenSharePermissionStateRef = useRef(screenSharePermissionState);
  const isCameraMutedRef = useRef(isCameraMuted);

  useEffect(() => {
    cameraPermissionStateRef.current = cameraPermissionState;
  }, [cameraPermissionState]);

  useEffect(() => {
    screenSharePermissionStateRef.current = screenSharePermissionState;
  }, [screenSharePermissionState]);

  useEffect(() => {
    isCameraMutedRef.current = isCameraMuted;
  }, [isCameraMuted]);

  const lastTabSwitchesRef = useRef(initialTabSwitches);
  const lastFullscreenExitsRef = useRef(initialFullscreenExits);
  const hasSwitchedAwayRef = useRef(false);

  // ── INSTANT UI update helpers ──────────────────────────────────────────────
  // These NEVER throttle — they always fire immediately to update the counter.
  // Server reporting is handled separately in reportViolation().
  // ──────────────────────────────────────────────────────────────────────────
  const updateViolationsCount = useCallback((val: number) => {
    const safeVal = Math.max(0, Number(val) || 0);
    setViolations(safeVal);
    lastTabSwitchesRef.current = safeVal;
  }, []);

  const updateFullscreenExitsCount = useCallback((val: number) => {
    const safeVal = Math.max(0, Number(val) || 0);
    setFullscreenExitCount(safeVal);
    lastFullscreenExitsRef.current = safeVal;
  }, []);

  // Increment tab-switch counter immediately — bypasses ALL throttling
  const incrementTabSwitchInstant = useCallback(() => {
    const next = (lastTabSwitchesRef.current || 0) + 1;
    updateViolationsCount(next);
    return next;
  }, [updateViolationsCount]);

  // Increment fullscreen-exit counter immediately — bypasses ALL throttling
  const incrementFullscreenExitInstant = useCallback(() => {
    const next = (lastFullscreenExitsRef.current || 0) + 1;
    updateFullscreenExitsCount(next);
    return next;
  }, [updateFullscreenExitsCount]);

  // Keep refs in sync with latest instant helpers (for use inside closures)
  const incrementTabSwitchInstantRef = useRef(incrementTabSwitchInstant);
  const incrementFullscreenExitInstantRef = useRef(incrementFullscreenExitInstant);
  useEffect(() => { incrementTabSwitchInstantRef.current = incrementTabSwitchInstant; }, [incrementTabSwitchInstant]);
  useEffect(() => { incrementFullscreenExitInstantRef.current = incrementFullscreenExitInstant; }, [incrementFullscreenExitInstant]);

  useEffect(() => {
    if (initialTabSwitches !== lastTabSwitchesRef.current) {
      setViolations(initialTabSwitches);
      lastTabSwitchesRef.current = initialTabSwitches;
    }
  }, [initialTabSwitches]);

  useEffect(() => {
    if (initialFullscreenExits !== lastFullscreenExitsRef.current) {
      setFullscreenExitCount(initialFullscreenExits);
      lastFullscreenExitsRef.current = initialFullscreenExits;
    }
  }, [initialFullscreenExits]);

  // Hook into Electron secure browser status updates & violations
  useEffect(() => {
    if (typeof window === "undefined") return;
    const secureBrowser = (window as any).secureBrowser;
    if (!secureBrowser) return;

    const unsubscribe = secureBrowser.onStatusUpdate((status: any) => {
      if (status.hasViolation) {
        setDesktopViolation({
          type: status.type,
          process: status.process,
          message: status.message
        });

        // Trigger force-submit for permanent VM environment violation
        if (status.type === 'vm-detected') {
          reportViolationRef.current("VM_DETECTED", "Candidate is running the application inside a Virtual Machine.");
          if (onForceSubmitRef.current) {
            onForceSubmitRef.current("Examination terminated: Running inside a Virtual Machine environment is prohibited.");
          }
        }
      } else {
        setDesktopViolation(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [attemptId]);

  // Hook into Electron secure browser window focus/blur events to track focus loss
  useEffect(() => {
    if (typeof window === "undefined") return;
    const secureBrowser = (window as any).secureBrowser;
    if (!secureBrowser) return;

    let blurTimeout: NodeJS.Timeout | null = null;

    const handleBlur = () => {
      if (!enabled || !isActive) return;
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        reportViolationRef.current("TAB_SWITCH", "Candidate secure desktop browser window lost focus.");
      }, 5000);
    };

    const handleFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    const unsubscribeBlur = secureBrowser.onWindowBlur(handleBlur);
    const unsubscribeFocus = secureBrowser.onWindowFocus(handleFocus);

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
      if (blurTimeout) clearTimeout(blurTimeout);
    };
  }, [enabled, isActive, attemptId]);

  const [fullscreenTransitionState, setFullscreenTransitionState] = useState<
    "idle" | "requesting" | "transitioning" | "verifying" | "failed"
  >("idle");
  const [securityStatus, setSecurityStatus] = useState(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        isFullscreen: false,
        isFocused: false,
        isWindowSizeCorrect: false,
      };
    }
    const fs = checkIsInHtmlFullscreen(null, null);
    const focused = document.hasFocus();
    return {
      isFullscreen: fs,
      isFocused: focused,
      isWindowSizeCorrect: fs,
    };
  });

  const socketRef = useRef<Socket | null>(null);
  const lastViolationTimeRef = useRef<Record<string, number>>({});
  const keystrokeHistoryRef = useRef<Array<{ key: string; time: number }>>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL FIX: Store callbacks in refs so they never go stale in closures.
  // Inline functions from the parent (quiz.$id.tsx) are recreated every render
  // (the timer alone fires every 1 s). Without refs, these recreations cause
  // reportViolation → enforcement useEffect to restart, resetting pollStarted
  // to false and silently disabling all detection.
  // ─────────────────────────────────────────────────────────────────────────
  const onForceSubmitRef = useRef(onForceSubmit);
  const onUnblockRef = useRef(onUnblock);
  useEffect(() => { onForceSubmitRef.current = onForceSubmit; }, [onForceSubmit]);
  useEffect(() => { onUnblockRef.current = onUnblock; }, [onUnblock]);

  // Whether we are currently in lockdown — tracked as ref so polling reads fresh value
  const lockdownActiveRef = useRef(typeof window !== "undefined" && enabled && isActive && proctorFullscreen && (!checkIsInHtmlFullscreen(null, null) || !document.hasFocus()));
  // Track whether we already incremented the exit counter for this exit event
  const exitRecordedRef = useRef(false);

  // Guard flag to prevent polling or event listeners from triggering during the fullscreen transition
  const isEnteringFullscreenRef = useRef(false);

  // Ref to track the delayed fullscreen recheck timeout
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkFullscreenRef = useRef<(() => void) | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL FIX: pollStarted must be a ref, not a local variable.
  // Local variables in useEffect closures are reset every time the effect
  // re-runs. Because the enforcement effect depended on reportViolation (which
  // was recreated every render due to timer), pollStarted was permanently reset
  // to false, causing a permanent 1200ms grace delay on every check cycle.
  // ─────────────────────────────────────────────────────────────────────────
  const pollStartedRef = useRef(false);

  // Record a baseline of fullscreen window dimensions to prevent Brave/Safari/Firefox spoofing locks
  const getInitialBaselineWidth = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const isHtmlFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    return isHtmlFs ? window.outerWidth : null;
  };

  const getInitialBaselineHeight = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const isHtmlFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    return isHtmlFs ? window.outerHeight : null;
  };

  const fullscreenBaselineWidthRef = useRef<number | null>(getInitialBaselineWidth());
  const fullscreenBaselineHeightRef = useRef<number | null>(getInitialBaselineHeight());

  // ─────────────────────────────────────────────────────────────────────────
  // KEY FIX: Only count fullscreen exits as violations AFTER the student has
  // successfully entered fullscreen at least once in this session.
  // This prevents page refresh from burning through the violation quota.
  // ─────────────────────────────────────────────────────────────────────────
  const hasEverBeenFullscreenRef = useRef(false);

  // After unblock, give a grace window before re-enforcing violations
  const unblockGraceActiveRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Throttled violation reporter — stored in a ref so event handlers in the
  // enforcement effect closure always call the current version, without
  // needing reportViolation itself in the useEffect dependency array.
  // ──────────────────────────────────────────────────────────────────────────
  const reportViolationRef = useRef<(eventType: string, details?: string) => Promise<void>>(async () => {});

  const reportViolation = useCallback(
    async (eventType: string, details?: string) => {
      // ── STEP 1: Always update the UI counter instantly — no throttle ────────
      // The counter must reflect every single event immediately, regardless of
      // how many server calls we throttle.
      if (eventType === "TAB_SWITCH") {
        const newCount = incrementTabSwitchInstantRef.current();
        toast.error(`⚠️ Tab switch #${newCount} recorded (${newCount}/${maxTabSwitches})`, {
          id: `tab-switch-${newCount}`,
          duration: 3000,
        });
      } else if (eventType === "FULLSCREEN_EXIT") {
        incrementFullscreenExitInstantRef.current();
      }

      // ── STEP 2: Throttle the server call — deduplicate rapid events ─────────
      const now = Date.now();
      const lastTime = lastViolationTimeRef.current[eventType] || 0;
      if (now - lastTime < 5000) return; // 5s server throttle — UI already updated above
      lastViolationTimeRef.current[eventType] = now;

      try {
        const response = await apiFetch<{
          tabSwitchViolations: number;
          fullscreenExitViolations: number;
          limitExceeded: boolean;
          status: string;
          message: string;
        }>(`/attempts/${attemptId}/violate`, {
          method: "POST",
          body: JSON.stringify({
            eventType,
            details: details || `${eventType} detected.`,
          }),
        });

        // Sync with server truth only if server count is HIGHER than local
        // (never roll back the counter — confuses the student)
        const serverTabCount = Number(response.tabSwitchViolations);
        const serverFsCount = Number(response.fullscreenExitViolations);
        if (!isNaN(serverTabCount) && serverTabCount > lastTabSwitchesRef.current) {
          updateViolationsCount(serverTabCount);
        }
        if (!isNaN(serverFsCount) && serverFsCount > lastFullscreenExitsRef.current) {
          updateFullscreenExitsCount(serverFsCount);
        }
        if (response.limitExceeded && onForceSubmitRef.current) {
          onForceSubmitRef.current(response.message);
        }
      } catch (err) {
        console.error("Failed to report violation via REST", err);
        // Fallback to WebSocket if REST fails
        if (socketRef.current?.connected) {
          socketRef.current.emit("proctorEvent", {
            attemptId,
            eventType,
            details: details || `${eventType} detected.`,
          });
        }
      }
    },
    [attemptId, maxTabSwitches, updateViolationsCount, updateFullscreenExitsCount]
    // NOTE: onForceSubmit deliberately omitted — accessed via onForceSubmitRef
    // to prevent this callback from being recreated on every parent render.
  );

  // Keep the ref in sync with the latest reportViolation
  useEffect(() => {
    reportViolationRef.current = reportViolation;
  }, [reportViolation]);

  // ──────────────────────────────────────────────────────────────────────────
  // Safe fullscreen request — exported so quiz page can call on start/resume
  // ──────────────────────────────────────────────────────────────────────────
  const requestFullscreen = useCallback((): Promise<void> => {
    const el = document.documentElement;
    const req =
      el.requestFullscreen ||
      (el as any).webkitRequestFullscreen ||
      (el as any).mozRequestFullScreen ||
      (el as any).msRequestFullscreen;

    if (!req) {
      setFullscreenTransitionState("failed");
      return Promise.reject(new Error("Fullscreen API not supported by this browser."));
    }

    isEnteringFullscreenRef.current = true;
    setIsEnteringFullscreen(true);
    setFullscreenTransitionState("requesting");
    
    // On macOS the Space animation takes longer — give it more time
    const onMac = isMac();
    const safetyTimeoutMs = onMac ? 4500 : 2500;
    const settlingMs = onMac ? 3000 : 2000;

    // Safety backup timeout to force clear the transition lock in case browser promise hangs
    const safetyTimeout = setTimeout(() => {
      isEnteringFullscreenRef.current = false;
      setIsEnteringFullscreen(false);
      setFullscreenTransitionState("idle");
      if (typeof window !== "undefined") {
        window.focus();
      }
      checkFullscreenRef.current?.();
    }, safetyTimeoutMs);

    const promise = req.call(el);
    if (promise && typeof promise.then === "function") {
      return promise
        .then(() => {
          clearTimeout(safetyTimeout);

          // Verify if we actually entered HTML5 fullscreen
          const isFs = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          );

          if (!isFs) {
            // Reject so that the catch block runs and shows the correct instructions (macOS Space zoom conflict)
            throw new Error("Fullscreen resolved but HTML5 Fullscreen is not active.");
          }

          setIsFullscreenRequired(false);
          lockdownActiveRef.current = false;
          setFullscreenTransitionState("transitioning");
          if (typeof window !== "undefined") {
            localStorage.removeItem(`exam-fullscreen-countdown-${attemptId}`);
          }
          
          const stepTimer = setTimeout(() => {
            setFullscreenTransitionState("verifying");
          }, 1000);

          // Wait for macOS Space animation to fully settle before recording baseline.
          // On Mac, the Space swipe animation takes ~1.5-3s; we poll until dimensions
          // stabilise rather than using a fixed delay.
          const startWait = Date.now();
          const waitForSettle = () => {
            const elapsed = Date.now() - startWait;
            const timeoutLimit = settlingMs;

            const currentW = window.outerWidth;
            const currentH = window.outerHeight;
            const isStable = (
              Math.abs(currentW - window.screen.width) <= (onMac ? 20 : 15) &&
              Math.abs(currentH - window.screen.height) <= (onMac ? 20 : 15)
            );

            if (isStable || elapsed >= timeoutLimit) {
              clearTimeout(stepTimer);
              if (typeof window !== "undefined") {
                fullscreenBaselineWidthRef.current = currentW;
                fullscreenBaselineHeightRef.current = currentH;
                window.focus();
              }
              isEnteringFullscreenRef.current = false;
              setIsEnteringFullscreen(false);
              setFullscreenTransitionState("idle");
              hasEverBeenFullscreenRef.current = true;
              checkFullscreenRef.current?.();
            } else {
              // Poll every 100ms until settled or timeout
              setTimeout(waitForSettle, 100);
            }
          };
          setTimeout(waitForSettle, 500); // initial wait before first check
        })
        .catch((err: any) => {
          clearTimeout(safetyTimeout);
          isEnteringFullscreenRef.current = false;
          setIsEnteringFullscreen(false);
          setFullscreenTransitionState("failed");
          checkFullscreenRef.current?.();
          throw err;
        });
    } else {
      // Fallback for non-promise returns
      clearTimeout(safetyTimeout);
      setFullscreenTransitionState("transitioning");
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          const isFs = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          );

          if (!isFs) {
            isEnteringFullscreenRef.current = false;
            setIsEnteringFullscreen(false);
            setFullscreenTransitionState("failed");
            reject(new Error("HTML5 Fullscreen not active after fallback transition."));
            return;
          }

          if (typeof window !== "undefined") {
            fullscreenBaselineWidthRef.current = window.outerWidth;
            fullscreenBaselineHeightRef.current = window.outerHeight;
            window.focus();
          }
          isEnteringFullscreenRef.current = false;
          setIsEnteringFullscreen(false);
          setFullscreenTransitionState("idle");
          // Mark that student has now been in fullscreen
          hasEverBeenFullscreenRef.current = true;
          checkFullscreenRef.current?.();
          resolve();
        }, 2000);
      });
    }
  }, [attemptId]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BroadcastChannel + WebSocket
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const channelName = `exam-lockdown-attempt-${attemptId}`;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    // 1-second delay before sending duplicate check to let previous instances unload
    const duplicateTimeout = setTimeout(() => {
      channel.postMessage({ type: "CHECK_DUPLICATE", tabId: Date.now() });
    }, 1000);

    let hasAlerted = false;
    channel.onmessage = (event) => {
      if (hasAlerted) return;
      if (event.data?.type === "CHECK_DUPLICATE") {
        hasAlerted = true;
        channel.postMessage({ type: "DUPLICATE_ALERT" });
        toast.error("Duplicate exam tab detected. Terminating session...");
        if (onForceSubmitRef.current) onForceSubmitRef.current("Duplicate session tab opened.");
      } else if (event.data?.type === "DUPLICATE_ALERT") {
        hasAlerted = true;
        toast.error("Duplicate exam tab detected. Terminating session...");
        if (onForceSubmitRef.current) onForceSubmitRef.current("Duplicate session tab opened.");
      }
    };

    const socket = io(`${API_URL}/proctor`, {
      query: { token },
      transports: ["websocket"],
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("joinExam", { attemptId }));
    socket.on("TERMINATE_SESSION", (data: { message: string }) => {
      toast.error(data.message, { duration: 6000 });
      if (onForceSubmitRef.current) onForceSubmitRef.current("Session terminated from another location.");
    });
    socket.on("FORCE_SUBMIT", (data: { message: string }) => {
      toast.error(data.message, { duration: 6000 });
      if (onForceSubmitRef.current) onForceSubmitRef.current(data.message);
    });
    socket.on(
      "VIOLATION_SYNCHRONIZED",
      (data: { tabSwitchViolations: number; fullscreenExitViolations: number }) => {
        updateViolationsCount(data.tabSwitchViolations);
        updateFullscreenExitsCount(data.fullscreenExitViolations);
      }
    );
    socket.on("UNBLOCK_SESSION", (data: { message: string }) => {
      toast.success(data.message, { duration: 6000 });

      // Reset all lockdown state
      lockdownActiveRef.current = false;
      exitRecordedRef.current = false;
      hasSwitchedAwayRef.current = false;
      // Reset fullscreen tracking so student must re-enter fullscreen cleanly
      // without the first return being counted as a new violation
      hasEverBeenFullscreenRef.current = false;

      setIsFullscreenRequired(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`exam-fullscreen-countdown-${attemptId}`);
      }
      setFullscreenCountdown(GRACE_PERIOD_SECONDS);
      updateFullscreenExitsCount(0);
      updateViolationsCount(0);

      // Give a grace window after unblock before any violation counting restarts
      unblockGraceActiveRef.current = true;
      setTimeout(() => {
        unblockGraceActiveRef.current = false;
      }, UNBLOCK_GRACE_MS);

      // Show the lockdown overlay asking student to return to fullscreen
      // (without counting it as a violation — hasEverBeenFullscreen is false)
      if (proctorFullscreen) {
        setIsFullscreenRequired(true);
      }

      if (onUnblockRef.current) onUnblockRef.current();
    });

    return () => {
      clearTimeout(duplicateTimeout);
      channel.close();
      socket.disconnect();
    };
  }, [attemptId, enabled, updateViolationsCount, updateFullscreenExitsCount, proctorFullscreen]);

  // Synchronize lockdown refs and countdown states when the session becomes active again
  // (which happens when the student is unblocked via socket OR polling/refresh)
  const prevIsActiveRef = useRef(isActive);
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      // Transitioned from inactive (e.g. BLOCKED/FORCE_SUBMITTED) to active
      lockdownActiveRef.current = false;
      exitRecordedRef.current = false;
      hasSwitchedAwayRef.current = false;
      hasEverBeenFullscreenRef.current = false;
      if (proctorFullscreen) {
        setIsFullscreenRequired(true); // Force overlay to show up so they can enter fullscreen
      }
      
      if (typeof window !== "undefined") {
        localStorage.removeItem(`exam-fullscreen-countdown-${attemptId}`);
      }
      setFullscreenCountdown(GRACE_PERIOD_SECONDS);
      updateFullscreenExitsCount(0);
      updateViolationsCount(0);

      // Give a grace window before counting restarts
      unblockGraceActiveRef.current = true;
      setTimeout(() => {
        unblockGraceActiveRef.current = false;
      }, UNBLOCK_GRACE_MS);
    }
    prevIsActiveRef.current = isActive;
  }, [isActive, attemptId, updateViolationsCount, updateFullscreenExitsCount]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Fullscreen enforcement
  //    Strategy:
  //    - On first session load/refresh: show lockdown overlay but NO violation
  //      reported until student has successfully entered fullscreen once.
  //    - After student enters fullscreen (hasEverBeenFullscreen = true):
  //      any subsequent exit is a real violation counted against their quota.
  //    - After unblock: hasEverBeenFullscreen resets to false + grace period.
  //
  //    CRITICAL: This effect MUST NOT depend on reportViolation directly.
  //    It uses reportViolationRef.current so the polling/event listeners are
  //    only set up ONCE (or when proctorFullscreen/enabled/isActive change)
  //    rather than on every parent re-render.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isActive || !proctorFullscreen || isMobileDevice()) {
      lockdownActiveRef.current = false;
      exitRecordedRef.current = false;
      setIsFullscreenRequired(false);
      return;
    }

    const updateSecurityStatus = () => {
      if (typeof window === "undefined" || typeof document === "undefined") return;

      const fsImmediate = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      const hasFocusImmediate = document.hasFocus();

      let sizeCorrect = true;
      if (fsImmediate) {
        if (fullscreenBaselineWidthRef.current !== null && fullscreenBaselineHeightRef.current !== null) {
          const baselineWidthDiff = Math.abs(window.outerWidth - fullscreenBaselineWidthRef.current);
          const baselineHeightDiff = Math.abs(window.outerHeight - fullscreenBaselineHeightRef.current);
          if (baselineWidthDiff > 15 || baselineHeightDiff > 15) {
            sizeCorrect = false;
          }
        } else {
          const widthDiff = Math.abs(window.outerWidth - window.screen.width);
          const heightDiff = Math.abs(window.outerHeight - window.screen.height);
          const isBrave = typeof navigator !== "undefined" && (navigator as any).brave !== undefined;
          const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isFirefox = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("firefox");
          const threshold = (isBrave || isSafari || isFirefox) ? 150 : 20;
          if (widthDiff > threshold || heightDiff > threshold) {
            sizeCorrect = false;
          }
        }
      } else {
        sizeCorrect = false;
      }

      setSecurityStatus({
        isFullscreen: fsImmediate,
        isFocused: hasFocusImmediate,
        isWindowSizeCorrect: sizeCorrect,
      });
    };

    // Perform an immediate synchronous check to enforce the lockdown overlay state
    // before the browser paints the questions (e.g. immediately upon unblocking).
    const checkImmediate = () => {
      updateSecurityStatus();
      if (isEnteringFullscreenRef.current) return;
      const fsImmediate = checkIsInHtmlFullscreen(
        fullscreenBaselineWidthRef.current,
        fullscreenBaselineHeightRef.current
      );
      const hasFocusImmediate = document.hasFocus();
      const isSecureShell = typeof window !== "undefined" && (window as any).secureBrowser !== undefined;
      const isSecureImmediate = fsImmediate && (isSecureShell || hasFocusImmediate);


      if (!isSecureImmediate) {
        if (!lockdownActiveRef.current) {
          lockdownActiveRef.current = true;
          setIsFullscreenRequired(true);
          const savedCount = localStorage.getItem(`exam-fullscreen-countdown-${attemptId}`);
          const initialCountdown = savedCount ? parseInt(savedCount, 10) : GRACE_PERIOD_SECONDS;
          setFullscreenCountdown(initialCountdown);
        }
      }
    };

    checkImmediate();

    const triggerLockdown = (countAsViolation: boolean) => {
      // DO NOT clear baseline dimensions here anymore to prevent the overlay bypass loop

      if (lockdownActiveRef.current) return; // already in lockdown, don't re-trigger
      lockdownActiveRef.current = true;
      exitRecordedRef.current = true;
      setIsFullscreenRequired(true);
      const savedCount = localStorage.getItem(`exam-fullscreen-countdown-${attemptId}`);
      const initialCountdown = savedCount ? parseInt(savedCount, 10) : GRACE_PERIOD_SECONDS;
      setFullscreenCountdown(initialCountdown);

      if (countAsViolation) {
        // Use ref to access latest reportViolation without needing it in deps
        reportViolationRef.current("FULLSCREEN_EXIT", "Student exited fullscreen mode.");
        // Capture webcam clip for this violation (no-op if proctorCamera disabled)
        captureWebcamClipRef.current("FULLSCREEN_EXIT", "Student exited fullscreen mode.");
        toast.error(
          "⚠️ Fullscreen exit detected! You have 45 seconds to return.",
          { id: "fs-warning", duration: 6000 }
        );
      } else {
        // First load / refresh / after unblock — show overlay silently
        toast("🔒 Please return to fullscreen to continue the exam.", {
          id: "fs-prompt",
          duration: 4000,
          icon: "🔒",
        });
      }
      updateSecurityStatus();
    };

    const clearLockdown = () => {
      // Mark that student has successfully been in fullscreen this session
      hasEverBeenFullscreenRef.current = true;

      // Record/overwrite fullscreen baseline dimensions if transitioning from lockdown or if null
      if (
        lockdownActiveRef.current ||
        fullscreenBaselineWidthRef.current === null ||
        fullscreenBaselineHeightRef.current === null
      ) {
        fullscreenBaselineWidthRef.current = window.outerWidth;
        fullscreenBaselineHeightRef.current = window.outerHeight;
      }

      if (!lockdownActiveRef.current) return;
      lockdownActiveRef.current = false;
      exitRecordedRef.current = false;
      setIsFullscreenRequired(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`exam-fullscreen-countdown-${attemptId}`);
      }
      setFullscreenCountdown(GRACE_PERIOD_SECONDS);
      // Clear unblock grace if active
      unblockGraceActiveRef.current = false;
      updateSecurityStatus();
    };

    const checkFullscreen = () => {
      updateSecurityStatus();
      if (!pollStartedRef.current) return;
      if (isEnteringFullscreenRef.current) return;

      // Stream health checks during active session
      if (enabled && isActive) {
        if (proctorCamera && cameraPermissionStateRef.current === "GRANTED") {
          const stream = webcamStreamRef.current;
          let cameraHealthOk = true;
          if (!stream) {
            cameraHealthOk = false;
          } else {
            const track = stream.getVideoTracks()[0];
            if (!track || track.readyState !== "live" || track.muted || !track.enabled) {
              cameraHealthOk = false;
            }
          }
          if (isCameraMutedRef.current !== !cameraHealthOk) {
            setIsCameraMuted(!cameraHealthOk);
          }
          if (!cameraHealthOk && !isCameraMutedRef.current) {
            reportViolationRef.current("WEBCAM_MUTED", "Webcam feed was muted, paused, or disabled.");
          }
        }

        if (proctorScreenShare && screenSharePermissionStateRef.current === "GRANTED") {
          const stream = screenShareStreamRef.current;
          let screenShareHealthOk = true;
          if (!stream) {
            screenShareHealthOk = false;
          } else {
            const track = stream.getVideoTracks()[0];
            if (!track || track.readyState !== "live" || track.muted || !track.enabled) {
              screenShareHealthOk = false;
            }
          }
          if (!screenShareHealthOk && isScreenShareActive) {
            setIsScreenShareActive(false);
            setScreenShareStream(null);
            screenShareStreamRef.current = null;
            setScreenSharePermissionState("DENIED");
            reportViolationRef.current(
              "SCREEN_SHARE_STOPPED",
              "Student stopped screen sharing during the exam."
            );
          }
        }
      }

      const fsImmediate = checkIsInHtmlFullscreen(
        fullscreenBaselineWidthRef.current,
        fullscreenBaselineHeightRef.current
      );
      const hasFocusImmediate = document.hasFocus();
      const isSecureShell = typeof window !== "undefined" && (window as any).secureBrowser !== undefined;
      const isSecureImmediate = fsImmediate && (isSecureShell || hasFocusImmediate);

      if (isSecureImmediate) {
        if (checkTimeoutRef.current) {
          clearTimeout(checkTimeoutRef.current);
          checkTimeoutRef.current = null;
        }
        clearLockdown();
      } else {
        // Clear any previous pending check
        if (checkTimeoutRef.current) {
          clearTimeout(checkTimeoutRef.current);
        }

        // Use 0ms for direct fullscreenchange events (already confirmed by browser API),
        // and a tiny 50ms debounce only for poll/resize/blur-triggered checks to
        // prevent flicker on legitimate focus transitions.
        const debounceMs = (typeof document !== "undefined" &&
          !!(document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement)) ? 0 : 50;

        checkTimeoutRef.current = setTimeout(() => {
          checkTimeoutRef.current = null;
          if (isEnteringFullscreenRef.current) return;
          
          const fsDelayed = checkIsInHtmlFullscreen(
            fullscreenBaselineWidthRef.current,
            fullscreenBaselineHeightRef.current
          );
          const hasFocusDelayed = document.hasFocus();
          const isSecureShell = typeof window !== "undefined" && (window as any).secureBrowser !== undefined;
          const isSecureDelayed = fsDelayed && (isSecureShell || hasFocusDelayed);

          if (isSecureDelayed) {
            clearLockdown();
          } else {
            // Not secure — determine if this should count as a violation.
            // If they are physically in fullscreen but just temporarily blurred,
            // we do NOT record a FULLSCREEN_EXIT violation (the blur listener 
            // already handles logging TAB_SWITCH).
            // But if they actually exited HTML5 fullscreen or resized the window,
            // we report a FULLSCREEN_EXIT.
            const shouldCountViolation =
              hasEverBeenFullscreenRef.current && !unblockGraceActiveRef.current;
            const isActualFullscreenExit = !fsDelayed;
            const countAsViolation = shouldCountViolation && isActualFullscreenExit;

            triggerLockdown(countAsViolation);
          }
        }, debounceMs);
      }
    };

    checkFullscreenRef.current = checkFullscreen;

    // Declare mutable interval, delay and handler variables at the top of the effect scope to avoid TDZ (temporal dead zone) ReferenceErrors in closures
    let pollInterval: NodeJS.Timeout | null = null;
    let startupDelay: NodeJS.Timeout | null = null;
    const handleFullscreenChange = () => checkFullscreen();

    // Start polling and event listeners immediately
    pollInterval = setInterval(checkFullscreen, POLL_INTERVAL_MS);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    window.addEventListener("resize", handleFullscreenChange);
    window.addEventListener("blur", handleFullscreenChange);
    window.addEventListener("focus", handleFullscreenChange);

    // Delayed start gives requestFullscreen() time to resolve after page load
    // Only schedule if not already started (persists across re-renders via ref)
    if (!pollStartedRef.current) {
      startupDelay = setTimeout(() => {
        pollStartedRef.current = true;
        checkFullscreen();
      }, STARTUP_GRACE_MS);
    } else {
      // If already started, check immediately
      checkFullscreen();
    }

    return () => {
      if (startupDelay) clearTimeout(startupDelay);
      if (pollInterval) clearInterval(pollInterval);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      window.removeEventListener("resize", handleFullscreenChange);
      window.removeEventListener("blur", handleFullscreenChange);
      window.removeEventListener("focus", handleFullscreenChange);
      checkFullscreenRef.current = null;
    };
    // NOTE: reportViolation deliberately omitted from deps — accessed via reportViolationRef
    // to prevent this effect from restarting on every parent render (timer tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctorFullscreen, enabled, isActive, attemptId]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. 45-second countdown → auto force-submit on expiry
  //    Only counts down when a REAL violation is active (hasEverBeenFullscreen)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isActive || !isFullscreenRequired || !proctorFullscreen || isMobileDevice()) return;

    // If not yet had a real session (first load), the countdown is informational only
    // — don't force-submit a student who just refreshed.
    const isRealViolation = hasEverBeenFullscreenRef.current;

    const interval = setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (typeof window !== "undefined") {
            localStorage.removeItem(`exam-fullscreen-countdown-${attemptId}`);
          }
          if (isRealViolation) {
            reportViolationRef.current(
              "FULLSCREEN_EXIT",
              "Student did not restore fullscreen within 45-second grace period."
            );
          } else {
            // Even if it's first load/refresh, log to DB that they failed to comply
            if (socketRef.current?.connected) {
              socketRef.current.emit("proctorEvent", {
                attemptId,
                eventType: "FULLSCREEN_EXIT",
                details: "Student failed to enter fullscreen mode on session start/resume within 45 seconds.",
              });
            }
          }
          if (onForceSubmitRef.current) {
            onForceSubmitRef.current(
              "Examination terminated: Fullscreen lockdown not restored within the permitted time."
            );
          }
          return 0;
        }
        const next = prev - 1;
        if (typeof window !== "undefined") {
          localStorage.setItem(`exam-fullscreen-countdown-${attemptId}`, String(next));
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // NOTE: onForceSubmit omitted — accessed via onForceSubmitRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreenRequired, enabled, isActive, attemptId, proctorFullscreen]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Tab switches & blur (no resize violation — handled by fullscreen check)
  //    Only count tab switches/blur if not currently in lockdown/overlay state
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
          tabSwitchTimeoutRef.current = null;
          toast.success("Focus restored. Tab switch not recorded.", { id: "focus-restored", duration: 2000 });
        }
        hasSwitchedAwayRef.current = false;
        return;
      }

      if (
        proctorTabSwitch &&
        document.visibilityState === "hidden" &&
        (hasEverBeenFullscreenRef.current || !proctorFullscreen) &&
        !isFullscreenRequired &&
        !unblockGraceActiveRef.current &&
        !hasSwitchedAwayRef.current
      ) {
        // Cancel any pending blur timer since we definitely switched tabs/minimized
        if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
          tabSwitchTimeoutRef.current = null;
        }
        hasSwitchedAwayRef.current = true;
        reportViolationRef.current("TAB_SWITCH", "Candidate switched browser tab or minimized window.");
      }
    };

    const handleBlur = () => {
      if (isMobileDevice()) return;
      if (
        proctorTabSwitch &&
        (hasEverBeenFullscreenRef.current || !proctorFullscreen) &&
        !isFullscreenRequired &&
        !unblockGraceActiveRef.current
      ) {
        // Only start the 5-second grace period if the page is still visible (focus loss only, not a tab switch)
        if (document.visibilityState === "visible") {
          if (tabSwitchTimeoutRef.current) {
            clearTimeout(tabSwitchTimeoutRef.current);
          }
          tabSwitchTimeoutRef.current = setTimeout(() => {
            tabSwitchTimeoutRef.current = null;
            reportViolationRef.current("TAB_SWITCH", "Candidate browser lost focus (active window change).");
          }, 5000);
        }
      }
    };

    const handleFocus = () => {
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
        tabSwitchTimeoutRef.current = null;
        toast.success("Focus restored. Tab switch not recorded.", { id: "focus-restored", duration: 2000 });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
      }
    };
    // NOTE: reportViolation omitted — accessed via reportViolationRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctorTabSwitch, enabled, isActive, isFullscreenRequired, proctorFullscreen]);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Developer tools detection
  //    Only track devtools if not currently in lockdown/overlay state
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isActive || !proctorDevTools || isMobileDevice()) return;

    const devToolsCheckInterval = setInterval(() => {
      if (
        (!hasEverBeenFullscreenRef.current && proctorFullscreen) ||
        lockdownActiveRef.current ||
        unblockGraceActiveRef.current
      ) {
        return;
      }
      const startTime = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        reportViolationRef.current("DEVTOOLS_DETECTED", "Developer console active (debugger trace delay detected).");
      }
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        reportViolationRef.current(
          "DEVTOOLS_DETECTED",
          `Side-docked inspector console detected. Width delta=${window.outerWidth - window.innerWidth}px.`
        );
      }
    }, 3000);

    return () => clearInterval(devToolsCheckInterval);
    // NOTE: reportViolation omitted — accessed via reportViolationRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctorDevTools, enabled, isActive, proctorFullscreen]);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Typing analytics & paste protection
  // ──────────────────────────────────────────────────────────────────────────
  const handleInputMonitoring = (
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const now = Date.now();

    keystrokeHistoryRef.current.push({ key: target.value.slice(-1), time: now });
    if (keystrokeHistoryRef.current.length > 50) keystrokeHistoryRef.current.shift();

    if (keystrokeHistoryRef.current.length >= 2) {
      const times = keystrokeHistoryRef.current.map((k) => k.time);
      const deltas: number[] = [];
      for (let i = 1; i < times.length; i++) deltas.push(times[i] - times[i - 1]);
      const avgInterval = deltas.reduce((acc, d) => acc + d, 0) / deltas.length;
      if (avgInterval < 5 && target.value.length > 30) {
        reportViolationRef.current(
          "KEYSTROKE_BURST",
          `Suspicious rapid text injection detected (avg interval ${avgInterval.toFixed(1)}ms).`
        );
      }
    }
  };



  // ─────────────────────────────────────────────────────────────────────────
  // WEBCAM RECORDING SERVICE (proctorCamera)
  // Records a 5-10 second clip on every FULLSCREEN_EXIT and queues upload
  // ─────────────────────────────────────────────────────────────────────────
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  const requestWebcamPermission = useCallback(async (): Promise<boolean> => {
    if (!proctorCamera) {
      setCameraPermissionState("GRANTED");
      return true;
    }
    setCameraPermissionState("NOT_REQUESTED");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 15 },
        },
        audio: false,
      });
      webcamStreamRef.current = stream;
      setWebcamStream(stream);
      setCameraPermissionState("GRANTED");
      setIsCameraMuted(false);
      return true;
    } catch (err: any) {
      console.warn("[Proctor] Webcam permission denied or unavailable:", err?.message);
      setCameraPermissionState("DENIED");
      setWebcamStream(null);
      webcamStreamRef.current = null;
      setIsCameraMuted(true);
      return false;
    }
  }, [proctorCamera]);

  // Acquire webcam permission once when camera proctoring is active
  useEffect(() => {
    if (!enabled || !proctorCamera) return;
    if (webcamStreamRef.current) {
      setWebcamStream(webcamStreamRef.current);
      setCameraPermissionState("GRANTED");
      setIsCameraMuted(false);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 15 },
        },
        audio: false,
      })
      .then((stream) => {
        if (!cancelled) {
          webcamStreamRef.current = stream;
          setWebcamStream(stream);
          setCameraPermissionState("GRANTED");
          setIsCameraMuted(false);
        }
      })
      .catch((err) => {
        console.warn("[Proctor] Webcam permission denied or unavailable:", err?.message);
        if (!cancelled) {
          setCameraPermissionState("DENIED");
          setIsCameraMuted(true);
        }
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, proctorCamera]);

  const captureWebcamClip = useCallback(
    async (eventType: string, details: string) => {
      if (!proctorCamera || isRecordingRef.current) return;
      const stream = webcamStreamRef.current;
      if (!stream) return;

      isRecordingRef.current = true;
      const chunks: BlobPart[] = [];
      let recorder: MediaRecorder;
      try {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        isRecordingRef.current = false;
        return;
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(1000); // Collect data every 1 second

      // Stop after 8 seconds
      await new Promise<void>((resolve) => setTimeout(resolve, 8000));
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      isRecordingRef.current = false;

      const blob = new Blob(chunks, { type: "video/webm" });
      if (blob.size === 0) return;

      // Enqueue for background upload (fault-tolerant)
      try {
        await idbEnqueue({
          attemptId,
          eventType,
          details,
          blob,
        });
        // Immediately attempt upload; failures are retried automatically on next event
        idbDequeueAndUpload().catch(() => {});
      } catch {
        // IDB write failed — attempt direct upload as fallback
        try {
          const formData = new FormData();
          formData.append("video", blob, `violation-${Date.now()}.webm`);
          formData.append("eventType", eventType);
          formData.append("details", details);
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const accessToken = localStorage.getItem("accessToken");
          await fetch(`${API_URL}/attempts/${attemptId}/violate-video`, {
            method: "POST",
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            body: formData,
          });
        } catch {
          // Silent fail — violation event already recorded via the /violate path
        }
      }
    },
    [attemptId, proctorCamera],
  );

  // Keep captureWebcamClip in a ref so event closures access the latest version
  const captureWebcamClipRef = useRef(captureWebcamClip);
  useEffect(() => {
    captureWebcamClipRef.current = captureWebcamClip;
  }, [captureWebcamClip]);

  // Retry any queued uploads whenever the browser is online
  useEffect(() => {
    if (!proctorCamera) return;
    const onOnline = () => idbDequeueAndUpload().catch(() => {});
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [proctorCamera]);

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN SHARE ENFORCEMENT (proctorScreenShare)
  // Shows browser screen-share picker; enforces entire-screen selection;
  // registers a violation if the share stream stops mid-exam.
  // Zero bytes are uploaded to the server — only the local stream is checked.
  // ─────────────────────────────────────────────────────────────────────────
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  const requestScreenShare = useCallback(async (): Promise<boolean> => {
    if (!proctorScreenShare) {
      setScreenSharePermissionState("GRANTED");
      return true;
    }
    setScreenShareError(null);
    setScreenSharePermissionState("NOT_REQUESTED");
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings() as any;

      // Enforce entire-screen selection — reject window/tab shares
      if (settings?.displaySurface && settings.displaySurface !== "monitor") {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setScreenShareError(
          "You must share your Entire Screen — not a window or browser tab. Please try again."
        );
        setIsScreenShareActive(false);
        setScreenShareStream(null);
        screenShareStreamRef.current = null;
        setScreenSharePermissionState("DENIED");
        return false;
      }

      screenShareStreamRef.current = stream;
      setScreenShareStream(stream);
      setIsScreenShareActive(true);
      setScreenSharePermissionState("GRANTED");

      // Detect if student stops sharing mid-exam
      track.addEventListener("ended", () => {
        setIsScreenShareActive(false);
        setScreenShareStream(null);
        screenShareStreamRef.current = null;
        setScreenSharePermissionState("DENIED");
        if (enabled && isActive) {
          reportViolationRef.current(
            "SCREEN_SHARE_STOPPED",
            "Student stopped screen sharing during the exam."
          );
          toast.error("⚠️ Screen sharing was stopped. Please resume screen sharing to continue.", {
            id: "screen-share-stopped",
            duration: 8000,
          });
        }
      });

      return true;
    } catch (err: any) {
      setScreenShareError("Screen sharing was cancelled or denied. It is required to start the exam.");
      setIsScreenShareActive(false);
      setScreenShareStream(null);
      screenShareStreamRef.current = null;
      setScreenSharePermissionState("DENIED");
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctorScreenShare, enabled, isActive]);

  // Stop screen share and webcam when component unmounts
  useEffect(() => {
    return () => {
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach((t) => t.stop());
        screenShareStreamRef.current = null;
      }
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, []);

  return {
    violations,
    isFullscreenRequired,
    fullscreenCountdown,
    fullscreenExitCount,
    requestFullscreen,
    handleInputMonitoring,
    isEnteringFullscreen,
    fullscreenTransitionState,
    securityStatus,
    desktopViolation,
    // Camera proctoring
    captureWebcamClip,
    webcamStream,
    cameraPermissionState,
    isCameraMuted,
    requestWebcamPermission,
    // Screen share enforcement
    isScreenShareActive,
    screenShareStream,
    screenSharePermissionState,
    screenShareError,
    requestScreenShare,
    requestScreenSharePermission: requestScreenShare,
  };
}
