import { notFound } from "next/navigation";
import { fetchManager } from "@/lib/auth/fetchSessionData";
import EditProductPageComponent from "@/components/production/products/edit";
import { getProductBySlug } from "@/lib/production/product";
import { sanitize } from "@/lib/utils/objects";

const EditProductPage = async ({ params }) => {
  const { unauthorized } = await fetchManager({ managerNames: ["ProductionManager"] });
  if (unauthorized) notFound();
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <EditProductPageComponent product={sanitize(product)} />
    </div>
  );
};

export default EditProductPage;
