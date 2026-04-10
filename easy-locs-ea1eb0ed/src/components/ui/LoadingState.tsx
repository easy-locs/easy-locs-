import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  variant?: "cards" | "list" | "page";
}

const LoadingState = ({ className, variant = "cards" }: LoadingStateProps) => {
  return <div className={cn("min-h-[200px]", className)} />;
};

export { LoadingState };
export type { LoadingStateProps };
