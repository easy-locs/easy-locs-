import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { createElement } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      offset={16}
      icons={{
        success: createElement(CheckCircle2, {
          className: "w-4 h-4",
          style: { color: "hsl(var(--brand-primary))" },
        }),
        error: createElement(AlertCircle, {
          className: "w-4 h-4 text-destructive",
        }),
      }}
      style={
        {
          "--offset-bottom":
            "calc(var(--mobile-bottom-nav-h, 76px) + var(--app-safe-bottom, 0px) + 14px)",
          zIndex: 10000,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:border-l-2 group-[.toaster]:border-l-[hsl(var(--brand-primary)/0.3)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-[hsl(var(--brand-primary)/0.6)]",
          error: "group-[.toaster]:border-l-destructive/60",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
