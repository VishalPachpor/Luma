/**
 * Ticket Tiers API
 * GET: List all tiers for an event
 * POST: Create a new tier (organizer only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import * as ticketRepo from '@/lib/repositories/ticket.repository';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/events/[id]/tickets - List ticket tiers
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;

        const tiers = await ticketRepo.getTicketTiers(eventId);

        return NextResponse.json({ tiers });
    } catch (error: any) {
        console.error('[TicketsAPI] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/events/[id]/tickets - Create a ticket tier
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const body = await request.json();

        // Auth check
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check ownership
        const { data: event } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Only the organizer can create ticket tiers' }, { status: 403 });
        }

        // Validate input
        const { name, description, price, currency, type, inventory, maxPerOrder, salesStart, salesEnd } = body;

        if (!name || price === undefined || !type || inventory === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: name, price, type, inventory' },
                { status: 400 }
            );
        }

        const tier = await ticketRepo.createTicketTier(eventId, {
            name,
            description,
            price: parseFloat(price),
            currency: currency || 'ETH',
            type,
            inventory: parseInt(inventory),
            maxPerOrder: maxPerOrder ? parseInt(maxPerOrder) : undefined,
            salesStart,
            salesEnd,
        });

        return NextResponse.json({ tier }, { status: 201 });
    } catch (error: any) {
        console.error('[TicketsAPI] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/events/[id]/tickets - Update a ticket tier
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const body = await request.json();
        const { tierId, ...updates } = body;

        if (!tierId) {
            return NextResponse.json({ error: 'tierId is required' }, { status: 400 });
        }

        // Auth check
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check ownership
        const { data: event } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Only the organizer can update ticket tiers' }, { status: 403 });
        }

        const tier = await ticketRepo.updateTicketTier(tierId, updates);

        if (!tier) {
            return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
        }

        return NextResponse.json({ tier });
    } catch (error: any) {
        console.error('[TicketsAPI] PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/events/[id]/tickets - Delete a ticket tier
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const { searchParams } = new URL(request.url);
        const tierId = searchParams.get('tierId');

        if (!tierId) {
            return NextResponse.json({ error: 'tierId query param is required' }, { status: 400 });
        }

        // Auth check
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check ownership
        const { data: event } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (!event || event.organizer_id !== user.id) {
            return NextResponse.json({ error: 'Only the organizer can delete ticket tiers' }, { status: 403 });
        }

        const success = await ticketRepo.deleteTicketTier(tierId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[TicketsAPI] DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
