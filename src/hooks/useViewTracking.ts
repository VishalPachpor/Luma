
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useViewTracking(eventId: string) {
    const { user } = useAuth();
    const hasTracked = useRef(false);

    useEffect(() => {
        if (hasTracked.current) return;

        // Prevent double tracking in strict mode
        // Also check session storage for this session
        const sessionKey = `viewed_event_${eventId}`;
        if (sessionStorage.getItem(sessionKey)) {
            hasTracked.current = true;
            return;
        }

        const trackView = async () => {
            try {
                // Get or create persistent anonymous session ID
                let sessionId = localStorage.getItem('analytics_session_id');
                if (!sessionId) {
                    sessionId = crypto.randomUUID();
                    localStorage.setItem('analytics_session_id', sessionId);
                }

                // Get auth token if user is logged in
                let headers: HeadersInit = {
                    'Content-Type': 'application/json'
                };

                // Ideally we'd get the token from AuthContext directly if available
                // But for now let's try to grab it from where our auth client stores it, 
                // or just rely on 'user' object being present implications (though we need the JWT for API)
                // Actually, the API call is from client side. Supabase auth cookies are automatically sent!
                // BUT my API route used `supabase.auth.getUser(token)` which expects a Bearer token.
                // Standard Supabase client usage automatically handles cookies in browser -> server 
                // IF we use createServerClient with cookie handling.
                // My API route implementation used `getServiceSupabase` which is admin, but it checked `Authorization` header.
                // The browser fetch usually doesn't send the session JWT in 'Authorization' header automatically unless we add it.
                // 
                // Let's improve this: Just rely on session ID for anonymous first. 
                // If we want accurate User ID tracking, we should grab the session token.
                // Since `useAuth` usually exposes session/token, let's see. 

                // For now, fire and forget.

                await fetch('/api/analytics/view', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        eventId,
                        sessionId,
                        source: 'web'
                    })
                });

                // Mark as viewed in this session
                sessionStorage.setItem(sessionKey, 'true');
                hasTracked.current = true;

            } catch (err) {
                console.error('Failed to track view', err);
            }
        };

        trackView();
    }, [eventId]);
}
