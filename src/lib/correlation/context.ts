/**
 * Correlation Context
 * 
 * Request-scoped correlation ID propagation using AsyncLocalStorage.
 * Ensures all events, logs, and async operations share the same correlation ID.
 * 
 * Usage:
 *   // In API route or middleware:
 *   withCorrelation(correlationId, async () => {
 *     // All emit() calls inside will use this correlationId
 *   });
 */

import { AsyncLocalStorage } from 'async_hooks';

// ============================================================================
// Types
// ============================================================================

export interface CorrelationContext {
    correlationId: string;
    causationId?: string;
    requestId?: string;
    userId?: string;
    spanId?: string;
}

// ============================================================================
// Storage
// ============================================================================

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

// ============================================================================
// Context API
// ============================================================================

/**
 * Run a function with correlation context.
 * All nested calls to getCorrelationId() will return this context.
 */
export function withCorrelation<T>(
    context: Partial<CorrelationContext>,
    fn: () => T
): T {
    const fullContext: CorrelationContext = {
        correlationId: context.correlationId || crypto.randomUUID(),
        causationId: context.causationId,
        requestId: context.requestId || crypto.randomUUID(),
        userId: context.userId,
        spanId: crypto.randomUUID().slice(0, 8),
    };

    return correlationStorage.run(fullContext, fn);
}

/**
 * Get the current correlation context.
 * Returns undefined if not in a correlation scope.
 */
export function getCorrelationContext(): CorrelationContext | undefined {
    return correlationStorage.getStore();
}

/**
 * Get the current correlation ID.
 * Generates a new one if not in a correlation scope.
 */
export function getCorrelationId(): string {
    return getCorrelationContext()?.correlationId || crypto.randomUUID();
}

/**
 * Get the current causation ID (for event chaining).
 */
export function getCausationId(): string | undefined {
    return getCorrelationContext()?.causationId;
}

/**
 * Get the current request ID.
 */
export function getRequestId(): string | undefined {
    return getCorrelationContext()?.requestId;
}

/**
 * Get the current user ID from context.
 */
export function getContextUserId(): string | undefined {
    return getCorrelationContext()?.userId;
}

// ============================================================================
// Header Utilities
// ============================================================================

export const CORRELATION_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';
export const CAUSATION_HEADER = 'x-causation-id';

/**
 * Extract correlation context from request headers.
 */
export function extractFromHeaders(headers: Headers): Partial<CorrelationContext> {
    return {
        correlationId: headers.get(CORRELATION_HEADER) || undefined,
        requestId: headers.get(REQUEST_ID_HEADER) || undefined,
        causationId: headers.get(CAUSATION_HEADER) || undefined,
    };
}

/**
 * Create headers object from correlation context.
 */
export function toHeaders(context: CorrelationContext): Record<string, string> {
    const headers: Record<string, string> = {
        [CORRELATION_HEADER]: context.correlationId,
    };

    if (context.requestId) {
        headers[REQUEST_ID_HEADER] = context.requestId;
    }
    if (context.causationId) {
        headers[CAUSATION_HEADER] = context.causationId;
    }

    return headers;
}

// ============================================================================
// Logging Helper
// ============================================================================

/**
 * Create a logger that includes correlation context.
 */
export function createCorrelatedLogger(prefix: string) {
    return {
        info: (message: string, data?: Record<string, unknown>) => {
            const ctx = getCorrelationContext();
            console.log(`[${prefix}]`, message, {
                ...data,
                correlationId: ctx?.correlationId,
                requestId: ctx?.requestId,
            });
        },
        error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
            const ctx = getCorrelationContext();
            console.error(`[${prefix}]`, message, {
                ...data,
                error,
                correlationId: ctx?.correlationId,
                requestId: ctx?.requestId,
            });
        },
    };
}
