// app/dashboard/admin/cashiers/page.tsx
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
import {
  Search,
  UserPlus,
  RefreshCw,
  UserCircle,
  Trash,
  Phone,
  Mail,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CashierWithVendor {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image_url?: string;
  vendor_id: string | null;
  vendor_name: string | null;
  association_id: string | null;
}

interface AvailableCashier {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image_url?: string;
}

interface CashierInvitation {
  id: string;
  cashier_id: string;
  vendor_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  cashier_name?: string;
  cashier_email?: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  profile_id: string;
}

// Define types for Supabase profiles
interface CashierProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image_url?: string;
}

interface InvitationProfile {
  email: string;
  first_name: string;
  last_name: string;
}

export default function CashierManagementPage() {
  const { profile, isLoading } = useAuth();
  const [assignedCashiers, setAssignedCashiers] = useState<CashierWithVendor[]>(
    []
  );
  const [availableCashiers, setAvailableCashiers] = useState<
    AvailableCashier[]
  >([]);
  const [invitations, setInvitations] = useState<CashierInvitation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isRemoveConfirmDialogOpen, setIsRemoveConfirmDialogOpen] =
    useState(false);
  const [selectedCashier, setSelectedCashier] =
    useState<AvailableCashier | null>(null);
  const [selectedAssignedCashier, setSelectedAssignedCashier] =
    useState<CashierWithVendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("assigned");
  const [isLoadingCashiers, setIsLoadingCashiers] = useState(false);

  // Check if the current user has permission to manage cashiers
  const hasPermission =
    profile?.role === "admin" ||
    profile?.role === "super_admin" ||
    profile?.role === "vendor_manager" ||
    profile?.role === "vendor";

  const fetchData = async () => {
    try {
      setError(null);

      // Fetch vendor's info
      const { data: vendorData, error: vendorError } = await supabase
        .from("food_vendors")
        .select("id, vendor_name, profile_id")
        .eq("profile_id", profile?.id);

      if (vendorError) throw vendorError;

      setVendors(vendorData || []);
      const vendorId = vendorData?.[0]?.id;

      if (!vendorId && profile?.role === "vendor") {
        setError("Please set up your vendor profile first");
        return;
      }

      // Fetch assigned cashiers
      if (vendorId) {
        const { data: associationsData, error: associationsError } =
          await supabase
            .from("cashier_vendor_associations")
            .select(
              `
            id,
            cashier_id,
            vendor_id,
            profiles:cashier_id (id, email, first_name, last_name, phone_number, profile_image_url)
          `
            )
            .eq("vendor_id", vendorId);

        if (associationsError) throw associationsError;

        const cashiersWithVendors: CashierWithVendor[] = associationsData.map(
          (assoc) => {
            // Type assertion for the profiles field
            const profiles = assoc.profiles as unknown;
            const cashier = profiles as CashierProfile;

            return {
              id: cashier.id,
              email: cashier.email,
              first_name: cashier.first_name,
              last_name: cashier.last_name,
              phone_number: cashier.phone_number,
              profile_image_url: cashier.profile_image_url,
              vendor_id: assoc.vendor_id,
              vendor_name: vendorData[0].vendor_name,
              association_id: assoc.id,
            };
          }
        );

        setAssignedCashiers(cashiersWithVendors);

        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } =
          await supabase
            .from("cashier_invitations")
            .select(
              `
            id,
            cashier_id, 
            vendor_id,
            invited_by,
            status,
            created_at,
            updated_at,
            profiles:cashier_id (email, first_name, last_name)
          `
            )
            .eq("vendor_id", vendorId);

        if (invitationsError) throw invitationsError;

        const formattedInvitations = invitationsData.map((invitation) => {
          // Type assertion for the profiles field
          const profiles = invitation.profiles as unknown;
          const cashier = profiles as InvitationProfile;

          return {
            ...invitation,
            cashier_name: `${cashier.first_name} ${cashier.last_name}`,
            cashier_email: cashier.email,
          };
        });

        setInvitations(formattedInvitations);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading cashier data"
      );
      console.error(err);
    }
  };

  const fetchAvailableCashiers = async () => {
    if (!profile?.id) return;

    setIsLoadingCashiers(true);
    try {
      const { data, error } = await supabase.rpc("get_available_cashiers");

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || "Error fetching available cashiers");
      }

      setAvailableCashiers(data.cashiers || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error fetching available cashiers"
      );
      console.error(err);
    } finally {
      setIsLoadingCashiers(false);
    }
  };

  useEffect(() => {
    if (profile && hasPermission) {
      fetchData();
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "available") {
      fetchAvailableCashiers();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInviteCashier = (cashier: AvailableCashier) => {
    setSelectedCashier(cashier);
    setIsInvitationDialogOpen(true);
  };


  const handleViewCashierProfile = (cashier: CashierWithVendor) => {
    setSelectedAssignedCashier(cashier);
    setIsProfileDialogOpen(true);
  };

  const handleRemoveCashier = (cashier: CashierWithVendor) => {
    setSelectedAssignedCashier(cashier);
    setIsRemoveConfirmDialogOpen(true);
  };

  const confirmRemoveCashier = async () => {
    if (!selectedAssignedCashier || !selectedAssignedCashier.association_id)
      return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("cashier_vendor_associations")
        .delete()
        .eq("id", selectedAssignedCashier.association_id);

      if (error) throw error;

      setSuccess(
        `Successfully removed ${selectedAssignedCashier.first_name} ${selectedAssignedCashier.last_name} as a cashier`
      );

      // Remove the cashier from the list
      setAssignedCashiers(
        assignedCashiers.filter((c) => c.id !== selectedAssignedCashier.id)
      );
      setIsRemoveConfirmDialogOpen(false);

      // Refresh available cashiers list if we're on that tab
      if (activeTab === "available") {
        fetchAvailableCashiers();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error removing cashier");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedCashier) return;
    if (vendors.length === 0) {
      setError("No vendor profile found");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc("invite_cashier", {
        p_cashier_id: selectedCashier.id,
        p_vendor_id: vendors[0].id,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || "Failed to send invitation");
      }

      // Add the new invitation to the list
      const newInvitation: CashierInvitation = {
        id: data.invitation_id,
        cashier_id: selectedCashier.id,
        vendor_id: vendors[0].id,
        invited_by: profile?.id || "",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cashier_name: `${selectedCashier.first_name} ${selectedCashier.last_name}`,
        cashier_email: selectedCashier.email,
      };

      setInvitations([newInvitation, ...invitations]);
      setSuccess(data.message || "Invitation sent successfully");
      setIsInvitationDialogOpen(false);

      // Remove the cashier from available list
      setAvailableCashiers(
        availableCashiers.filter((c) => c.id !== selectedCashier.id)
      );

      // Switch to invitations tab
      setActiveTab("invitations");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending invitation");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssignedCashiers = assignedCashiers.filter((cashier) => {
    const searchText = searchQuery.toLowerCase();
    return (
      cashier.email.toLowerCase().includes(searchText) ||
      cashier.first_name.toLowerCase().includes(searchText) ||
      cashier.last_name.toLowerCase().includes(searchText) ||
      (cashier.phone_number &&
        cashier.phone_number.toLowerCase().includes(searchText))
    );
  });

  const filteredAvailableCashiers = availableCashiers.filter((cashier) => {
    const searchText = searchQuery.toLowerCase();
    return (
      cashier.email.toLowerCase().includes(searchText) ||
      cashier.first_name.toLowerCase().includes(searchText) ||
      cashier.last_name.toLowerCase().includes(searchText) ||
      (cashier.phone_number &&
        cashier.phone_number.toLowerCase().includes(searchText))
    );
  });

  const filteredInvitations = invitations.filter((invitation) => {
    const searchText = searchQuery.toLowerCase();
    return (
      invitation.cashier_email?.toLowerCase().includes(searchText) ||
      invitation.cashier_name?.toLowerCase().includes(searchText)
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
          You do not have permission to manage cashiers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Cashier Management
          </h1>
          <p className="text-black">
            {profile?.role === "vendor"
              ? "Manage cashiers for your business"
              : "Manage cashier assignments"}
          </p>
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


      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList className="bg-gray-100 border border-gray-300">
              <TabsTrigger
                value="assigned"
                className="data-[state=active]:bg-white text-black"
              >
                Assigned Cashiers
              </TabsTrigger>
              <TabsTrigger
                value="available"
                className="data-[state=active]:bg-white text-black"
              >
                Available Cashiers
              </TabsTrigger>
              <TabsTrigger
                value="invitations"
                className="data-[state=active]:bg-white text-black"
              >
                Invitations
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-black" />
              <Input
                placeholder="Search cashiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white text-black border-gray-300"
              />
            </div>
          </div>

          <TabsContent value="assigned" className="mt-4">
            <Card className="border-gray-300">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg text-black">
                  Assigned Cashiers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Cashier</TableHead>
                      <TableHead className="text-black">
                        Contact Information
                      </TableHead>
                      <TableHead className="text-black">Status</TableHead>
                      <TableHead className="text-right text-black">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignedCashiers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-black"
                        >
                          No cashiers assigned to your business yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssignedCashiers.map((cashier) => (
                        <TableRow key={cashier.id} className="border-gray-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={cashier.profile_image_url || undefined}
                                  alt={`${cashier.first_name} ${cashier.last_name}`}
                                />
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                  {cashier.first_name?.[0]}
                                  {cashier.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium text-black">
                                {cashier.first_name} {cashier.last_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-black">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3.5 w-3.5 text-gray-500" />
                                <span>{cashier.email}</span>
                              </div>
                              {cashier.phone_number && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{cashier.phone_number}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-50 text-green-700 border border-green-400">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCashierProfile(cashier)}
                              className="text-black hover:bg-gray-100"
                            >
                              <UserCircle className="h-4 w-4 mr-1" />
                              Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCashier(cashier)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="mt-4">
            <Card className="border-gray-300">
              <CardHeader className="bg-gray-50 border-b border-gray-200 flex flex-row justify-between items-center">
                <CardTitle className="text-lg text-black">
                  Available Cashiers
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAvailableCashiers}
                  disabled={isLoadingCashiers}
                  className="h-8 gap-1 text-black"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Cashier</TableHead>
                      <TableHead className="text-black">Email</TableHead>
                      <TableHead className="text-right text-black">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCashiers ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-black"
                        >
                          <div className="flex justify-center items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-900"></div>
                            <span>Loading cashiers...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAvailableCashiers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-black"
                        >
                          No available cashiers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAvailableCashiers.map((cashier) => (
                        <TableRow key={cashier.id} className="border-gray-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={cashier.profile_image_url || undefined}
                                  alt={`${cashier.first_name} ${cashier.last_name}`}
                                />
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                  {cashier.first_name?.[0]}
                                  {cashier.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium text-black">
                                {cashier.first_name} {cashier.last_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-black">
                            {cashier.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => handleInviteCashier(cashier)}
                              size="sm"
                              className={`${
                                profile?.role === "vendor"
                                  ? "bg-gray-800 hover:bg-black text-white"
                                  : "bg-gray-400 text-white cursor-not-allowed"
                              }`}
                              disabled={profile?.role !== "vendor"}
                              title={
                                profile?.role !== "vendor"
                                  ? "Only vendors can invite cashiers"
                                  : ""
                              }
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Invite
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            <Card className="border-gray-300">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg text-black">
                  Pending Invitations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Cashier</TableHead>
                      <TableHead className="text-black">Email</TableHead>
                      <TableHead className="text-black">Status</TableHead>
                      <TableHead className="text-black">Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-black"
                        >
                          No pending invitations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvitations.map((invitation) => (
                        <TableRow
                          key={invitation.id}
                          className="border-gray-200"
                        >
                          <TableCell className="font-medium text-black">
                            {invitation.cashier_name}
                          </TableCell>
                          <TableCell className="text-black">
                            {invitation.cashier_email}
                          </TableCell>
                          <TableCell>
                            {invitation.status === "pending" && (
                              <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-400">
                                Pending
                              </Badge>
                            )}
                            {invitation.status === "accepted" && (
                              <Badge className="bg-green-50 text-green-700 border border-green-400">
                                Accepted
                              </Badge>
                            )}
                            {invitation.status === "declined" && (
                              <Badge className="bg-red-50 text-red-700 border border-red-400">
                                Declined
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {formatDistanceToNow(
                              new Date(invitation.created_at),
                              { addSuffix: true }
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invitation Confirmation Dialog */}
      <Dialog
        open={isInvitationDialogOpen}
        onOpenChange={setIsInvitationDialogOpen}
      >
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Invite Cashier</DialogTitle>
            <DialogDescription className="text-black">
              Are you sure you want to invite this cashier to work for your
              business?
            </DialogDescription>
          </DialogHeader>

          {selectedCashier && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedCashier.profile_image_url || undefined}
                    alt={`${selectedCashier.first_name} ${selectedCashier.last_name}`}
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-lg">
                    {selectedCashier.first_name?.[0]}
                    {selectedCashier.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-black">
                    {selectedCashier.first_name} {selectedCashier.last_name}
                  </h3>
                  <p className="text-gray-500">{selectedCashier.email}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  This cashier will be able to:
                </p>
                <ul className="text-sm text-gray-600 mt-2 list-disc pl-5 space-y-1">
                  <li>View and manage orders for your business</li>
                  <li>Update order statuses</li>
                  <li>Process customer pickups</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInvitationDialogOpen(false)}
              className="text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={isSubmitting}
              className="bg-gray-800 hover:bg-black text-white"
            >
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Cashier Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Cashier Profile</DialogTitle>
          </DialogHeader>

          {selectedAssignedCashier && (
            <div className="py-4">
              <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-md border border-gray-200">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={selectedAssignedCashier.profile_image_url || undefined}
                    alt={`${selectedAssignedCashier.first_name} ${selectedAssignedCashier.last_name}`}
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-lg">
                    {selectedAssignedCashier.first_name?.[0]}
                    {selectedAssignedCashier.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-black">
                    {selectedAssignedCashier.first_name}{" "}
                    {selectedAssignedCashier.last_name}
                  </h2>
                  <Badge className="mt-1 bg-green-50 text-green-700 border border-green-400">
                    Cashier
                  </Badge>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-black">
                      {selectedAssignedCashier.email}
                    </p>
                  </div>
                </div>

                {selectedAssignedCashier.phone_number && (
                  <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Phone Number
                      </p>
                      <p className="text-black">
                        {selectedAssignedCashier.phone_number}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
                  <UserCircle className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Assigned To
                    </p>
                    <p className="text-black">
                      {selectedAssignedCashier.vendor_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
              className="w-full sm:w-auto text-black border-gray-300"
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsProfileDialogOpen(false);
                handleRemoveCashier(selectedAssignedCashier!);
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash className="h-4 w-4 mr-1" />
              Remove Cashier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Cashier Confirmation Dialog */}
      <Dialog
        open={isRemoveConfirmDialogOpen}
        onOpenChange={setIsRemoveConfirmDialogOpen}
      >
        <DialogContent className="bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Remove Cashier</DialogTitle>
            <DialogDescription className="text-black">
              Are you sure you want to remove this cashier from your business?
              They will no longer be able to manage orders.
            </DialogDescription>
          </DialogHeader>

          {selectedAssignedCashier && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-md border border-red-200">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedAssignedCashier.profile_image_url || undefined}
                    alt={`${selectedAssignedCashier.first_name} ${selectedAssignedCashier.last_name}`}
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-lg">
                    {selectedAssignedCashier.first_name?.[0]}
                    {selectedAssignedCashier.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-black">
                    {selectedAssignedCashier.first_name}{" "}
                    {selectedAssignedCashier.last_name}
                  </h3>
                  <p className="text-gray-500">
                    {selectedAssignedCashier.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveConfirmDialogOpen(false)}
              className="text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRemoveCashier}
              disabled={isSubmitting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Removing..." : "Remove Cashier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
