/**
 * Correlation Middleware
 * 
 * Next.js middleware to establish correlation context for all requests.
 * Adds correlation headers to responses for debugging.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    CORRELATION_HEADER,
    REQUEST_ID_HEADER,
} from './context';

/**
 * Middleware to add correlation headers to every request/response.
 * The actual context scope is established in API route handlers.
 */
export function correlationMiddleware(request: NextRequest): NextResponse {
    const correlationId = request.headers.get(CORRELATION_HEADER) || crypto.randomUUID();
    const requestId = crypto.randomUUID();

    // Clone request with correlation headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(CORRELATION_HEADER, correlationId);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);

    // Create response with correlation headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Add headers to response for debugging
    response.headers.set(CORRELATION_HEADER, correlationId);
    response.headers.set(REQUEST_ID_HEADER, requestId);

    return response;
}

// ============================================================================
// API Route Wrapper
// ============================================================================

import { withCorrelation, extractFromHeaders } from './context';
import type { NextRequest as Req } from 'next/server';

type RouteHandler = (request: Req, context?: any) => Promise<Response>;

/**
 * Wrap an API route handler with correlation context.
 * 
 * Usage:
 *   export const GET = withCorrelatedRoute(async (request) => {
 *     // All emit() calls inside will share the same correlationId
 *     return NextResponse.json({ ok: true });
 *   });
 */
export function withCorrelatedRoute(handler: RouteHandler): RouteHandler {
    return async (request: Req, context?: any) => {
        const headerContext = extractFromHeaders(request.headers);

        // Get user ID from auth header if available
        const authHeader = request.headers.get('authorization');
        let userId: string | undefined;

        if (authHeader) {
            // Extract user ID from token (simplified - in production use proper verification)
            // This is just for correlation, not auth
            try {
                const token = authHeader.replace('Bearer ', '');
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.sub || payload.user_id;
            } catch {
                // Ignore - token parsing failed
            }
        }

        return withCorrelation(
            {
                ...headerContext,
                userId,
            },
            () => handler(request, context)
        );
    };
}
