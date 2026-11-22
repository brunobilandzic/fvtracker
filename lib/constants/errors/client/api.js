import { isDemoWriteBlocked } from "@/lib/api";
export const handleApiError = (error) => {
  if (isDemoWriteBlocked(error)) return;
  const errorMessage =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    error.name ||
    "Nepoznata greška";

  alert(`${error.generalMessage}: ${errorMessage}`);
};
