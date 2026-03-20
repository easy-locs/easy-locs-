import { cn } from "@/lib/utils";

export function DefaultMessageBubble(props: {
  mine?: boolean;
  body: string;
  createdAt?: string;
}) {
  return (
    <div className={cn("flex", props.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
          props.mine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{props.body}</p>
        {props.createdAt && (
          <span className={cn(
            "block text-[10px] mt-1 text-right",
            props.mine ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {new Date(props.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
