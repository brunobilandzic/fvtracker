import { DemoActionButton } from "@/components/layout/demoActions";
import React from "react";

export const SubmitButton = ({ handleSubmit, label = "Spremi promjene" , disabled}) => {
  return (
    <div>
      <DemoActionButton onClick={handleSubmit} disabled={disabled} className="mt-4 btn submitButton disabled:opacity-50 disabled:cursor-not-allowed" >
        {label}
      </DemoActionButton>
    </div>
  );
};

export default SubmitButton;
