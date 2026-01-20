"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Context to share state between components
interface SelectContextType {
    value: string | undefined;
    onValueChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}
const SelectContext = React.createContext<SelectContextType | null>(null);

const Select = ({ value, onValueChange, children }: { value?: string, onValueChange?: (val: string) => void, children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);

    // Close on outside click could be added here, simplified for now

    return (
        <SelectContext.Provider value={{ value, onValueChange: onValueChange || (() => { }), open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectTrigger must be used within Select");

    return (
        <button
            ref={ref}
            onClick={() => context.setOpen(!context.open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    return (
        <span
            ref={ref}
            className={cn("pointer-events-none", className)}
            {...props}
        >
            {context?.value || placeholder}
        </span>
    )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    if (!context?.open) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 mt-1",
                className
            )}
            {...props}
        >
            <div className="p-1 max-h-60 overflow-y-auto">
                {children}
            </div>
        </div>
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
        <div
            ref={ref}
            onClick={() => {
                context?.onValueChange(value);
                context?.setOpen(false);
            }}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                className
            )}
            {...props}
        >
            {isSelected && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                </span>
            )}
            {children}
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export {
    Select,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
}
