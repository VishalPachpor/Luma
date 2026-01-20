/**
 * Calendar Newsletters Tab
 * Coming soon placeholder
 */

import { Mail } from 'lucide-react';

export default function CalendarNewslettersPage() {
    return (
        <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Newsletters</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Send email updates to your audience. This feature is coming soon.
            </p>
            <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Coming Soon
            </div>
        </div>
    );
}
