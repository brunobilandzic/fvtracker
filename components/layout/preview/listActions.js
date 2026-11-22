import { DemoActionButton } from "@/components/layout/demoActions";

export const ListHeaderShowButton = ({ label, isOpen, setOpen, onClose }) => {
  const handleClick = () => {
    if (isOpen) {
      onClose();
    } else {
      setOpen(true);
    }
  };
  return (
    <div
      className={`btn btnSm ${isOpen ? "outline" : ""}`}
      onClick={handleClick}
    >
      {label}
    </div>
  );
};

export const ActionOptions = ({ options }) => {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {options.map((option) => {
        return (
          <DemoActionButton
            className={`btn btnSm ${option.className}`}
            onClick={option.onClick}
            mutatesData={option.mutatesData}
            key={option.label}
          >
            {option.label}
          </DemoActionButton>
        );
      })}
    </div>
  );
};

export const CreateListItemButton = ({ onCreate, label }) => {
  return (
    <DemoActionButton className="btn submitButton btnSm" onClick={onCreate}>
      {label || "Dodaj"}
    </DemoActionButton>
  );
};
export const DeleteListButton = ({ onDelete, label }) => {
  return (
    <DemoActionButton className="btn cancelButton btnSm" onClick={onDelete}>
      {label || "Obriši sve"}
    </DemoActionButton>
  );
};
