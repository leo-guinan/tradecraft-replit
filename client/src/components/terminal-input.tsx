import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { forwardRef } from "react";

export interface TerminalInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

export const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, prefix = "$", ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 font-mono text-[#00ff00]">{prefix}</span>
        <Input
          ref={ref}
          className={cn(
            "pl-8 font-mono bg-[#0a0a0a] border-[#1a1a1a] text-[#00ff00] placeholder:text-[#004400]",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
TerminalInput.displayName = "TerminalInput";
