import { PageShell } from "@/components/ui/page-shell";

/**
 * @deprecated Use `PageShell` from `@/components/ui/page-shell` instead.
 */
export function AppPageShell(props: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <PageShell title={props.title} actions={props.actions} maxWidth="xl">
      {props.children}
    </PageShell>
  );
}
