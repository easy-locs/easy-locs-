export function AppPageShell(props: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{props.title}</h1>
        {props.actions}
      </div>
      {props.children}
    </div>
  );
}
