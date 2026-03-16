import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePaginationOptions {
  table: string;
  pageSize?: number;
  orgId: string | null;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
}

interface PaginationResult<T> {
  data: T[];
  page: number;
  totalCount: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
}

export function usePagination<T = any>({
  table,
  pageSize = 25,
  orgId,
  orderBy = "created_at",
  ascending = false,
  filters = {},
}: UsePaginationOptions): PaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      if (!orgId) return;
      setLoading(true);
      setError(null);

      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(table as any)
        .select("*", { count: "exact" })
        .eq("org_id", orgId)
        .order(orderBy, { ascending })
        .range(from, to);

      // Apply additional filters
      const parsedFilters = JSON.parse(filtersKey) as Record<string, unknown>;
      Object.entries(parsedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query = query.eq(key, value as any);
        }
      });

      const { data: rows, error: err, count } = await query;

      if (err) {
        setError(err.message);
        setData([]);
      } else {
        setData((rows || []) as T[]);
        setTotalCount(count ?? 0);
      }
      setPage(pageNum);
      setLoading(false);
    },
    [orgId, table, pageSize, orderBy, ascending, filtersKey]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const goToPage = useCallback(
    (p: number) => {
      const clamped = Math.max(0, Math.min(p, totalPages - 1));
      fetchPage(clamped);
    },
    [fetchPage, totalPages]
  );

  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page]);
  const refresh = useCallback(() => fetchPage(page), [fetchPage, page]);

  // Auto-fetch on mount / when orgId changes
  useEffect(() => {
    if (orgId) fetchPage(0);
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    page,
    totalCount,
    totalPages,
    loading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refresh,
  };
}
