"use client";

import { useActionState, useState } from "react";
import { FaChartLine, FaIndustry, FaSeedling, FaUser, FaWarehouse } from "react-icons/fa";
import { signInDemo } from "@/app/demo-sign-in";

const icons = {
  cultivation: FaSeedling,
  production: FaIndustry,
  warehouse: FaWarehouse,
  financial: FaChartLine,
};

const groups = [
  { title: "Menad\u017eeri", isWorker: false },
  { title: "Radnici", isWorker: true },
];

export default function DemoRoleCards({ roles }) {
  const [state, action, pending] = useActionState(signInDemo, null);
  const [selected, setSelected] = useState(null);
  const error = !pending && state?.error && (
    <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );

  return (
    <section aria-labelledby="demo-roles-title" className="mx-auto mt-4 max-w-6xl pb-8">
      <div className="mb-6 text-center">
        <h2 id="demo-roles-title" className="text-2xl font-bold sm:text-3xl">Isprobajte FVTracker</h2>
        <p className="mt-2 text-sm text-gray-600">
          Odaberite ulogu i pregledajte demonstracijske podatke.
        </p>
      </div>
      <form action={action} aria-busy={pending} className="space-y-6">
        {groups.map(({ title: groupTitle, isWorker }) => (
          <div key={groupTitle}>
            <h3 className="mb-3 text-lg font-semibold">{groupTitle}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roles.filter(role => role.isWorker === isWorker).map(({ id, title, description }) => {
                const Icon = isWorker ? FaUser : icons[id];
                return (
                  <article key={id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
                    <div className="w-fit rounded-lg bg-green-50 p-3 text-green-800">
                      <Icon aria-hidden="true" />
                    </div>
                    <h4 className="font-semibold leading-snug">{title}</h4>
                    <p className="flex-1 text-sm leading-relaxed text-gray-600">{description}</p>
                    <button
                      type="submit"
                      name="role"
                      value={id}
                      aria-label={"Isprobaj: " + title}
                      disabled={pending}
                      onClick={() => setSelected(id)}
                      className="mt-2 rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {pending && selected === id ? "Prijava u tijeku..." : "Isprobaj"}
                    </button>
                    {selected === id && error}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </form>
      {!selected && error}
    </section>
  );
}
