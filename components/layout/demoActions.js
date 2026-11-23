"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiLock } from "react-icons/fi";
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
          className="pointer-events-none fixed left-1/2 top-1/2 z-[10000] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
        >
          {visible && (
            <div className="rounded-xl border border-green-200 border-t-4 border-t-green-700 bg-white px-5 py-4 text-center shadow-2xl ring-1 ring-black/10">
              <span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-green-100 text-green-800">
                <FiLock aria-hidden="true" size={18} />
              </span>
              <p className="text-base font-bold text-green-900">Demonstracijski način rada</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-gray-800">Izmjene podataka nisu dopuštene u demo verziji.</p>
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
