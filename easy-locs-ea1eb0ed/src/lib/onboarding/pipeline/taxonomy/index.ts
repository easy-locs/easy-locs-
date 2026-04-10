/**
 * Taxonomy Layer barrel.
 */
import type { TaxonomyLayerOutput } from "../contracts";
import type { Vertical } from "../../types";
import { inferVertical } from "./taxonomy.vertical.infer";
import { mapCategory } from "./taxonomy.category.map";

export { inferVertical } from "./taxonomy.vertical.infer";
export { mapCategory } from "./taxonomy.category.map";

export function runTaxonomyLayer(params: {
  hintVertical: Vertical;
  text: string;
  categories: string[];
  subcategories: string[];
  menuCount: number;
  roomCount: number;
  serviceCount: number;
  productCount: number;
}): TaxonomyLayerOutput {
  const inference = inferVertical(
    params.text,
    params.categories,
    params.menuCount,
    params.roomCount,
    params.serviceCount,
    params.productCount,
  );

  const vertical = inference.confidence > 0.6 ? inference.vertical : params.hintVertical;
  const mapping = mapCategory(vertical, params.categories, params.subcategories);

  return { inference, mapping };
}
