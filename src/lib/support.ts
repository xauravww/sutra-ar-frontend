/**
 * Support / Help Desk API client.
 * Mirrors the backend routes at /api/v1/support-tickets.
 * Reuses the shared `request()` helper from ./api.ts.
 */

import { request } from "./api";

export interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  user_id: number;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    id: number;
    email: string;
    role: string;
    profile: {
      first_name: string | null;
      last_name: string | null;
      profile_photo_url?: string | null;
    } | null;
  };
  assignee: {
    id: number;
    email: string;
    role: string;
    profile: { first_name: string | null; last_name: string | null } | null;
  } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  message: string;
  is_staff: boolean;
  created_at: string;
  sender: {
    id: number;
    email: string;
    role: string;
    profile: {
      first_name: string | null;
      last_name: string | null;
      profile_photo_url?: string | null;
    } | null;
  };
}

export interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export const SUPPORT_TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const supportService = {
  create(data: {
    subject: string;
    description: string;
    category: string;
    priority?: string;
  }): Promise<SupportTicket> {
    return request<{ success: boolean; data: SupportTicket }>("/api/v1/support-tickets", {
      method: "POST",
      json: data,
    }).then((r) => r.data);
  },

  list(filters: {
    status?: string;
    category?: string;
    priority?: string;
    q?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: SupportTicket[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(filters.page || 1));
    params.set("limit", String(filters.limit || 20));
    return request<{ success: boolean; data: SupportTicket[]; total: number }>(
      `/api/v1/support-tickets?${params.toString()}`
    ).then((r) => r);
  },

  get(id: number): Promise<SupportTicket> {
    return request<{ success: boolean; data: SupportTicket }>(`/api/v1/support-tickets/${id}`).then(
      (r) => r.data
    );
  },

  stats(): Promise<TicketStats> {
    return request<{ success: boolean; data: TicketStats }>("/api/v1/support-tickets/stats").then(
      (r) => r.data
    );
  },

  addMessage(ticketId: number, message: string): Promise<TicketMessage> {
    return request<{ success: boolean; data: TicketMessage }>(
      `/api/v1/support-tickets/${ticketId}/messages`,
      { method: "POST", json: { message } }
    ).then((r) => r.data);
  },

  updateStatus(ticketId: number, status: string): Promise<SupportTicket> {
    return request<{ success: boolean; data: SupportTicket }>(
      `/api/v1/support-tickets/${ticketId}/status`,
      { method: "PATCH", json: { status } }
    ).then((r) => r.data);
  },

  assign(ticketId: number, assigneeId: number | null): Promise<SupportTicket> {
    return request<{ success: boolean; data: SupportTicket }>(
      `/api/v1/support-tickets/${ticketId}/assign`,
      { method: "PATCH", json: { assignee_id: assigneeId } }
    ).then((r) => r.data);
  },
};
