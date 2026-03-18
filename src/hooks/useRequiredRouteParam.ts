import { useParams } from "react-router-dom";

export function useRequiredRouteParam(key: string): string {
  const params = useParams();
  const value = params[key];
  if (!value) throw new Error(`Missing required route param: ${key}`);
  return value;
}
