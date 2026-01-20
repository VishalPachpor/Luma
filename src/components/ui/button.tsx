import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50";

        const variantStyles = {
            default: "bg-white text-black hover:bg-white/90",
            destructive: "bg-red-500 text-white hover:bg-red-500/90",
            outline: "border border-white/10 bg-transparent hover:bg-white/5",
            secondary: "bg-white/10 text-white hover:bg-white/20",
            ghost: "hover:bg-white/5",
            link: "text-white underline-offset-4 hover:underline",
        };

        const sizeStyles = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        };

        return (
            <button
                className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
