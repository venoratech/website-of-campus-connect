// app/dashboard/users/page.tsx - Optimized version
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, Profile, RolePermission, College } from "@/lib/supabase";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Eye,
  Edit,
  User,
  UserX,
  CheckSquare,
  Shield,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

export default function UsersPage() {
  const { profile, isLoading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [showOnlyUnverifiedIds, setShowOnlyUnverifiedIds] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<RolePermission | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [sortField, setSortField] = useState<"name" | "email" | "role" | "created_at" | "college" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalVendors, setTotalVendors] = useState(0);
  const [totalUnverifiedIds, setTotalUnverifiedIds] = useState(0);
  const [unfilteredTotalUsers, setUnfilteredTotalUsers] = useState(0);

  // Edit form state - only initialize when needed
  const [editFormState, setEditFormState] = useState({
    firstName: "",
    lastName: "",
    role: "student" as Profile["role"],
    isApproved: false,
    isIdVerified: false
  });

  // Memoized values
  const canAccessUserManagement = useMemo(() => {
    return profile && 
      ["super_admin", "admin", "vendor_manager", "user_support_admin"].includes(profile.role);
  }, [profile]);

  const canEditUsers = useMemo(() => {
    return profile && (profile.role === "super_admin" || profile.role === "admin");
  }, [profile]);

  // Memoized filtered users - only recalculate when dependencies change
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        // Exclude users with "deleted_" prefix in their email
        if (user.email.startsWith("deleted_")) return false;

        // Add special filter for unverified IDs
        if (showOnlyUnverifiedIds) {
          return user.role === "student" && user.id_image_url && !user.is_id_verified;
        }

        const searchMatches =
          searchQuery === "" || 
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.first_name &&
            user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (user.last_name &&
            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const roleMatches = roleFilter === "all" || user.role === roleFilter;
        const collegeMatches = collegeFilter === "all" || user.college_id === collegeFilter;

        return searchMatches && roleMatches && collegeMatches;
      })
      .sort((a, b) => {
        if (!sortDirection || !sortField) return 0;

        let comparison = 0;

        switch (sortField) {
          case "name":
            const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim();
            const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim();

            // Handle empty names by pushing them to the end
            if (!nameA && !nameB) return 0;
            if (!nameA) return sortDirection === "asc" ? 1 : -1;
            if (!nameB) return sortDirection === "asc" ? -1 : 1;

            comparison = nameA.toLowerCase().localeCompare(nameB.toLowerCase());
            break;
          case "email":
            // Handle empty emails by pushing them to the end
            if (!a.email && !b.email) return 0;
            if (!a.email) return sortDirection === "asc" ? 1 : -1;
            if (!b.email) return sortDirection === "asc" ? -1 : 1;

            comparison = a.email
              .toLowerCase()
              .localeCompare(b.email.toLowerCase());
            break;
          case "role":
            // Handle empty roles by pushing them to the end
            if (!a.role && !b.role) return 0;
            if (!a.role) return sortDirection === "asc" ? 1 : -1;
            if (!b.role) return sortDirection === "asc" ? -1 : 1;

            comparison = a.role.localeCompare(b.role);
            break;
          case "created_at":
            // Handle empty dates by pushing them to the end
            if (!a.created_at && !b.created_at) return 0;
            if (!a.created_at) return sortDirection === "asc" ? 1 : -1;
            if (!b.created_at) return sortDirection === "asc" ? -1 : 1;

            comparison =
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case "college":
            const collegeNameA =
              colleges.find((c) => c.id === a.college_id)?.name || "";
            const collegeNameB =
              colleges.find((c) => c.id === b.college_id)?.name || "";

            comparison = collegeNameA
              .toLowerCase()
              .localeCompare(collegeNameB.toLowerCase());
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [users, showOnlyUnverifiedIds, searchQuery, roleFilter, collegeFilter, sortDirection, sortField, colleges]);

  // Helper functions as memoized callbacks
  const getRoleDisplayName = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      "super_admin": "Super Admin",
      "vendor_manager": "Vendor Manager",
      "marketplace_moderator": "Marketplace Moderator",
      "user_support_admin": "User Support",
      "analytics_manager": "Analytics Manager",
      "content_manager": "Content Manager",
      "cashier": "Cashier"
    };
    
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  }, []);

  const getRoleBadgeStyles = useCallback((role: string): string => {
    const styleMap: Record<string, string> = {
      "admin": "border-purple-400 bg-purple-50 text-purple-700 border",
      "super_admin": "border-indigo-400 bg-indigo-50 text-indigo-700 border",
      "vendor_manager": "border-emerald-400 bg-emerald-50 text-emerald-700 border",
      "marketplace_moderator": "border-sky-400 bg-sky-50 text-sky-700 border",
      "user_support_admin": "border-rose-400 bg-rose-50 text-rose-700 border",
      "analytics_manager": "border-amber-400 bg-amber-50 text-amber-700 border",
      "content_manager": "border-teal-400 bg-teal-50 text-teal-700 border",
      "cashier": "border-orange-400 bg-orange-50 text-orange-700 border",
      "vendor": "border-green-400 bg-green-50 text-green-700 border"
    };
    
    return styleMap[role] || "border-blue-400 bg-blue-50 text-blue-700 border"; // default for student and others
  }, []);

  const getRoleDescription = useCallback((role: string): string => {
    const descriptions: Record<string, string> = {
      "super_admin": "Full access to everything including user management, vendors, marketplace, settings. Can assign and remove admin roles.",
      "admin": "Administrative access to most system functions, but with some restrictions compared to Super Admin.",
      "vendor_manager": "Manages vendor approvals and onboarding. Updates vendor details and resolves vendor issues.",
      "marketplace_moderator": "Monitors listings to ensure quality and compliance. Approves or removes products/services.",
      "user_support_admin": "Handles user complaints and support tickets. Manages refunds, order disputes, or account issues.",
      "analytics_manager": "Tracks key metrics like vendor activity, sales, and user engagement. Provides reports to help improve the platform.",
      "content_manager": "Manages platform-wide announcements. Updates terms, policies, or notifications.",
      "cashier": "Processes customer payments and handles transactions. Accepts or rejects incoming orders and updates order status.",
      "vendor": "Can manage their own vendor profile, menu items, and process orders from their customers.",
      "student": "Regular user account with access to browse marketplace, place orders, and manage their profile."
    };
    
    return descriptions[role] || "Standard account with basic permissions.";
  }, []);

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      if (!canAccessUserManagement) {
        setError("You do not have sufficient permissions to access this page");
        return;
      }

      setIsLoadingUsers(true);
      try {
        // Get total count of all users first (unfiltered)
        const { count: unfilteredCount } = await supabase
          .from("profiles")
          .select("*", { count: 'exact' });
          
        setUnfilteredTotalUsers(unfilteredCount || 0);
          
        // Build the base query with filters
        let query = supabase
          .from("profiles")
          .select("*", { count: 'exact' })
          .order("created_at", { ascending: false });

        // Apply filters
        if (roleFilter !== "all") {
          query = query.eq("role", roleFilter);
        }

        if (collegeFilter !== "all") {
          query = query.eq("college_id", collegeFilter);
        }

        if (searchQuery.trim()) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }

        // Apply pagination only if not showing all and no filters are active
        const isFiltering = roleFilter !== "all" || collegeFilter !== "all" || searchQuery.trim() !== "";
        if (pageSize !== -1 && !isFiltering) {
          query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        }

        const { data, error: usersError, count } = await query;

        if (usersError) throw usersError;
        setUsers(data || []);
        setTotalUsers(count || 0);

        // Use Promise.all to run multiple queries in parallel
        const [
          { count: studentsCount }, 
          { count: vendorsCount }, 
          { count: unverifiedCount }, 
          { data: collegesData, error: collegesError }
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: 'exact' }).eq("role", "student"),
          supabase.from("profiles").select("*", { count: 'exact' }).eq("role", "vendor"),
          supabase.from("profiles").select("*", { count: 'exact' })
            .eq("role", "student")
            .not("id_image_url", "is", null)
            .eq("is_id_verified", false),
          supabase.from("colleges").select("*").order("name")
        ]);

        if (collegesError) throw collegesError;

        setTotalStudents(studentsCount || 0);
        setTotalVendors(vendorsCount || 0);
        setTotalUnverifiedIds(unverifiedCount || 0);
        setColleges(collegesData || []);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Error fetching users";
        setError(errorMessage);
        console.error(err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (!isLoading) fetchUsers();
  }, [profile, isLoading, currentPage, pageSize, roleFilter, collegeFilter, searchQuery, canAccessUserManagement]);

  // Handler functions
  const handleViewUser = useCallback((user: Profile) => {
    setSelectedUser(user);
    setViewUserOpen(true);
  }, []);

  const handleEditUser = useCallback(() => {
    if (!selectedUser) return;
    setEditFormState({
      firstName: selectedUser.first_name || "",
      lastName: selectedUser.last_name || "",
      role: selectedUser.role,
      isApproved: selectedUser.is_approved || false,
      isIdVerified: selectedUser.is_id_verified || false
    });
    setIsEditing(true);
  }, [selectedUser]);

  const handleExportData = useCallback(() => {
    // Get filtered users
    const dataToExport = filteredUsers;
    
    // Create CSV content
    const headers = [
      "ID",
      "Email",
      "First Name",
      "Last Name",
      "Role",
      "College",
      "Status",
      "ID Verified",
      "Created At"
    ].join(",");
    
    const rows = dataToExport.map(user => {
      const college = colleges.find(c => c.id === user.college_id)?.name || 'Not Assigned';
      const status = user.is_active === false ? 'Inactive' : 'Active';
      const idVerified = user.is_id_verified ? 'Yes' : 'No';
      
      return [
        user.id,
        user.email,
        `"${user.first_name || ''}"`,
        `"${user.last_name || ''}"`,
        user.role,
        `"${college}"`,
        status,
        idVerified,
        user.created_at
      ].join(",");
    });
    
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Create and trigger download
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredUsers, colleges]);

  const handleSaveUser = useCallback(async () => {
    if (!selectedUser || !canEditUsers) return;

    // Only super_admin can create or modify another super_admin
    if (editFormState.role === "super_admin" && profile?.role !== "super_admin") {
      setError("Only a super admin can assign the super admin role");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the server API route to bypass RLS policies
      const response = await fetch("/api/update-user-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          firstName: editFormState.firstName,
          lastName: editFormState.lastName,
          role: editFormState.role,
          isApproved: editFormState.isApproved,
          isIdVerified: editFormState.isIdVerified,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      setSuccess("User updated successfully");

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                first_name: editFormState.firstName,
                last_name: editFormState.lastName,
                role: editFormState.role,
                is_approved: editFormState.isApproved,
                is_id_verified: editFormState.isIdVerified,
              }
            : u
        )
      );

      setSelectedUser({
        ...selectedUser,
        first_name: editFormState.firstName,
        last_name: editFormState.lastName,
        role: editFormState.role,
        is_approved: editFormState.isApproved,
        is_id_verified: editFormState.isIdVerified,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      let errorMessage = "Error updating user";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        errorMessage = JSON.stringify(err);
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, canEditUsers, profile?.role, editFormState, users]);

  const handleUpdateVerificationStatus = useCallback(async (
    userId: string,
    isVerified: boolean
  ) => {
    if (!canEditUsers) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/update-user-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          isIdVerified: isVerified,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update verification status");
      }

      setSuccess("Verification status updated successfully");

      // Update local state
      setUsers(users => users.map(u => 
        u.id === userId ? { ...u, is_id_verified: isVerified } : u
      ));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({
          ...selectedUser,
          is_id_verified: isVerified,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error updating verification status";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [canEditUsers, selectedUser]);

  const handleVerifyAllIds = useCallback(async () => {
    if (!canEditUsers) return;

    // Confirm with the admin before proceeding
    if (
      !confirm(
        `Are you sure you want to verify all ${totalUnverifiedIds} student IDs with uploaded images? This will mark all unverified student IDs as verified.`
      )
    )
      return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Get all unverified student IDs
      const { data: unverifiedStudents, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .not("id_image_url", "is", null)
        .eq("is_id_verified", false);

      if (fetchError) throw fetchError;

      if (!unverifiedStudents || unverifiedStudents.length === 0) {
        setSuccess("No unverified student IDs found");
        setIsSubmitting(false);
        return;
      }

      // Update all unverified users
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_id_verified: true })
        .eq("role", "student")
        .not("id_image_url", "is", null)
        .eq("is_id_verified", false);

      if (updateError) throw updateError;

      // Update local state
      setUsers(users => users.map(u => 
        u.role === "student" && u.id_image_url && !u.is_id_verified
          ? { ...u, is_id_verified: true }
          : u
      ));
      
      // Update the total count
      setTotalUnverifiedIds(0);

      setSuccess(`Successfully verified ${unverifiedStudents.length} student IDs`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error verifying all IDs";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [canEditUsers, totalUnverifiedIds]);

  const handleDeleteUser = useCallback((userId: string) => {
    if (!canEditUsers) return;

    // Find the user to delete
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      setError("User not found");
      return;
    }

    // Prevent deleting super_admin if not a super_admin
    if (targetUser.role === "super_admin" && profile?.role !== "super_admin") {
      setError("Only a super admin can delete another super admin");
      return;
    }

    // Set the user to delete and open the confirmation dialog
    setUserToDelete(targetUser);
    setDeleteConfirmationOpen(true);
  }, [canEditUsers, users, profile?.role]);

  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Call the RPC function to permanently delete the user
      const { data, error } = await supabase.rpc("permanently_delete_user", {
        user_id: userToDelete.id,
      });

      if (error) {
        console.error("RPC Error:", error);

        // Handle specific constraint errors
        if (
          error.message &&
          error.message.includes("violates foreign key constraint")
        ) {
          throw new Error(
            `Cannot delete user: There are still records associated with this user that need to be removed first. Please contact a database administrator.`
          );
        }

        throw new Error(`Failed to delete user: ${error.message}`);
      }

      if (data && !data.success) {
        throw new Error(data.error || "Unknown error occurred");
      }

      // Display success message
      setSuccess(`User ${userToDelete.email} was permanently deleted`);

      // Update the UI by removing the user from the list entirely
      setUsers(users => users.filter(u => u.id !== userToDelete.id));

      // Close the user details dialog if it was open
      if (selectedUser && selectedUser.id === userToDelete.id) {
        setViewUserOpen(false);
        setSelectedUser(null);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error deleting user";
      setError(errorMessage);
      console.error("Delete user error:", err);
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmationOpen(false);
    }
  }, [userToDelete, selectedUser]);

  const fetchRolePermissions = useCallback(async (roleName: string) => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_name", roleName)
        .single();

      if (error) {
        console.error("Error fetching role permissions:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error in fetchRolePermissions:", err);
      return null;
    }
  }, []);

  const handleViewPermissions = useCallback(async (roleName: string) => {
    const permissions = await fetchRolePermissions(roleName);
    setSelectedRolePermissions(permissions);
    setPermissionsDialogOpen(true);
  }, [fetchRolePermissions]);

  // Pagination component - memoized to prevent unnecessary re-renders
  const PaginationControls = useMemo(() => {
    const isFiltering = roleFilter !== "all" || collegeFilter !== "all" || searchQuery.trim() !== "";
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {isFiltering ? (
              `Showing all ${totalUsers} filtered users of ${unfilteredTotalUsers} total users`
            ) : (
              pageSize === -1 
                ? `Showing all ${unfilteredTotalUsers} users` 
                : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalUsers)} of ${unfilteredTotalUsers} users`
            )}
          </span>
          {!isFiltering && (
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="-1">Show All</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        {!isFiltering && pageSize !== -1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage * pageSize >= totalUsers}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }, [currentPage, pageSize, totalUsers, unfilteredTotalUsers, roleFilter, collegeFilter, searchQuery]);

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  if (!canAccessUserManagement) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">
          User Management
        </h1>
        <p className="text-black text-sm sm:text-base">
          Manage users, roles, and permissions
        </p>
      </div>

      {/* Admin action buttons */}
      {(profile?.role === "super_admin" || profile?.role === "admin") && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}} // Removed handleOpenRoleManagement to simplify demo
            className="bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          >
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles & Permissions
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportData}
            className="bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </div>
      )}

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

      {showOnlyUnverifiedIds && (
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300 flex justify-between items-center">
          <p className="text-yellow-800 font-medium text-sm">
            <CheckSquare className="h-4 w-4 inline-block mr-2" />
            Showing only students with unverified ID documents
          </p>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setShowOnlyUnverifiedIds(false)}
            className="h-8 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className={`border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${
            roleFilter === "all" && collegeFilter === "all" && !showOnlyUnverifiedIds ? "bg-gray-50 border-black" : ""
          }`} onClick={() => {
          setRoleFilter("all");
          setCollegeFilter("all");
          setSearchQuery("");
          setShowOnlyUnverifiedIds(false);
        }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">
              Total Users
            </CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">
              {unfilteredTotalUsers}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${
          roleFilter === "student" && collegeFilter === "all" && !showOnlyUnverifiedIds ? "bg-gray-50 border-blue-600" : ""
        }`} onClick={() => {
          setRoleFilter("student");
          setCollegeFilter("all");
          setSearchQuery("");
          setShowOnlyUnverifiedIds(false);
        }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">
              Students
            </CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">
              {totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${
          roleFilter === "vendor" && collegeFilter === "all" && !showOnlyUnverifiedIds ? "bg-gray-50 border-green-600" : ""
        }`} onClick={() => {
          setRoleFilter("vendor");
          setCollegeFilter("all");
          setSearchQuery("");
          setShowOnlyUnverifiedIds(false);
        }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">
              Vendors
            </CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">
              {totalVendors}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${
          showOnlyUnverifiedIds ? "bg-gray-50 border-yellow-600" : ""
        }`} onClick={() => {
          setRoleFilter("student");
          setCollegeFilter("all");
          setSearchQuery("");
          setShowOnlyUnverifiedIds(true);
        }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">
              Unverified IDs
            </CardTitle>
            <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">
              {totalUnverifiedIds}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Filter & Search - Stack vertically on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-semibold text-black">
              Users
            </h2>
            <Select 
              value={roleFilter} 
              onValueChange={(value) => {
                setRoleFilter(value);
                setShowOnlyUnverifiedIds(false);
              }}
            >
              <SelectTrigger className="w-[140px] h-9 bg-white text-black border-gray-300 text-sm">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">
                  All Roles
                </SelectItem>
                <SelectItem value="student" className="text-black">
                  Students
                </SelectItem>
                <SelectItem value="vendor" className="text-black">
                  Vendors
                </SelectItem>
                <SelectItem value="admin" className="text-black">
                  Admin
                </SelectItem>
                <SelectItem value="super_admin" className="text-black">
                  Super Admin
                </SelectItem>
                <SelectItem value="vendor_manager" className="text-black">
                  Vendor Manager
                </SelectItem>
                <SelectItem
                  value="marketplace_moderator"
                  className="text-black"
                >
                  Marketplace Moderator
                </SelectItem>
                <SelectItem value="user_support_admin" className="text-black">
                  User Support
                </SelectItem>
                <SelectItem value="analytics_manager" className="text-black">
                  Analytics Manager
                </SelectItem>
                <SelectItem value="content_manager" className="text-black">
                  Content Manager
                </SelectItem>
                <SelectItem value="cashier" className="text-black">
                  Cashier
                </SelectItem>
              </SelectContent>
            </Select>
            {/* Add this next to your existing role filter dropdown */}
            <Select 
              value={collegeFilter} 
              onValueChange={(value) => {
                setCollegeFilter(value);
                setShowOnlyUnverifiedIds(false);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 bg-white text-black border-gray-300 text-sm">
                <SelectValue placeholder="College" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">
                  All Colleges
                </SelectItem>
                {colleges.map((college) => (
                  <SelectItem
                    key={college.id}
                    value={college.id}
                    className="text-black"
                  >
                    {college.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Add Verify All IDs button */}
            {totalUnverifiedIds > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyAllIds}
                disabled={isSubmitting}
                className="bg-white text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Verify All IDs ({totalUnverifiedIds})
              </Button>
            )}

            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setShowOnlyUnverifiedIds(false);
              }}
              className="bg-white text-black border-gray-300 h-9 text-sm"
            />
          </div>
        </div>

        {/* Mobile User Cards View */}
        <div className="sm:hidden">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-black">No users found</div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-gray-300">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-black">
                          {user.first_name} {user.last_name || ""}
                        </h3>
                        <p className="text-sm text-black">{user.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewUser(user)}
                          className="h-8 w-8 text-black hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditUsers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={
                              user.role === "super_admin" &&
                              profile?.role !== "super_admin"
                            }
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete user permanently"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Role:</span>
                        <Badge
                          className={`${getRoleBadgeStyles(user.role)} text-xs`}
                        >
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Status:</span>
                        {user.role === "vendor" && !user.is_approved ? (
                          <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border text-xs">
                            Pending Approval
                          </Badge>
                        ) : user.is_active === false ? (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border text-xs">
                            Inactive
                          </Badge>
                        ) : (
                          <Badge className="border-green-400 bg-green-50 text-green-700 border text-xs">
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Joined:</span>
                        <span className="text-xs text-black">
                          {formatDate(user.created_at)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">ID Verified:</span>
                        {user.role === "vendor" ? (
                          <Badge className="border-gray-400 bg-gray-50 text-gray-700 border text-xs">
                            N/A
                          </Badge>
                        ) : user.id_image_url ? (
                          <Select
                            value={
                              user.is_id_verified ? "verified" : "not_verified"
                            }
                            onValueChange={(value) => {
                              handleUpdateVerificationStatus(
                                user.id,
                                value === "verified"
                              );
                            }}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger
                              className={`w-[110px] h-7 rounded-full text-xs py-0 px-2 border ${
                                user.is_id_verified
                                  ? "border-green-400 bg-green-50 text-green-700"
                                  : "border-yellow-400 bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-black">
                              <SelectItem
                                value="verified"
                                className="text-green-700 text-xs"
                              >
                                Verified
                              </SelectItem>
                              <SelectItem
                                value="not_verified"
                                className="text-yellow-700 text-xs"
                              >
                                Not Verified
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border text-xs">
                            ID Missing
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View - Optimized to render only visible data */}
        <div className="hidden sm:block">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead
                    className="text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField !== "name") {
                        setSortField("name");
                        setSortDirection("asc");
                      } else if (sortDirection === "asc") {
                        setSortDirection("desc");
                      } else if (sortDirection === "desc") {
                        setSortField(null);
                        setSortDirection(null);
                      } else {
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Name
                      {sortField === "name" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField !== "email") {
                        setSortField("email");
                        setSortDirection("asc");
                      } else if (sortDirection === "asc") {
                        setSortDirection("desc");
                      } else if (sortDirection === "desc") {
                        setSortField(null);
                        setSortDirection(null);
                      } else {
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Email
                      {sortField === "email" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField !== "role") {
                        setSortField("role");
                        setSortDirection("asc");
                      } else if (sortDirection === "asc") {
                        setSortDirection("desc");
                      } else if (sortDirection === "desc") {
                        setSortField(null);
                        setSortDirection(null);
                      } else {
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Role
                      {sortField === "role" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField !== "college") {
                        setSortField("college");
                        setSortDirection("asc");
                      } else if (sortDirection === "asc") {
                        setSortDirection("desc");
                      } else if (sortDirection === "desc") {
                        setSortField(null);
                        setSortDirection(null);
                      } else {
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      College
                      {sortField === "college" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead
                    className="text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField !== "created_at") {
                        setSortField("created_at");
                        setSortDirection("asc");
                      } else if (sortDirection === "asc") {
                        setSortDirection("desc");
                      } else if (sortDirection === "desc") {
                        setSortField(null);
                        setSortDirection(null);
                      } else {
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Joined
                      {sortField === "created_at" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-black">ID Verified</TableHead>
                  <TableHead className="text-right text-black">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-black"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-gray-200">
                      <TableCell className="font-medium text-black">
                        {user.first_name} {user.last_name || ""}
                      </TableCell>
                      <TableCell className="text-black">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeStyles(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-black">
                        {colleges.find((c) => c.id === user.college_id)
                          ?.name || "Not Assigned"}
                      </TableCell>
                      <TableCell>
                        {user.role === "vendor" && !user.is_approved ? (
                          <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border">
                            Pending Approval
                          </Badge>
                        ) : user.is_active === false ? (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border">
                            Inactive
                          </Badge>
                        ) : (
                          <Badge className="border-green-400 bg-green-50 text-green-700 border">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-black">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {user.role === "vendor" ? (
                          <Badge className="border-gray-400 bg-gray-50 text-gray-700 border">
                            N/A
                          </Badge>
                        ) : user.id_image_url ? (
                          <Select
                            value={
                              user.is_id_verified
                                ? "verified"
                                : "not_verified"
                            }
                            onValueChange={(value) => {
                              handleUpdateVerificationStatus(
                                user.id,
                                value === "verified"
                              );
                            }}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger
                              className={`w-[120px] rounded-full text-xs py-0.5 px-2.5 border ${
                                user.is_id_verified
                                  ? "border-green-400 bg-green-50 text-green-700"
                                  : "border-yellow-400 bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-black">
                              <SelectItem
                                value="verified"
                                className="text-green-700"
                              >
                                Verified
                              </SelectItem>
                              <SelectItem
                                value="not_verified"
                                className="text-yellow-700"
                              >
                                Not Verified
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border">
                            ID Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          className="text-black hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={
                              user.role === "super_admin" &&
                              profile?.role !== "super_admin"
                            }
                            className="text-red-600 hover:bg-red-50"
                            title="Delete user permanently"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={viewUserOpen} onOpenChange={setViewUserOpen}>
        <DialogContent className="sm:max-w-xl max-w-[90%] bg-white text-black border-gray-300 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle className="text-2xl font-bold text-black">User Profile</DialogTitle>
            <DialogDescription className="text-black text-sm">View user information and settings</DialogDescription>
          </DialogHeader>
          <div className="border-t border-gray-200 mt-2"></div>

          {selectedUser && (
            <div className="px-6 py-4 space-y-6">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        First Name
                      </label>
                      <Input
                        value={editFormState.firstName}
                        onChange={(e) => setEditFormState({...editFormState, firstName: e.target.value})}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        Last Name
                      </label>
                      <Input
                        value={editFormState.lastName}
                        onChange={(e) => setEditFormState({...editFormState, lastName: e.target.value})}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">
                      Email
                    </label>
                    <Input
                      value={selectedUser.email}
                      disabled
                      className="bg-gray-50 text-black border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        Role
                      </label>
                      <Select
                        value={editFormState.role}
                        onValueChange={(value) =>
                          setEditFormState({...editFormState, role: value as Profile["role"]})
                        }
                        disabled={
                          !canEditUsers ||
                          (profile?.role !== "super_admin" &&
                            selectedUser?.role === "super_admin")
                        }
                      >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="student" className="text-black">
                            Student
                          </SelectItem>
                          <SelectItem value="vendor" className="text-black">
                            Vendor
                          </SelectItem>

                          {/* Only super_admin and admin can assign admin roles */}
                          {(profile?.role === "super_admin" ||
                            profile?.role === "admin") && (
                            <>
                              <SelectItem value="admin" className="text-black">
                                Admin
                              </SelectItem>
                              <SelectItem
                                value="vendor_manager"
                                className="text-black"
                              >
                                Vendor Manager
                              </SelectItem>
                              <SelectItem
                                value="marketplace_moderator"
                                className="text-black"
                              >
                                Marketplace Moderator
                              </SelectItem>
                              <SelectItem
                                value="user_support_admin"
                                className="text-black"
                              >
                                User Support Admin
                              </SelectItem>
                              <SelectItem
                                value="analytics_manager"
                                className="text-black"
                              >
                                Analytics Manager
                              </SelectItem>
                              <SelectItem
                                value="content_manager"
                                className="text-black"
                              >
                                Content Manager
                              </SelectItem>
                              <SelectItem
                                value="cashier"
                                className="text-black"
                              >
                                Cashier
                              </SelectItem>
                            </>
                          )}

                          {/* Only super_admin can assign the super_admin role */}
                          {profile?.role === "super_admin" && (
                            <SelectItem
                              value="super_admin"
                              className="text-black"
                            >
                              Super Admin
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        Vendor Approved
                      </label>
                      <div className="flex items-center h-10 space-x-2">
                        <input
                          type="checkbox"
                          id="isApproved"
                          checked={editFormState.isApproved}
                          onChange={(e) => setEditFormState({...editFormState, isApproved: e.target.checked})}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isApproved" className="text-black">
                          Approved
                        </label>
                      </div>
                    </div>
                  </div>

                  {editFormState.role !== "vendor" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        ID Verification Status
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isIdVerified"
                          checked={editFormState.isIdVerified}
                          onChange={(e) =>
                            setEditFormState({...editFormState, isIdVerified: e.target.checked})
                          }
                          disabled={!selectedUser.id_image_url}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isIdVerified" className="text-black">
                          Verified
                        </label>
                      </div>
                      {!selectedUser.id_image_url && (
                        <p className="text-sm text-gray-500 mt-1">
                          ID image required for verification
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Personal Information Card */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-black mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="text-sm font-medium text-black">
                          {selectedUser.first_name} {selectedUser.last_name || ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email Address</p>
                        <p className="text-sm font-medium text-black">
                          {selectedUser.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="text-sm font-medium text-black">
                          {selectedUser.phone_number || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Member Since</p>
                        <p className="text-sm font-medium text-black">
                          {formatDate(selectedUser.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Information Section */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-black mb-2">Role</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-full px-3 py-1 ${getRoleBadgeStyles(selectedUser.role)}`}>
                          {getRoleDisplayName(selectedUser.role)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPermissions(selectedUser.role)}
                          className="h-8 text-sm border-gray-300"
                        >
                          View Permissions
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-black mb-2">Account Status</p>
                      <Badge 
                        className={selectedUser.is_active
                          ? "bg-green-50 text-green-700 border border-green-300 rounded-full px-3 py-1"
                          : "bg-red-50 text-red-700 border border-red-300 rounded-full px-3 py-1"
                        }
                      >
                        {selectedUser.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* ID Verification Card */}
                  {selectedUser.role !== "vendor" && (
                    <div className="mt-8">
                      <div className="flex items-center mb-3">
                        <CheckSquare className="h-5 w-5 mr-2 text-black" />
                        <h3 className="text-lg font-medium text-black">ID Verification</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedUser.id_image_url ? (
                          <>
                            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 flex justify-center">
                              <Image
                                src={selectedUser.id_image_url}
                                alt="User ID Image"
                                width={400}
                                height={250}
                                style={{ objectFit: "contain" }}
                                className="my-2"
                              />
                            </div>
                            <div>
                              <p className="text-sm text-black mb-2">Verification Status</p>
                              <Select
                                value={selectedUser.is_id_verified ? "verified" : "not_verified"}
                                onValueChange={(value) => {
                                  handleUpdateVerificationStatus(
                                    selectedUser.id,
                                    value === "verified"
                                  );
                                }}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className={`w-[140px] border rounded-full ${
                                  selectedUser.is_id_verified
                                    ? "border-green-400 bg-green-50 text-green-700"
                                    : "border-yellow-400 bg-yellow-50 text-yellow-700"
                                }`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white text-black">
                                  <SelectItem value="verified" className="text-green-700">
                                    Verified
                                  </SelectItem>
                                  <SelectItem value="not_verified" className="text-yellow-700">
                                    Not Verified
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-sm text-gray-500">No ID image uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-gray-200 pt-4 flex justify-end">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="border-gray-300 text-black hover:bg-gray-100 mr-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveUser}
                      disabled={isSubmitting}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  canEditUsers && (
                    <Button
                      onClick={handleEditUser}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
      >
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">
              Delete User Permanently
            </DialogTitle>
            <DialogDescription className="text-black">
              This action <strong>cannot be undone</strong>. The user and all
              associated data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> You are about to permanently delete
                  this user:
                </p>
                <div className="mt-2 pl-2 border-l-2 border-red-300">
                  <p className="text-black font-medium">
                    {userToDelete.first_name} {userToDelete.last_name}
                  </p>
                  <p className="text-black text-sm">{userToDelete.email}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-black text-sm mr-2">Role:</span>
                    <Badge className={getRoleBadgeStyles(userToDelete.role)}>
                      {getRoleDisplayName(userToDelete.role)}
                    </Badge>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmationOpen(false)}
                  className="border-gray-300 text-black hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteUser}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? "Deleting..." : "Permanently Delete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Permissions Dialog */}
      <Dialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
      >
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white z-10">
            <DialogTitle className="text-black">Role Permissions</DialogTitle>
            <DialogDescription className="text-black">
              Permissions for{" "}
              {selectedRolePermissions?.role_name
                ? getRoleDisplayName(selectedRolePermissions.role_name)
                : "this role"}
            </DialogDescription>
          </DialogHeader>

          {selectedRolePermissions ? (
            <div className="space-y-3">
              {selectedRolePermissions.role_name && (
                <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">
                    {getRoleDescription(selectedRolePermissions.role_name)}
                  </p>
                </div>
              )}

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-black">Permission</TableHead>
                      <TableHead className="text-right text-black">
                        Access
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selectedRolePermissions.permissions).map(
                      (entry) => (
                        <TableRow key={entry[0]} className="border-gray-200">
                          <TableCell className="font-medium text-black text-sm">
                            {entry[0]
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof entry[1] === "boolean" ? (
                              <Badge
                                className={
                                  entry[1]
                                    ? "bg-green-50 text-green-700 border border-green-300"
                                    : "bg-gray-50 text-gray-700 border border-gray-300"
                                }
                              >
                                {entry[1] ? "Yes" : "No"}
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                                onClick={() =>
                                  alert(JSON.stringify(entry[1], null, 2))
                                }
                              >
                                View Details
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t">
                <Button
                  onClick={() => setPermissionsDialogOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-4 text-center text-black">
              Loading permissions...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add pagination controls after the table */}
      {PaginationControls}
    </div>
  );
}