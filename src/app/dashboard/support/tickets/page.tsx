'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Eye, CheckCircle, XCircle, MessageSquare, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define interfaces
interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  category: string;
  resolved_by?: string;
  user_name: string;
  user_email: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_from_support: boolean;
  user_name: string;
}

export default function SupportTicketsPage() {
  const { profile, isLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock data for demo purposes
  useEffect(() => {
    if (!profile || (profile.role !== 'user_support_admin' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
      setError('You do not have sufficient permissions to access this page');
      return;
    }

    // Simulated tickets data
    const mockTickets: SupportTicket[] = [
      {
        id: '1',
        user_id: '101',
        subject: 'Order not delivered',
        description: 'I placed an order 2 hours ago but haven\'t received it yet. The vendor isn\'t responding.',
        status: 'open',
        priority: 'high',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'order',
        user_name: 'Alex Johnson',
        user_email: 'alex@example.com'
      },
      {
        id: '2',
        user_id: '102',
        subject: 'Refund request',
        description: 'The food quality was poor. I would like a refund for my order #12345.',
        status: 'in_progress',
        priority: 'medium',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        category: 'refund',
        user_name: 'Samantha Lee',
        user_email: 'sam@example.com'
      },
      {
        id: '3',
        user_id: '103',
        subject: 'Account verification issue',
        description: 'I uploaded my student ID but it\'s been 2 days and still not verified.',
        status: 'open',
        priority: 'medium',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        category: 'account',
        user_name: 'Jordan Smith',
        user_email: 'jordan@example.com'
      },
      {
        id: '4',
        user_id: '104',
        subject: 'Incorrect charges',
        description: 'I was charged twice for the same order. Need immediate assistance.',
        status: 'open',
        priority: 'urgent',
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        category: 'billing',
        user_name: 'Taylor Garcia',
        user_email: 'taylor@example.com'
      },
      {
        id: '5',
        user_id: '105',
        subject: 'Vendor application status',
        description: 'I submitted a vendor application last week and haven\'t heard back.',
        status: 'resolved',
        priority: 'low',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'vendor',
        resolved_by: 'Support Team',
        user_name: 'Jamie Williams',
        user_email: 'jamie@example.com'
      },
      {
        id: '6',
        user_id: '106',
        subject: 'App not working',
        description: 'The mobile app keeps crashing when I try to place an order.',
        status: 'closed',
        priority: 'medium',
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'technical',
        resolved_by: 'Tech Support',
        user_name: 'Riley Brown',
        user_email: 'riley@example.com'
      }
    ];

    setTickets(mockTickets);
  }, [profile, isLoading]);

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    
    // Simulate fetching messages
    const mockMessages: TicketMessage[] = [
      {
        id: '101',
        ticket_id: ticket.id,
        user_id: ticket.user_id,
        message: ticket.description,
        created_at: ticket.created_at,
        is_from_support: false,
        user_name: ticket.user_name
      }
    ];
    
    // Add simulated conversation if ticket is in progress
    if (ticket.status === 'in_progress' || ticket.status === 'resolved') {
      mockMessages.push({
        id: '102',
        ticket_id: ticket.id,
        user_id: 'support1',
        message: "Hello, I'm reviewing your case. Could you provide more details about your issue?",
        created_at: new Date(new Date(ticket.created_at).getTime() + 1 * 60 * 60 * 1000).toISOString(),
        is_from_support: true,
        user_name: 'Support Agent'
      });
      
      mockMessages.push({
        id: '103',
        ticket_id: ticket.id,
        user_id: ticket.user_id,
        message: "Thank you for responding. The order number is #5432 and I ordered from Campus Cafe at 1:30 PM.",
        created_at: new Date(new Date(ticket.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        is_from_support: false,
        user_name: ticket.user_name
      });
    }
    
    // Add resolution message if resolved
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      mockMessages.push({
        id: '104',
        ticket_id: ticket.id,
        user_id: 'support1',
        message: "I've looked into this issue and have processed your request. Please let us know if you need any further assistance.",
        created_at: new Date(new Date(ticket.created_at).getTime() + 3 * 60 * 60 * 1000).toISOString(),
        is_from_support: true,
        user_name: 'Support Agent'
      });
      
      mockMessages.push({
        id: '105',
        ticket_id: ticket.id,
        user_id: ticket.user_id,
        message: "Thank you for your help! Issue is resolved.",
        created_at: new Date(new Date(ticket.created_at).getTime() + 4 * 60 * 60 * 1000).toISOString(),
        is_from_support: false,
        user_name: ticket.user_name
      });
    }
    
    setTicketMessages(mockMessages);
    setTicketDetailsOpen(true);
  };

  const handleUpdateStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    // Simulate API call
    setTimeout(() => {
      // Update tickets state
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus, updated_at: new Date().toISOString() } : ticket
      ));
      
      // Update selected ticket if open
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus, updated_at: new Date().toISOString() });
      }
      
      setSuccess(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
      setIsSubmitting(false);
    }, 500);
  };

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newTicketMessage: TicketMessage = {
        id: `new-${Date.now()}`,
        ticket_id: selectedTicket.id,
        user_id: profile?.id || 'support',
        message: newMessage,
        created_at: new Date().toISOString(),
        is_from_support: true,
        user_name: profile?.first_name || 'Support Agent'
      };
      
      // Update messages
      setTicketMessages([...ticketMessages, newTicketMessage]);
      
      // Clear input
      setNewMessage('');
      
      // If ticket was open, move to in_progress
      if (selectedTicket.status === 'open') {
        handleUpdateStatus(selectedTicket.id, 'in_progress');
      }
      
      setIsSubmitting(false);
    }, 500);
  };

  // Filter tickets based on search query and status filter
  const filteredTickets = tickets.filter(ticket => {
    const searchMatches = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatches = statusFilter === 'all' || ticket.status === statusFilter;
    
    return searchMatches && statusMatches;
  });

  // Helper for priority badge styling
  const getPriorityBadgeStyles = (priority: SupportTicket['priority']): string => {
    switch (priority) {
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-300 border';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-300 border';
      case 'urgent': return 'bg-red-50 text-red-700 border-red-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  // Helper for status badge styling
  const getStatusBadgeStyles = (status: SupportTicket['status']): string => {
    switch (status) {
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-300 border';
      case 'in_progress': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'closed': return 'bg-gray-50 text-gray-700 border-gray-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  // Stats by status and priority
  const ticketStats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
    total: tickets.length
  };

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessSupportTickets = profile && (
    profile.role === 'user_support_admin' || 
    profile.role === 'admin' || 
    profile.role === 'super_admin'
  );

  if (!canAccessSupportTickets) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Support Tickets</h1>
        <p className="text-black text-sm sm:text-base">
          Manage and respond to customer support inquiries
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md border border-red-300">
          <p className="text-red-800 font-medium text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-3 rounded-md border border-green-300">
          <p className="text-green-800 font-medium text-sm">{success}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Open</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-blue-600">{ticketStats.open}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-yellow-600">{ticketStats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-green-600">{ticketStats.resolved}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Urgent</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-red-600">{ticketStats.urgent}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-black">{ticketStats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg sm:text-xl font-semibold text-black">Tickets</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white text-black border-gray-300 h-9 max-w-sm"
        />
      </div>

      {/* Tickets List */}
      <Card className="border-gray-300">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-black">Ticket</TableHead>
                <TableHead className="text-black">User</TableHead>
                <TableHead className="text-black">Category</TableHead>
                <TableHead className="text-black">Priority</TableHead>
                <TableHead className="text-black">Status</TableHead>
                <TableHead className="text-black">Created</TableHead>
                <TableHead className="text-right text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-black">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-gray-200">
                    <TableCell className="font-medium text-black">
                      {ticket.subject}
                      <p className="text-gray-500 text-xs truncate max-w-xs">{ticket.description}</p>
                    </TableCell>
                    <TableCell className="text-black">
                      <div>{ticket.user_name}</div>
                      <div className="text-xs text-gray-500">{ticket.user_email}</div>
                    </TableCell>
                    <TableCell className="text-black capitalize">{ticket.category}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeStyles(ticket.priority)}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeStyles(ticket.status)}>
                        {ticket.status === 'in_progress' ? 'In Progress' : 
                          ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-black">{formatDate(ticket.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewTicket(ticket)}
                        className="text-black hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Ticket #{selectedTicket?.id}</DialogTitle>
            <DialogDescription className="text-black">
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusBadgeStyles(selectedTicket.status)}>
                    {selectedTicket.status === 'in_progress' ? 'In Progress' : 
                      selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                  </Badge>
                  
                  <Badge className={getPriorityBadgeStyles(selectedTicket.priority)}>
                    {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)} Priority
                  </Badge>
                  
                  <Badge variant="outline" className="capitalize">
                    {selectedTicket.category}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-500">
                  {formatDate(selectedTicket.created_at)}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">User Information</h3>
                <div className="text-sm text-black">
                  <p><span className="font-medium">Name:</span> {selectedTicket.user_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedTicket.user_email}</p>
                </div>
              </div>

              {/* Conversation */}
              <div className="space-y-2 border rounded-md p-4 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-medium text-black">Conversation</h3>
                <div className="space-y-3">
                  {ticketMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.is_from_support ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.is_from_support 
                            ? 'bg-blue-50 text-blue-800' 
                            : 'bg-gray-100 text-black'
                        }`}
                      >
                        <div className="text-xs mb-1">
                          {message.is_from_support ? 'Support Team' : message.user_name}
                          <span className="text-gray-500 ml-2">
                            {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply area - only show if not closed */}
              {selectedTicket.status !== 'closed' && (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="w-full rounded-md border border-gray-300 p-3 h-24 text-black"
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="space-x-2">
                  {selectedTicket.status === 'open' && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                    >
                      Mark In Progress
                    </Button>
                  )}
                  
                  {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-green-400 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                  
                  {selectedTicket.status === 'resolved' && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-gray-400 text-gray-700 hover:bg-gray-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  )}
                </div>
                
                <Button
                  onClick={() => setTicketDetailsOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 