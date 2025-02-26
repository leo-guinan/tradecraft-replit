import { cn } from "@/lib/utils";

interface ClassificationStampProps extends React.HTMLAttributes<HTMLDivElement> {
  level: "top-secret" | "classified" | "confidential";
}

export function ClassificationStamp({ level, className, ...props }: ClassificationStampProps) {
  return (
    <div
      className={cn(
        "absolute -rotate-12 border-4 rounded px-4 py-1 font-mono text-xl uppercase tracking-wider",
        {
          "border-red-700 text-red-700": level === "top-secret",
          "border-amber-700 text-amber-700": level === "classified",
          "border-blue-700 text-blue-700": level === "confidential",
        },
        className
      )}
      {...props}
    >
      {level.replace("-", " ")}
    </div>
  );
}
