import { cn } from '@/lib/utils';
import * as React from "react"

function getInitials(name?: string | null) {
    if (!name) return '??';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string | null;
    alt?: string | null;
    fallback?: string | null;
}

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
    const [hasError, setHasError] = React.useState(false);

    if (src && !hasError) {
        return (
            <img
                src={src}
                alt={alt || "Avatar"}
                className={cn("h-10 w-10 rounded-full object-cover border border-white/10", className)}
                onError={() => setHasError(true)}
                {...props as any}
            />
        );
    }

    return (
        <div
            className={cn(
                "h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white/80 border border-white/10",
                className
            )}
            {...props}
        >
            {getInitials(fallback || alt)}
        </div>
    );
}
