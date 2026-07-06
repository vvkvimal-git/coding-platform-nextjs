import { useEffect, useState, type RefObject } from "react";

export function useInView(ref: RefObject<HTMLElement | null>, options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        // Once it's in view, we don't need to observe it anymore
        observer.unobserve(el);
      }
    }, options);

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return inView;
}
