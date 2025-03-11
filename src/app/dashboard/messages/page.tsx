// app/dashboard/messages/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, formatTime, truncateString } from '@/lib/utils';
import { Send, ChevronRight } from 'lucide-react';

interface Conversation {
  id: string;
  item_id: string | null;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  other_user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  };
  item?: {
    id: string;
    title: string;
  };
  last_message?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_read: boolean;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { profile, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch conversations on initial load
  useEffect(() => {
    const fetchConversations = async () => {
      if (!profile?.id) return;
      
      try {
        // Fetch conversations where the user is either user1 or user2
        const { data, error: convError } = await supabase
          .from('conversations')
          .select(`
            *,
            user1:user1_id (id, email, first_name, last_name, profile_image_url),
            user2:user2_id (id, email, first_name, last_name, profile_image_url),
            item:item_id (id, title)
          `)
          .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
          .order('last_message_at', { ascending: false });
          
        if (convError) throw convError;
        
        // Process conversations to get the "other user" in each conversation
        const processedData = data.map(conv => {
          const otherUser = conv.user1.id === profile.id ? conv.user2 : conv.user1;
          return {
            ...conv,
            other_user: otherUser
          };
        });
        
        // Fetch the last message for each conversation
        for (const conv of processedData) {
          const { data: messageData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (messageData) {
            conv.last_message = messageData;
          }
        }
        
        setConversations(processedData);
        
        // If conversationId is in URL, select that conversation
        if (conversationId) {
          const selected = processedData.find(c => c.id === conversationId);
          if (selected) {
            setSelectedConversation(selected);
            fetchMessages(selected.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      }
    };
    
    if (profile) {
      fetchConversations();
    }
  }, [profile, conversationId]);
  
  // Subscribe to new messages for the selected conversation
  useEffect(() => {
    if (!selectedConversation) return;
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark message as read if it's from the other user
          if (newMessage.sender_id !== profile?.id && !newMessage.is_read) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [selectedConversation, profile?.id]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      setMessages(data || []);
      
      // Mark unread messages as read
      const unreadMessages = data?.filter(
        m => m.sender_id !== profile?.id && !m.is_read
      ) || [];
      
      for (const message of unreadMessages) {
        await markMessageAsRead(message.id);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };
  
  // Mark a message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !profile) return;
    
    setIsSending(true);
    
    try {
      // Insert the new message
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: profile.id,
          content: messageInput,
          is_read: false
        })
        .select()
        .single();
      
      if (sendError) throw sendError;
      
      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
      
      // Clear the input
      setMessageInput('');
      
      // The new message will be added via the subscription
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };
  
  // Get initials for avatar fallback
  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };
  
  // Check if a message is unread
  const isUnread = (conversation: Conversation) => {
    return conversation.last_message && 
           conversation.last_message.sender_id !== profile?.id && 
           !conversation.last_message.is_read;
  };
  
  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Messages</h1>
        <p className="text-black">
          Chat with customers and vendors
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
        {/* Conversations List */}
        <Card className="md:col-span-1 flex flex-col h-full border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-black">
                No conversations yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {conversations.map((conversation) => (
                  <li 
                    key={conversation.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conversation.id ? 'bg-gray-100' : ''
                    } ${isUnread(conversation) ? 'font-semibold' : ''}`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex items-center p-4">
                      <Avatar className="h-10 w-10 mr-3 bg-gray-200 text-black">
                        <AvatarImage src={conversation.other_user.profile_image_url || undefined} />
                        <AvatarFallback className="bg-gray-200 text-black">
                          {getInitials(
                            conversation.other_user.first_name,
                            conversation.other_user.last_name,
                            conversation.other_user.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-black">
                          {conversation.other_user.first_name || conversation.other_user.email}
                        </p>
                        {conversation.last_message && (
                          <p className="text-xs text-black truncate">
                            {conversation.last_message.sender_id === profile?.id ? 'You: ' : ''}
                            {truncateString(conversation.last_message.content, 30)}
                          </p>
                        )}
                        {conversation.item && (
                          <p className="text-xs text-black truncate">
                            Re: {truncateString(conversation.item.title, 20)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end ml-2">
                        {conversation.last_message && (
                          <span className="text-xs text-black">
                            {new Date(conversation.last_message.created_at).toLocaleDateString()}
                          </span>
                        )}
                        {isUnread(conversation) && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full mt-1"></span>
                        )}
                        <ChevronRight className="h-4 w-4 text-black mt-1" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        {/* Messages */}
        <Card className="md:col-span-2 flex flex-col h-full border-gray-300">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2 bg-gray-200 text-black">
                    <AvatarImage src={selectedConversation.other_user.profile_image_url || undefined} />
                    <AvatarFallback className="bg-gray-200 text-black">
                      {getInitials(
                        selectedConversation.other_user.first_name,
                        selectedConversation.other_user.last_name,
                        selectedConversation.other_user.email
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-black">{selectedConversation.other_user.first_name || selectedConversation.other_user.email}</CardTitle>
                    {selectedConversation.item && (
                      <p className="text-xs text-black">
                        Regarding: {selectedConversation.item.title}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-black h-full flex items-center justify-center">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSelf = message.sender_id === profile?.id;
                    return (
                      <div 
                        key={message.id} 
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                            isSelf ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'
                          }`}
                        >
                          <p className="break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${isSelf ? 'text-gray-300' : 'text-black'}`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              
              <div className="p-4 border-t border-gray-200">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex space-x-2"
                >
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                    className="bg-white text-black border-gray-300"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSending || !messageInput.trim()}
                    className="bg-gray-800 hover:bg-black text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-black">
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}