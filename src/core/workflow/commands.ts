/**
 * Workflow Commands (V3)
 * 
 * Command pattern definitions for the Workflow Orchestrator.
 * These are the "inputs" to the system.
 */

// ============================================================================
// Commands
// ============================================================================

export interface Command<P = unknown> {
    name: string;
    payload: P;
    actorId: string;
    actorType: 'user' | 'system' | 'cron';
    correlationId?: string;
}

// --- Event Commands ---

export interface PublishEventCommand extends Command<{ eventId: string }> {
    name: 'PUBLISH_EVENT';
}

export interface StartEventCommand extends Command<{ eventId: string }> {
    name: 'START_EVENT';
}

export interface EndEventCommand extends Command<{ eventId: string }> {
    name: 'END_EVENT';
}

export interface CancelEventCommand extends Command<{ eventId: string; reason: string }> {
    name: 'CANCEL_EVENT';
}

// --- Ticket Commands ---

export interface ApproveTicketCommand extends Command<{ ticketId: string }> {
    name: 'APPROVE_TICKET';
}

export interface RejectTicketCommand extends Command<{ ticketId: string; reason?: string }> {
    name: 'REJECT_TICKET';
}

export interface CheckInTicketCommand extends Command<{ ticketId: string }> {
    name: 'CHECK_IN_TICKET';
}

export interface StakeTicketCommand extends Command<{
    ticketId: string;
    amount: number;
    txHash: string;
    chain: string;
}> {
    name: 'STAKE_TICKET';
}

export interface ForfeitTicketCommand extends Command<{ ticketId: string; reason?: string }> {
    name: 'FORFEIT_TICKET';
}

export interface RefundTicketCommand extends Command<{ ticketId: string }> {
    name: 'REFUND_TICKET';
}

// ============================================================================
// Union
// ============================================================================

export type WorkflowCommand =
    | PublishEventCommand
    | StartEventCommand
    | EndEventCommand
    | CancelEventCommand
    | ApproveTicketCommand
    | RejectTicketCommand
    | CheckInTicketCommand
    | StakeTicketCommand
    | ForfeitTicketCommand
    | RefundTicketCommand;
