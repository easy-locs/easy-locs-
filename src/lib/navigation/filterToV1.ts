import { isV1CoreBlock } from "@/config/v1Scope";

export function filterMenuToV1<T extends { key: string }>(items: T[]) {
  return items.filter((item) => isV1CoreBlock(item.key));
}
