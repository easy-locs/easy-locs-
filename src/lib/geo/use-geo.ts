import { useGeoStore } from "./geo-store";

export function useGeo() {
  const point = useGeoStore((s) => s.point);
  const loading = useGeoStore((s) => s.loading);
  const ready = useGeoStore((s) => s.ready);
  const error = useGeoStore((s) => s.error);
  const permission = useGeoStore((s) => s.permission);

  return {
    point,
    loading,
    ready,
    error,
    permission,
    hasLocation: !!point,
  };
}
