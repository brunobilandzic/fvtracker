"use client";

import { DemoActionLink } from "@/components/layout/demoActions";
import {
  FillPlanInfo,
  SelectField,
} from "@/components/cultivation/plans/planting/create";
import { useState } from "react";

export default function CreateHarvestingPlanPageComponent() {
  const [selectedField, setSelectedField] = useState(null);
  return (
    <>
      <div className="">
        <div className="font-bold text-3xl mb-2 underline">Izaberi polje:</div>
        <SelectField
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          plant={false}
        />
      </div>
      {selectedField ? (
        <div className="card mt-4">
          <FillPlanInfo selectedField={selectedField} plant={false} />
        </div>
      ) : null}
    </>
  );
}

export const CreateHarvestingPlanLink = ({}) => {
  return (
    <>
      <DemoActionLink href={"/plan-berbe/izradi"} className="btn">Izradi plan berbe</DemoActionLink>
    </>
  );
};
