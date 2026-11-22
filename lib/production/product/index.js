import { Product } from "@/models/sectors/production/Product";
import { populateIngredientsConfig, updateIngredients } from "./ingredients";
import { makeUrlFriendly } from "@/lib/utils/strings";
import { ProductionManager } from "@/models/user/managers/ProductionManager";

export const getProducts = async () => {
  const products = await Product.find()
    .sort({ name: 1 })
    .collation({ locale: "hr", strength: 2 })
    .populate([populateIngredientsConfig]);
  return products;
};

export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug }).populate([
    {
      path: "ingredients",
      select: "cropVariety quantity quality",
      populate: {
        path: "cropVariety",
        select: "name cropType",
        populate: {
          path: "cropType",
          select: "name generalType",
        },
      },
    },
  ]);
  return product;
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error(`Product with id ${id} not found.`);
  }
  return product;
};

export const updateProduct = async ({ _updatedProduct, productId }) => {
  const { ingredients: updatedIngredients, name, description, price, stockVolume } = _updatedProduct;
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { name, description, price, stockVolume } },
    { new: true },
  );

  await product.populate({
    path: "ingredients",
    populate: { path: "cropVariety", select: "name cropType" },
  });

  const ingredientIds = await updateIngredients({
    ingredientsDb: product.ingredients,
    updatedIngredients,
    productId: product._id,
  });
  product.ingredients = ingredientIds;

  await product.populate(populateIngredientsConfig);
  const newSlug = makeUrlFriendly(name);
  product.slug = newSlug;

  await product.save();
  return product;
};

export const createProduct = async ({ _newProductData }) => {
  const { ingredients: newIngredients, name, description, price, stockVolume } = _newProductData;
  const productionManager =
    await ProductionManager.findOne().select("products _id");
  const product = await Product.create({
    name, description, price, stockVolume,
    productionManager: productionManager._id,
    slug: makeUrlFriendly(name),
  });

  await product.createIngredients({ ingredientsData: newIngredients });
  productionManager.products.push(product._id);
  await productionManager.save();
  await product.populate(populateIngredientsConfig);
  return product;
};

export const deleteProducts = async ({ productIds }) => {
  const product = await Product.deleteMany({ _id: { $in: productIds } });
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
};

export const populateProductsConfig = [
  {
    path: "products",
    populate: populateIngredientsConfig,
  },
];
