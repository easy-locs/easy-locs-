import { Suspense, lazy, type ComponentProps } from "react";

const LazyChartContainer = lazy(() =>
  import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer }))
);

export function ChartContainerLazy(props: ComponentProps<typeof LazyChartContainer>) {
  return (
    <Suspense
      fallback={
        <div className="flex aspect-video items-center justify-center text-muted-foreground text-sm">
          Loading chart…
        </div>
      }
    >
      <LazyChartContainer {...props} />
    </Suspense>
  );
}

export { LazyChartContainer };
