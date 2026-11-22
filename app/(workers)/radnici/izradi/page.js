import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/demoMode";
import { CreateWorker } from "@/components/workers/create";
import React from "react";

function CreateWorkerPage() {
  if (isDemoMode()) notFound();
  return (
    <div>
      <CreateWorker />
    </div>
  );
}

export default CreateWorkerPage;
