"use client";

import { useActionState, useRef, useState } from "react";
import { FiArrowRight, FiBriefcase, FiUsers } from "react-icons/fi";
import { LuChartNoAxesCombined, LuFactory, LuSprout, LuWarehouse } from "react-icons/lu";
import { signInDemo } from "@/app/demo-sign-in";

const icons = {
  cultivation: LuSprout,
  worker: LuSprout,
  production: LuFactory,
  "production-worker": LuFactory,
  warehouse: LuWarehouse,
  "warehouse-worker": LuWarehouse,
  financial: LuChartNoAxesCombined,
  "financial-worker": LuChartNoAxesCombined,
};

const tabs = [
  { id: "managers", title: "Menad\u017eeri", isWorker: false, Icon: FiBriefcase },
  { id: "workers", title: "Radnici", isWorker: true, Icon: FiUsers },
];

export default function DemoRoleCards({ roles }) {
  const [state, action, pending] = useActionState(signInDemo, null);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const tabButtons = useRef([]);
  const activeRoles = roles.filter(role => role.isWorker === tabs[activeTab].isWorker);
  const error = !pending && state?.error && (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );

  function handleTabKey(event, index) {
    const destination = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    setActiveTab(destination);
    tabButtons.current[destination]?.focus();
  }

  return (
    <section aria-labelledby="demo-roles-title" className="mt-7 border-t border-[#dce5db] pt-5 sm:mt-8 sm:pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="demo-roles-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
          Odaberite ulogu za pregled
        </h2>
        <div role="tablist" aria-labelledby="demo-roles-title" className="inline-flex gap-1 rounded-xl border border-[#dce5db] bg-[#eaf0e8] p-1">
          {tabs.map(({ id, title, Icon }, index) => {
            const current = index === activeTab;
            return (
              <button
                key={id}
                ref={button => { tabButtons.current[index] = button; }}
                type="button"
                role="tab"
                id={`demo-tab-${id}`}
                aria-controls={`demo-panel-${id}`}
                aria-selected={current}
                tabIndex={current ? 0 : -1}
                onClick={() => setActiveTab(index)}
                onKeyDown={event => handleTabKey(event, index)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${current ? "bg-white text-[#1a4934] shadow-sm ring-1 ring-black/5" : "text-slate-600 hover:bg-white/60 hover:text-[#1a4934]"}`}
              >
                <Icon aria-hidden="true" size={15} />
                {title}
              </button>
            );
          })}
        </div>
      </div>
      <p role="status" className="sr-only">{pending ? "Prijava u tijeku." : ""}</p>
      {error && !activeRoles.some(role => role.id === selected) && <div className="mb-3">{error}</div>}
      <form action={action} aria-busy={pending}>
        {tabs.map(({ id: tabId, isWorker }, index) => (
          <div
            key={tabId}
            id={`demo-panel-${tabId}`}
            role="tabpanel"
            aria-labelledby={`demo-tab-${tabId}`}
            hidden={index !== activeTab}
          >
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {roles.filter(role => role.isWorker === isWorker).map(({ id, title, description }) => {
                const Icon = icons[id];
                return (
                  <article key={id} className="flex min-w-0 flex-col rounded-2xl border border-[#dce5db] bg-white p-4 shadow-[0_1px_2px_#172c220a] transition-colors hover:border-emerald-400/60 focus-within:border-emerald-500 sm:p-5">
                    <span className="grid size-10 place-items-center rounded-xl border border-[#e3eee5] bg-[#f0f7f1] text-[#276046]">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <h3 className="mt-3 font-semibold leading-snug tracking-tight">{title}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
                    <button
                      type="submit"
                      name="role"
                      value={id}
                      aria-label={"Isprobaj: " + title}
                      disabled={pending}
                      onClick={() => setSelected(id)}
                      className="mt-4 flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#dce9df] bg-[#f4f8f4] px-3 py-2 text-left text-sm font-semibold text-[#1c5239] transition-colors hover:border-[#1b543d] hover:bg-[#1b543d] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-70"
                    >
                      {pending && selected === id ? "Prijava u tijeku..." : "Isprobaj"}
                      {pending && selected === id ? (
                        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
                      ) : <FiArrowRight aria-hidden="true" className="shrink-0" size={16} />}
                    </button>
                    {selected === id && error && <div className="mt-2">{error}</div>}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </form>
    </section>
  );
}
