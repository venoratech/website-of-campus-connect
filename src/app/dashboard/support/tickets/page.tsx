"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  RefreshCw,
  Filter,
  Clock,
  Check,
  MessageSquare,
  PlusCircle,
  Eye,
  UserCircle,
} from "lucide-react";

// Types
interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: "new" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  related_order_id: string | null;
  related_item_id: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
  assigned_to_profile?: UserProfile;
  responses_count?: number;
  latest_response_at?: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  role: string;
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  responder_id: string;
  response: string;
  is_internal: boolean;
  created_at: string;
  responder_profile?: UserProfile;
}

interface SupportStaff {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

export default function SupportTicketsDashboard() {
  const { profile, isLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    status: "all",
    priority: "all",
    assignedTo: "all",
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isInternalResponse, setIsInternalResponse] = useState(false);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fields for new ticket creation
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium",
    related_order_id: null as string | null,
    related_item_id: null as string | null,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalTickets, setTotalTickets] = useState(0);

  // Check if current user has permission to access tickets
  const hasPermission =
    profile?.role === "super_admin" ||
    profile?.role === "admin" ||
    profile?.role === "user_support_admin" ;
  const fetchTickets = async (page = 1) => {
    if (!profile?.id || !hasPermission) return;

    setIsLoadingTickets(true);
    setError(null);

    try {
      // Calculate range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get count of total tickets for pagination
      const { count, error: countError } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact" });

      if (countError) throw countError;
      setTotalTickets(count || 0);

      // Get tickets with user profiles and response count
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          user_profile:user_id(id, email, first_name, last_name, profile_image_url, role),
          assigned_to_profile:assigned_to(id, email, first_name, last_name, profile_image_url, role),
          responses_count:ticket_responses(count)
        `
        )
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (ticketsError) throw ticketsError;

      // Get the latest response timestamp for each ticket
      const ticketIds = ticketsData.map((ticket) => ticket.id);
      const { data: latestResponses, error: responsesError } = await supabase
        .from("ticket_responses")
        .select("ticket_id, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;

      // Create a map of ticket_id to latest response timestamp
      const latestResponseMap: { [key: string]: string } = {};
      latestResponses?.forEach((response) => {
        if (!latestResponseMap[response.ticket_id]) {
          latestResponseMap[response.ticket_id] = response.created_at;
        }
      });

      // Format tickets with response count and latest response time
      const formattedTickets = ticketsData.map((ticket) => ({
        ...ticket,
        responses_count: ticket.responses_count.length,
        latest_response_at: latestResponseMap[ticket.id] || null,
      }));

      setTickets(formattedTickets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading tickets");
      console.error(err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchTicketResponses = async (ticketId: string) => {
    if (!profile?.id || !hasPermission) return;

    try {
      const { data, error } = await supabase
        .from("ticket_responses")
        .select(
          `
          *,
          responder_profile:responder_id(id, email, first_name, last_name, profile_image_url, role)
        `
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTicketResponses(data || []);
    } catch (err: unknown) {
      console.error("Error loading ticket responses:", err);
    }
  };

  const fetchSupportStaff = async () => {
    if (!profile?.id || !hasPermission) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, profile_image_url")
        .in("role", ["super_admin", "admin", "user_support_admin"]);

      if (error) throw error;
      setSupportStaff(data || []);
    } catch (err: unknown) {
      console.error("Error loading support staff:", err);
    }
  };

  useEffect(() => {
    if (profile && hasPermission) {
      fetchTickets(page);
      fetchSupportStaff();
    }
  }, [profile, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchTicketResponses(ticket.id);
    setIsDetailModalOpen(true);
  };

  const handleAssignTicket = async (
    ticketId: string,
    staffId: string | null
  ) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          assigned_to: staffId,
          status: staffId ? "in_progress" : "new", // Set to in_progress only if assigned
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Find the staff member's name for the success message
      let successMessage = "Ticket unassigned";

      if (staffId) {
        const assignedStaff = supportStaff.find(
          (staff) => staff.id === staffId
        );
        const staffName = assignedStaff
          ? `${assignedStaff.first_name || ""} ${
              assignedStaff.last_name || ""
            }`.trim() || assignedStaff.email
          : "selected staff member";

        successMessage = `Ticket assigned to ${staffName}`;
      }

      setSuccess(successMessage);

      // Refresh the tickets list
      fetchTickets(page);

      // If the ticket detail modal is open, update the selected ticket
      if (selectedTicket && selectedTicket.id === ticketId) {
        // Fetch the updated ticket details
        const { data, error: fetchError } = await supabase
          .from("support_tickets")
          .select(
            `
            *,
            user_profile:user_id(id, email, first_name, last_name, profile_image_url, role),
            assigned_to_profile:assigned_to(id, email, first_name, last_name, profile_image_url, role)
          `
          )
          .eq("id", ticketId)
          .single();

        if (fetchError) throw fetchError;
        setSelectedTicket(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error assigning ticket");
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setIsAssignModalOpen(false);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // First, add the response
      const { data: responseData, error: responseError } = await supabase
        .from("ticket_responses")
        .insert({
          ticket_id: selectedTicket.id,
          responder_id: profile?.id,
          response: responseText.trim(),
          is_internal: isInternalResponse,
        })
        .select();

      if (responseError) throw responseError;

      // Then update the ticket status (if not internal)
      if (!isInternalResponse) {
        const newStatus =
          selectedTicket.status === "new"
            ? "in_progress"
            : selectedTicket.status;

        const { error: ticketError } = await supabase
          .from("support_tickets")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTicket.id);

        if (ticketError) throw ticketError;
      }

      setSuccess("Response added successfully");

      // Add the new response to the list
      const newResponse = {
        ...responseData[0],
        responder_profile: {
          id: profile?.id || "",
          email: profile?.email || "",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          profile_image_url: profile?.profile_image_url || null,
          role: profile?.role || "",
        },
      };

      setTicketResponses([...ticketResponses, newResponse]);

      // Reset form
      setResponseText("");
      setIsInternalResponse(false);
      setIsResponseModalOpen(false);

      // Refresh tickets list
      fetchTickets(page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding response");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Assuming you're creating a ticket on behalf of a user - either specify user_id or use admin's id
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: profile?.id, // Admin creating the ticket
          subject: newTicket.subject.trim(),
          description: newTicket.description.trim(),
          status: "new",
          priority: newTicket.priority,
          related_order_id: newTicket.related_order_id,
          related_item_id: newTicket.related_item_id,
        })
        .select();

      if (error) throw error;

      setSuccess("Ticket created successfully");

      // Reset form and close modal
      setNewTicket({
        subject: "",
        description: "",
        priority: "medium",
        related_order_id: null,
        related_item_id: null,
      });

      setIsNewTicketModalOpen(false);

      // Refresh tickets list
      fetchTickets(page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating ticket");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: "new" | "in_progress" | "resolved" | "closed"
  ) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      setSuccess(`Ticket status updated to ${status}`);

      // Refresh tickets list
      fetchTickets(page);

      // If the ticket detail modal is open, update the selected ticket
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error updating ticket status"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tickets based on search query and active filters
  const filteredTickets = tickets.filter((ticket) => {
    // Filter by search query
    const matchesSearch =
      searchQuery === "" ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_profile?.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      `${ticket.user_profile?.first_name || ""} ${
        ticket.user_profile?.last_name || ""
      }`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    // Filter by status
    const matchesStatus =
      activeFilters.status === "all" || ticket.status === activeFilters.status;

    // Filter by priority
    const matchesPriority =
      activeFilters.priority === "all" ||
      ticket.priority === activeFilters.priority;

    // Filter by assigned to
    const matchesAssignedTo =
      activeFilters.assignedTo === "all" ||
      (activeFilters.assignedTo === "unassigned" && !ticket.assigned_to) ||
      (activeFilters.assignedTo === "me" &&
        ticket.assigned_to === profile?.id) ||
      ticket.assigned_to === activeFilters.assignedTo;

    return (
      matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo
    );
  });

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (!hasPermission) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">
          You do not have permission to access the support dashboard.
        </p>
      </div>
    );
  }

  // Helper functions to display formatted badges
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-200">
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            Low
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
            {priority}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
            New
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            Resolved
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
            Closed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Support Tickets
          </h1>
          <p className="text-black">
            Manage customer support tickets and provide assistance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchTickets(page)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsNewTicketModalOpen(true)}
            className="gap-2 bg-black hover:bg-gray-800 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md border border-green-300">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>

          <Select
            value={activeFilters.status}
            onValueChange={(value) =>
              setActiveFilters({ ...activeFilters, status: value })
            }
          >
            <SelectTrigger className="h-8 w-32 bg-white text-black border-gray-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.priority}
            onValueChange={(value) =>
              setActiveFilters({ ...activeFilters, priority: value })
            }
          >
            <SelectTrigger className="h-8 w-32 bg-white text-black border-gray-300">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.assignedTo}
            onValueChange={(value) =>
              setActiveFilters({ ...activeFilters, assignedTo: value })
            }
          >
            <SelectTrigger className="h-8 w-40 bg-white text-black border-gray-300">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              {supportStaff.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {`${staff.first_name || ""} ${
                    staff.last_name || ""
                  }`.trim() || staff.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-black" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white text-black border-gray-300"
          />
        </div>
      </div>

      <Card className="border-gray-300">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-black">ID</TableHead>
                <TableHead className="text-black">Subject</TableHead>
                <TableHead className="text-black">User</TableHead>
                <TableHead className="text-black">Status</TableHead>
                <TableHead className="text-black">Priority</TableHead>
                <TableHead className="text-black">Assigned To</TableHead>
                <TableHead className="text-black">Created</TableHead>
                <TableHead className="text-black">Last Activity</TableHead>
                <TableHead className="text-center text-black">
                  Responses
                </TableHead>
                <TableHead className="text-right text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTickets ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-black"
                  >
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-900"></div>
                      <span>Loading tickets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-black"
                  >
                    No tickets found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-gray-200">
                    <TableCell className="font-mono text-xs text-gray-600">
                      {ticket.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-black">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[250px]">
                        {ticket.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              ticket.user_profile?.profile_image_url ||
                              undefined
                            }
                            alt="User"
                          />
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                            {ticket.user_profile?.first_name?.[0] || ""}
                            {ticket.user_profile?.last_name?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm text-black">
                          {`${ticket.user_profile?.first_name || ""} ${
                            ticket.user_profile?.last_name || ""
                          }`.trim() || ticket.user_profile?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>
                      {ticket.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                ticket.assigned_to_profile?.profile_image_url ||
                                undefined
                              }
                              alt="Agent"
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {ticket.assigned_to_profile?.first_name?.[0] ||
                                ""}
                              {ticket.assigned_to_profile?.last_name?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-black">
                            {`${ticket.assigned_to_profile?.first_name || ""} ${
                              ticket.assigned_to_profile?.last_name || ""
                            }`.trim() || ticket.assigned_to_profile?.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {ticket.latest_response_at
                        ? formatDistanceToNow(
                            new Date(ticket.latest_response_at),
                            { addSuffix: true }
                          )
                        : "No activity"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-gray-50">
                        {ticket.responses_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTicket(ticket)}
                          className="text-black hover:bg-gray-100"
                          title="View ticket details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {ticket.status !== "closed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsAssignModalOpen(true);
                              }}
                              className="text-black hover:bg-gray-100"
                              title="Assign ticket"
                            >
                              <UserCircle className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsResponseModalOpen(true);
                              }}
                              className="text-black hover:bg-gray-100"
                              title="Add response"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {ticket.status === "new" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateTicketStatus(ticket.id, "in_progress")
                            }
                            className="text-blue-600 hover:bg-blue-50"
                            title="Start working on ticket"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}

                        {(ticket.status === "new" ||
                          ticket.status === "in_progress") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateTicketStatus(ticket.id, "resolved")
                            }
                            className="text-green-600 hover:bg-green-50"
                            title="Mark as resolved"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {Math.min((page - 1) * pageSize + 1, totalTickets)} to{" "}
          {Math.min(page * pageSize, totalTickets)} of {totalTickets} tickets
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="text-black"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={page * pageSize >= totalTickets}
            className="text-black"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="bg-white text-black border-gray-300 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
              <span>{selectedTicket?.subject}</span>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
              {selectedTicket && getPriorityBadge(selectedTicket.priority)}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Created{" "}
              {selectedTicket &&
                format(new Date(selectedTicket.created_at), "PPP p")}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="py-4 space-y-6">
              {/* User info and ticket details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            selectedTicket.user_profile?.profile_image_url ||
                            undefined
                          }
                          alt="User"
                        />
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          {selectedTicket.user_profile?.first_name?.[0] || ""}
                          {selectedTicket.user_profile?.last_name?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-black">
                          {`${selectedTicket.user_profile?.first_name || ""} ${
                            selectedTicket.user_profile?.last_name || ""
                          }`.trim() || "User"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedTicket.user_profile?.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Role: {selectedTicket.user_profile?.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">
                      Status Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Current Status</p>
                      <div className="mt-1">
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Priority</p>
                      <div className="mt-1">
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      {selectedTicket.assigned_to ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                selectedTicket.assigned_to_profile
                                  ?.profile_image_url || undefined
                              }
                              alt="Agent"
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              {selectedTicket.assigned_to_profile
                                ?.first_name?.[0] || ""}
                              {selectedTicket.assigned_to_profile
                                ?.last_name?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-black">
                            {`${
                              selectedTicket.assigned_to_profile?.first_name ||
                              ""
                            } ${
                              selectedTicket.assigned_to_profile?.last_name ||
                              ""
                            }`.trim() ||
                              selectedTicket.assigned_to_profile?.email}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-500">
                          Unassigned
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-700"
                          onClick={() => {
                            setSelectedStaffId(
                              selectedTicket.assigned_to || ""
                            );
                            setIsAssignModalOpen(true);
                          }}
                        >
                          Change Assignment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">
                      Related Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedTicket.related_order_id && (
                      <div>
                        <p className="text-xs text-gray-500">Related Order</p>
                        <p className="mt-1 text-sm text-black">
                          #{selectedTicket.related_order_id}
                        </p>
                      </div>
                    )}

                    {selectedTicket.related_item_id && (
                      <div>
                        <p className="text-xs text-gray-500">Related Item</p>
                        <p className="mt-1 text-sm text-black">
                          #{selectedTicket.related_item_id}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="mt-1 text-sm text-black">
                        {format(new Date(selectedTicket.updated_at), "PPP p")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ticket description */}
              <div>
                <h3 className="font-medium text-lg text-black mb-2">
                  Description
                </h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 whitespace-pre-wrap text-black">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Response Timeline */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-lg text-black">
                    Response Timeline
                  </h3>
                  {selectedTicket.status !== "closed" && (
                    <Button
                      variant="outline"
                      className="gap-2 text-gray-700"
                      onClick={() => setIsResponseModalOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add Response
                    </Button>
                  )}
                </div>

                {ticketResponses.length > 0 ? (
                  <div className="space-y-4">
                    {ticketResponses.map((response) => (
                      <div
                        key={response.id}
                        className={`p-4 rounded-md border ${
                          response.is_internal
                            ? "bg-yellow-50 border-yellow-200"
                            : response.responder_id === selectedTicket.user_id
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                response.responder_profile?.profile_image_url ||
                                undefined
                              }
                              alt="User"
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              {response.responder_profile?.first_name?.[0] ||
                                ""}
                              {response.responder_profile?.last_name?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-black">
                              {`${
                                response.responder_profile?.first_name || ""
                              } ${
                                response.responder_profile?.last_name || ""
                              }`.trim() || response.responder_profile?.email}
                              {response.responder_id ===
                                selectedTicket.user_id && " (Customer)"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(response.created_at), "PPP p")}
                            </p>
                          </div>

                          {response.is_internal && (
                            <Badge className="ml-auto bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Internal Note
                            </Badge>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap text-black text-sm mt-2">
                          {response.response}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-gray-500">No responses yet.</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <div className="space-x-2">
                  {selectedTicket.status !== "closed" && (
                    <>
                      {selectedTicket.status === "new" && (
                        <Button
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() =>
                            updateTicketStatus(selectedTicket.id, "in_progress")
                          }
                          disabled={isSubmitting}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Mark In Progress
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() =>
                          updateTicketStatus(selectedTicket.id, "resolved")
                        }
                        disabled={
                          selectedTicket.status === "resolved" || isSubmitting
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Resolved
                      </Button>
                    </>
                  )}
                </div>
                <div>
                  <Button
                    variant={
                      selectedTicket.status === "closed"
                        ? "outline"
                        : "destructive"
                    }
                    onClick={() =>
                      updateTicketStatus(
                        selectedTicket.id,
                        selectedTicket.status === "closed"
                          ? "in_progress"
                          : "closed"
                      )
                    }
                    disabled={isSubmitting}
                  >
                    {selectedTicket.status === "closed"
                      ? "Reopen Ticket"
                      : "Close Ticket"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Ticket Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Assign Ticket</DialogTitle>
            <DialogDescription className="text-black">
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label htmlFor="staff-select" className="text-black">
                Select Support Staff
              </Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger
                  id="staff-select"
                  className="mt-1 bg-white text-black border-gray-300"
                >
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {supportStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {`${staff.first_name || ""} ${
                        staff.last_name || ""
                      }`.trim() || staff.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (selectedTicket) {
                  // If "unassigned" is selected, pass null for the staffId
                  const staffIdToAssign =
                    selectedStaffId === "unassigned" ? null : selectedStaffId;
                  handleAssignTicket(selectedTicket.id, staffIdToAssign);
                }
              }}
            >
              Assign to Me
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket) {
                  handleAssignTicket(selectedTicket.id, selectedStaffId || "");
                }
              }}
              disabled={isSubmitting}
              className="bg-black text-white"
            >
              {isSubmitting ? "Assigning..." : "Assign Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Add Response</DialogTitle>
            <DialogDescription className="text-black">
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Label htmlFor="response" className="text-black">
                Your Response
              </Label>
              <Textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter your response"
                className="mt-2 min-h-[150px] bg-white text-black border-gray-300"
              />
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="is-internal"
                checked={isInternalResponse}
                onCheckedChange={(checked) => setIsInternalResponse(!!checked)}
              />
              <Label htmlFor="is-internal" className="text-black">
                Internal note (not visible to customer)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResponseModalOpen(false)}
              className="text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendResponse}
              disabled={isSubmitting || !responseText.trim()}
              className="bg-black text-white"
            >
              {isSubmitting
                ? "Sending..."
                : isInternalResponse
                ? "Add Internal Note"
                : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Ticket Modal */}
      <Dialog
        open={isNewTicketModalOpen}
        onOpenChange={setIsNewTicketModalOpen}
      >
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">
              Create New Support Ticket
            </DialogTitle>
            <DialogDescription className="text-black">
              Fill out the details to create a new support ticket
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="subject" className="text-black">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                value={newTicket.subject}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, subject: e.target.value })
                }
                placeholder="Brief description of the issue"
                className="mt-1 bg-white text-black border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-black">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
                placeholder="Detailed explanation of the issue"
                className="mt-1 min-h-[150px] bg-white text-black border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="priority" className="text-black">
                Priority
              </Label>
              <Select
                value={newTicket.priority}
                onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                  setNewTicket({ ...newTicket, priority: value })
                }
              >
                <SelectTrigger
                  id="priority"
                  className="mt-1 bg-white text-black border-gray-300"
                >
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewTicketModalOpen(false)}
              className="text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={
                isSubmitting ||
                !newTicket.subject.trim() ||
                !newTicket.description.trim()
              }
              className="bg-black text-white"
            >
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
