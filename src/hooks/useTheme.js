import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Circular theme wipe via the View Transitions API.
 * Falls back to an instant swap when the API or motion is unavailable.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("if-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("if-theme", theme);
  }, [theme]);

  const toggle = (event) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("if-theme", next);
      flushSync(() => setTheme(next));
    };

    if (!document.startViewTransition || prefersReducedMotion()) {
      apply();
      return;
    }

    const el = event?.currentTarget;
    const rect = el?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(apply);
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    }).catch(() => {
      /* transition aborted */
    });
  };

  return { theme, toggle };
}
