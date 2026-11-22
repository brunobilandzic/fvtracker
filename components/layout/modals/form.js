import { DemoActionButton } from "@/components/layout/demoActions";
import Modal, { ModalFooter } from "./modal";

export function FormModal({
  isOpen,
  onCancel,
  onSubmit,
  title,
  children,
  invertColor,
  submitDisabled,
  submitText = "Spremi",
}) {
  return (
    <Modal
      invertColor={invertColor}
      isOpen={isOpen}
      onCancel={onCancel}
      title={title}
    >
      {" "}
      {children}
      <FormModalFooter
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitDisabled={submitDisabled}
        submitText={submitText}
      />
    </Modal>
  );
}

function FormModalFooter({ onCancel, onSubmit, submitDisabled, submitText }) {
  return (
    <ModalFooter>
      <div onClick={onCancel} className="btn cancelButton">
        Odustani
      </div>
      <DemoActionButton
        onClick={onSubmit}
        className="btn submitButton disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitDisabled}
      >
        {submitText}
      </DemoActionButton>
    </ModalFooter>
  );
}

export function UpdateModal({
  onDelete,
  title,
  isOpen,
  onCancel,
  onSubmit,
  children,
  submitDisabled
}) {
  return (
    <FormModal
      isOpen={isOpen}
      onCancel={onCancel}
      title={title}
      onSubmit={onSubmit}
      submitDisabled={submitDisabled}
    >
      <div className="flex items-center justify-end w-full pr-4 ">
        <DemoActionButton onClick={onDelete} className={`btn cancelButton btnSm `}>
          Obriši
        </DemoActionButton>
      </div>
      {children}
    </FormModal>
  );
}
