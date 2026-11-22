"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { interceptDemoWrites } from "@/lib/api";

const DemoActionContext = createContext({ demoMode: false, notify: () => {} });

export function DemoActionProvider({ demoMode, children }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const notify = useCallback(() => {
    if (timer.current !== null) return;

    setVisible(true);
    timer.current = window.setTimeout(() => {
      setVisible(false);
      timer.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    if (!demoMode) return;
    const removeInterceptor = interceptDemoWrites(notify);

    return () => {
      removeInterceptor();
      window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [demoMode, notify]);

  return (
    <DemoActionContext.Provider value={{ demoMode, notify }}>
      {children}
      {demoMode && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[10000] sm:left-auto sm:right-4 sm:w-96"
        >
          {visible && (
            <div className="rounded-lg border-l-4 border-[var(--navbar-bg)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] shadow-lg ring-1 ring-black/10">
              <p className="font-semibold">Demonstracijski način rada</p>
              <p className="mt-1">Izmjene podataka nisu dopuštene u demo verziji.</p>
            </div>
          )}
        </div>
      )}
    </DemoActionContext.Provider>
  );
}

export function DemoActionButton({ onClick, mutatesData = true, disabled, ...props }) {
  const { demoMode, notify } = useContext(DemoActionContext);
  const blocked = demoMode && mutatesData;

  function handleClick(event) {
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      notify();
      return;
    }
    onClick?.(event);
  }

  return <button type="button" {...props} disabled={disabled && !blocked} onClick={handleClick} />;
}

export function DemoActionLink({ href, children, className }) {
  const { demoMode } = useContext(DemoActionContext);
  if (demoMode) return <DemoActionButton className={className}>{children}</DemoActionButton>;
  return <Link href={href} className={className}>{children}</Link>;
}
