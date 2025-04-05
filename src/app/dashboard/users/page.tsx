// app/dashboard/users/page.tsx - Mobile-friendly version
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, RolePermission } from '@/lib/supabase';
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
import { Eye, Edit, User, UserX, CheckSquare, ShieldCheck, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

export default function UsersPage() {
  const { profile, isLoading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewUserOpen, setViewUserOpen] = useState(false);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState<Profile['role']>('student');
  const [editIsApproved, setEditIsApproved] = useState(false);
  const [editIsIdVerified, setEditIsIdVerified] = useState(false);

  // State for permissions dialog
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<RolePermission | null>(null);

  // State for role management dialog
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [allRolePermissions, setAllRolePermissions] = useState<RolePermission[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  
  // State for custom role creation
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<Record<string, boolean>>({
    user_management: false,
    vendor_management: false,
    marketplace_management: false,
    support_management: false,
    analytics_access: false,
    content_management: false,
    settings_access: false,
    role_assignment: false,
    order_management: false,
    payment_processing: false
  });

  useEffect(() => {
    const fetchUsers = async () => {
      // Check for admin or super_admin privileges
      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && 
          profile.role !== 'vendor_manager' && profile.role !== 'user_support_admin')) {
        setError('You do not have sufficient permissions to access this page');
        return;
      }

      try {
        // Use direct Supabase call instead of API route to avoid auth issues
        const { data, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;
        setUsers(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching users';
        setError(errorMessage);
        console.error(err);
      }
    };

    if (!isLoading) fetchUsers();
  }, [profile, isLoading]);

  const handleViewUser = (user: Profile) => {
    setSelectedUser(user);
    setViewUserOpen(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    setEditFirstName(selectedUser.first_name || '');
    setEditLastName(selectedUser.last_name || '');
    setEditRole(selectedUser.role);
    setEditIsApproved(selectedUser.is_approved || false);
    setEditIsIdVerified(selectedUser.is_id_verified || false);
    setIsEditing(true);
  };

  // New function to verify all student IDs
  const handleVerifyAllIds = async () => {
    if (!canEditUsers) return;
    
    // Confirm with the admin before proceeding
    if (!confirm('Are you sure you want to verify all student IDs with uploaded images? This will mark all unverified student IDs as verified.')) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get all student users who have ID images uploaded but aren't verified yet
      const unverifiedUsers = users.filter(
        user => user.role === 'student' && user.id_image_url && !user.is_id_verified
      );
      
      if (unverifiedUsers.length === 0) {
        setSuccess('No unverified student IDs found');
        setIsSubmitting(false);
        return;
      }
      
      // Update each user one by one (we could also create a new API endpoint to do this in bulk)
      const results = await Promise.all(
        unverifiedUsers.map(async (user) => {
          const response = await fetch('/api/update-user-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              isIdVerified: true
            }),
          });
          
          return { 
            id: user.id, 
            success: response.ok 
          };
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      // Update local state
      setUsers(users.map(u => 
        unverifiedUsers.some(uu => uu.id === u.id) ? { ...u, is_id_verified: true } : u
      ));
      
      if (selectedUser && unverifiedUsers.some(u => u.id === selectedUser.id)) {
        setSelectedUser({
          ...selectedUser,
          is_id_verified: true
        });
      }
      
      setSuccess(`Successfully verified ${successCount} student IDs${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error verifying all IDs';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser || !canEditUsers) return;
    
    // Only super_admin can create or modify another super_admin
    if (editRole === 'super_admin' && profile?.role !== 'super_admin') {
      setError('Only a super admin can assign the super admin role');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
  
    try {
      console.log("Attempting to update user:", {
        id: selectedUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        role: editRole,
        isApproved: editIsApproved,
        isIdVerified: editIsIdVerified
      });
  
      // Use the server API route to bypass RLS policies
      const response = await fetch('/api/update-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          firstName: editFirstName,
          lastName: editLastName,
          role: editRole,
          isApproved: editIsApproved,
          isIdVerified: editIsIdVerified
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }
  
      console.log("Update successful:", result);
      setSuccess('User updated successfully');
  
      // Update local state
      setUsers(users.map(u =>
        u.id === selectedUser.id ? {
          ...u,
          first_name: editFirstName,
          last_name: editLastName,
          role: editRole,
          is_approved: editIsApproved,
          is_id_verified: editIsIdVerified,
        } : u
      ));
  
      setSelectedUser({
        ...selectedUser,
        first_name: editFirstName,
        last_name: editLastName,
        role: editRole,
        is_approved: editIsApproved,
        is_id_verified: editIsIdVerified,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Full error object:', err);
      let errorMessage = 'Error updating user';
      
      // Try to extract meaningful error message
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVerificationStatus = async (userId: string, isVerified: boolean) => {
    if (!canEditUsers) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/update-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          isIdVerified: isVerified
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update verification status');
      }
      
      setSuccess('Verification status updated successfully');
      
      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? {
          ...u,
          is_id_verified: isVerified,
        } : u
      ));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({
          ...selectedUser,
          is_id_verified: isVerified,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating verification status';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!canEditUsers) return;
    
    // Prevent deactivating super_admin if not a super_admin
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'super_admin' && profile?.role !== 'super_admin') {
      setError('Only a super admin can deactivate another super admin');
      return;
    }
    
    if (!confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the server API route to deactivate user
      const response = await fetch('/api/deactivate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate user');
      }

      setSuccess('User deactivated successfully');

      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_active: false } : u
      ));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: false });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deactivating user';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchMatches =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const roleMatches = roleFilter === 'all' || user.role === roleFilter;
    return searchMatches && roleMatches;
  });

  const usersByRole = {
    student: users.filter(u => u.role === 'student').length,
    vendor: users.filter(u => u.role === 'vendor').length,
    admin: users.filter(u => ['admin', 'super_admin', 'vendor_manager', 'marketplace_moderator', 
              'user_support_admin', 'analytics_manager', 'content_manager', 'cashier'].includes(u.role)).length,
    pendingVendors: users.filter(u => u.role === 'vendor' && !u.is_approved).length,
    adminCount: {
      admin: users.filter(u => u.role === 'admin').length,
      superAdmin: users.filter(u => u.role === 'super_admin').length,
      vendorManager: users.filter(u => u.role === 'vendor_manager').length,
      marketplaceModerator: users.filter(u => u.role === 'marketplace_moderator').length,
      userSupport: users.filter(u => u.role === 'user_support_admin').length,
      analytics: users.filter(u => u.role === 'analytics_manager').length,
      content: users.filter(u => u.role === 'content_manager').length,
      cashier: users.filter(u => u.role === 'cashier').length,
    }
  };

  // Calculate the count of students with IDs uploaded but not verified yet
  const unverifiedIdsCount = users.filter(
    u => u.role === 'student' && u.id_image_url && !u.is_id_verified
  ).length;

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessUserManagement = profile && (
    profile.role === 'super_admin' || 
    profile.role === 'admin' || 
    profile.role === 'vendor_manager' || 
    profile.role === 'user_support_admin'
  );

  // Determine if the user can edit other users
  const canEditUsers = profile && (
    profile.role === 'super_admin' || 
    profile.role === 'admin'
  );

  if (!canAccessUserManagement) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  // Add a helper function to get role display name from slug
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'vendor_manager': return 'Vendor Manager';
      case 'marketplace_moderator': return 'Marketplace Moderator';
      case 'user_support_admin': return 'User Support';
      case 'analytics_manager': return 'Analytics Manager';
      case 'content_manager': return 'Content Manager';
      case 'cashier': return 'Cashier';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Helper for role badge styling
  const getRoleBadgeStyles = (role: string): string => {
    switch (role) {
      case 'admin': return 'border-purple-400 bg-purple-50 text-purple-700 border';
      case 'super_admin': return 'border-indigo-400 bg-indigo-50 text-indigo-700 border';
      case 'vendor_manager': return 'border-emerald-400 bg-emerald-50 text-emerald-700 border';
      case 'marketplace_moderator': return 'border-sky-400 bg-sky-50 text-sky-700 border';
      case 'user_support_admin': return 'border-rose-400 bg-rose-50 text-rose-700 border';
      case 'analytics_manager': return 'border-amber-400 bg-amber-50 text-amber-700 border';
      case 'content_manager': return 'border-teal-400 bg-teal-50 text-teal-700 border';
      case 'cashier': return 'border-orange-400 bg-orange-50 text-orange-700 border';
      case 'vendor': return 'border-green-400 bg-green-50 text-green-700 border';
      default: return 'border-blue-400 bg-blue-50 text-blue-700 border'; // student and others
    }
  };

  // Function to fetch role permissions
  const fetchRolePermissions = async (roleName: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_name', roleName)
        .single();
      
      if (error) {
        console.error('Error fetching role permissions:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error in fetchRolePermissions:', err);
      return null;
    }
  };

  // Handler to view role permissions
  const handleViewPermissions = async (roleName: string) => {
    const permissions = await fetchRolePermissions(roleName);
    setSelectedRolePermissions(permissions);
    setPermissionsDialogOpen(true);
  };

  // Add role descriptions for the permissions dialog
  const getRoleDescription = (role: string): string => {
    switch (role) {
      case 'super_admin':
        return 'Full access to everything including user management, vendors, marketplace, settings. Can assign and remove admin roles.';
      case 'admin':
        return 'Administrative access to most system functions, but with some restrictions compared to Super Admin.';
      case 'vendor_manager':
        return 'Manages vendor approvals and onboarding. Updates vendor details and resolves vendor issues.';
      case 'marketplace_moderator':
        return 'Monitors listings to ensure quality and compliance. Approves or removes products/services.';
      case 'user_support_admin':
        return 'Handles user complaints and support tickets. Manages refunds, order disputes, or account issues.';
      case 'analytics_manager':
        return 'Tracks key metrics like vendor activity, sales, and user engagement. Provides reports to help improve the platform.';
      case 'content_manager':
        return 'Manages platform-wide announcements. Updates terms, policies, or notifications.';
      case 'cashier':
        return 'Processes customer payments and handles transactions. Accepts or rejects incoming orders and updates order status.';
      case 'vendor':
        return 'Can manage their own vendor profile, menu items, and process orders from their customers.';
      case 'student':
        return 'Regular user account with access to browse marketplace, place orders, and manage their profile.';
      default:
        return 'Standard account with basic permissions.';
    }
  };

  // Function to fetch all roles and their permissions
  const fetchAllRolePermissions = async () => {
    setIsLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role_name');
      
      if (error) {
        console.error('Error fetching role permissions:', error);
        return;
      }
      
      setAllRolePermissions(data || []);
    } catch (err) {
      console.error('Error in fetchAllRolePermissions:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleOpenRoleManagement = () => {
    fetchAllRolePermissions();
    setRoleManagementOpen(true);
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">User Management</h1>
        <p className="text-black text-sm sm:text-base">
          Manage users, roles, and permissions
        </p>
      </div>

      {/* Admin action buttons */}
      {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenRoleManagement}
            className="bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          >
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles & Permissions
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

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Total Users</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Students</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{usersByRole.student}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Vendors</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{usersByRole.vendor}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Pending</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-700" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{usersByRole.pendingVendors}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Filter & Search - Stack vertically on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-semibold text-black">Users</h2>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-white text-black border-gray-300 text-sm">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">All Roles</SelectItem>
                <SelectItem value="student" className="text-black">Students</SelectItem>
                <SelectItem value="vendor" className="text-black">Vendors</SelectItem>
                <SelectItem value="admin" className="text-black">Admin</SelectItem>
                <SelectItem value="super_admin" className="text-black">Super Admin</SelectItem>
                <SelectItem value="vendor_manager" className="text-black">Vendor Manager</SelectItem>
                <SelectItem value="marketplace_moderator" className="text-black">Marketplace Moderator</SelectItem>
                <SelectItem value="user_support_admin" className="text-black">User Support</SelectItem>
                <SelectItem value="analytics_manager" className="text-black">Analytics Manager</SelectItem>
                <SelectItem value="content_manager" className="text-black">Content Manager</SelectItem>
                <SelectItem value="cashier" className="text-black">Cashier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Add Verify All IDs button */}
            {unverifiedIdsCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVerifyAllIds}
                disabled={isSubmitting}
                className="bg-white text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Verify All IDs ({unverifiedIdsCount})
              </Button>
            )}
            
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-black border-gray-300 h-9 text-sm"
            />
          </div>
        </div>

        {/* Mobile User Cards View */}
        <div className="sm:hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-black">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-gray-300">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-black">
                          {user.first_name} {user.last_name || ''}
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
                            onClick={() => handleDeactivateUser(user.id)}
                            disabled={user.is_active === false || (user.role === 'super_admin' && profile?.role !== 'super_admin')}
                            className="h-8 w-8 text-black hover:bg-gray-100"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Role:</span>
                        <Badge className={`${getRoleBadgeStyles(user.role)} text-xs`}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Status:</span>
                        {user.role === 'vendor' && !user.is_approved ? (
                          <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border text-xs">Pending Approval</Badge>
                        ) : user.is_active === false ? (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border text-xs">Inactive</Badge>
                        ) : (
                          <Badge className="border-green-400 bg-green-50 text-green-700 border text-xs">Active</Badge>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">Joined:</span>
                        <span className="text-xs text-black">{formatDate(user.created_at)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-black">ID Verified:</span>
                        {user.role === 'vendor' ? (
                          <Badge className="border-gray-400 bg-gray-50 text-gray-700 border text-xs">N/A</Badge>
                        ) : user.id_image_url ? (
                          <Select 
                            value={user.is_id_verified ? "verified" : "not_verified"}
                            onValueChange={(value) => {
                              handleUpdateVerificationStatus(user.id, value === "verified");
                            }}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className={`w-[110px] h-7 rounded-full text-xs py-0 px-2 border ${
                              user.is_id_verified 
                                ? "border-green-400 bg-green-50 text-green-700" 
                                : "border-yellow-400 bg-yellow-50 text-yellow-700"
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-black">
                              <SelectItem value="verified" className="text-green-700 text-xs">Verified</SelectItem>
                              <SelectItem value="not_verified" className="text-yellow-700 text-xs">Not Verified</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className="border-red-400 bg-red-50 text-red-700 border text-xs">ID Missing</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Card className="border-gray-300">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Name</TableHead>
                      <TableHead className="text-black">Email</TableHead>
                      <TableHead className="text-black">Role</TableHead>
                      <TableHead className="text-black">Status</TableHead>
                      <TableHead className="text-black">Joined</TableHead>
                      <TableHead className="text-black">ID Verified</TableHead>
                      <TableHead className="text-right text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-black">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-gray-200">
                          <TableCell className="font-medium text-black">
                            {user.first_name} {user.last_name || ''}
                          </TableCell>
                          <TableCell className="text-black">{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeStyles(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role === 'vendor' && !user.is_approved ? (
                              <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border">Pending Approval</Badge>
                            ) : user.is_active === false ? (
                              <Badge className="border-red-400 bg-red-50 text-red-700 border">Inactive</Badge>
                            ) : (
                              <Badge className="border-green-400 bg-green-50 text-green-700 border">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-black">{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            {user.role === 'vendor' ? (
                              <Badge className="border-gray-400 bg-gray-50 text-gray-700 border">N/A</Badge>
                            ) : user.id_image_url ? (
                              <Select 
                                value={user.is_id_verified ? "verified" : "not_verified"}
                                onValueChange={(value) => {
                                  handleUpdateVerificationStatus(user.id, value === "verified");
                                }}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className={`w-[120px] rounded-full text-xs py-0.5 px-2.5 border ${
                                  user.is_id_verified 
                                    ? "border-green-400 bg-green-50 text-green-700" 
                                    : "border-yellow-400 bg-yellow-50 text-yellow-700"
                                }`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white text-black">
                                  <SelectItem value="verified" className="text-green-700">Verified</SelectItem>
                                  <SelectItem value="not_verified" className="text-yellow-700">Not Verified</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className="border-red-400 bg-red-50 text-red-700 border">ID Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewUser(user)}
                              className="text-black hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditUsers && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivateUser(user.id)}
                                disabled={user.is_active === false || (user.role === 'super_admin' && profile?.role !== 'super_admin')}
                                className="text-black hover:bg-gray-100"
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={viewUserOpen} onOpenChange={setViewUserOpen}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">{isEditing ? 'Edit User' : 'User Details'}</DialogTitle>
            <DialogDescription className="text-black">
              {isEditing ? 'Update user information' : 'View user information and settings'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">First Name</label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Last Name</label>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Email</label>
                    <Input
                      value={selectedUser.email}
                      disabled
                      className="bg-gray-50 text-black border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Role</label>
                      <Select 
                        value={editRole} 
                        onValueChange={(value) => setEditRole(value as Profile['role'])}
                        disabled={!canEditUsers || (profile?.role !== 'super_admin' && selectedUser?.role === 'super_admin')}
                      >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="student" className="text-black">Student</SelectItem>
                          <SelectItem value="vendor" className="text-black">Vendor</SelectItem>
                          
                          {/* Only super_admin and admin can assign admin roles */}
                          {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                            <>
                              <SelectItem value="admin" className="text-black">Admin</SelectItem>
                              <SelectItem value="vendor_manager" className="text-black">Vendor Manager</SelectItem>
                              <SelectItem value="marketplace_moderator" className="text-black">Marketplace Moderator</SelectItem>
                              <SelectItem value="user_support_admin" className="text-black">User Support Admin</SelectItem>
                              <SelectItem value="analytics_manager" className="text-black">Analytics Manager</SelectItem>
                              <SelectItem value="content_manager" className="text-black">Content Manager</SelectItem>
                              <SelectItem value="cashier" className="text-black">Cashier</SelectItem>
                            </>
                          )}
                          
                          {/* Only super_admin can assign the super_admin role */}
                          {profile?.role === 'super_admin' && (
                            <SelectItem value="super_admin" className="text-black">Super Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Vendor Approved</label>
                      <div className="flex items-center h-10 space-x-2">
                        <input
                          type="checkbox"
                          id="isApproved"
                          checked={editIsApproved}
                          onChange={(e) => setEditIsApproved(e.target.checked)}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isApproved" className="text-black">Approved</label>
                      </div>
                    </div>
                  </div>

                  {editRole !== 'vendor' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">ID Verification Status</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isIdVerified"
                          checked={editIsIdVerified}
                          onChange={(e) => setEditIsIdVerified(e.target.checked)}
                          disabled={!selectedUser.id_image_url}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isIdVerified" className="text-black">Verified</label>
                      </div>
                      {!selectedUser.id_image_url && (
                        <p className="text-sm text-gray-500 mt-1">ID image required for verification</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-black">Personal Information</h3>
                      <div className="mt-2 space-y-1">
                      <p className="text-black">
                          <span className="font-medium">Name:</span> {selectedUser.first_name} {selectedUser.last_name || ''}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Email:</span> {selectedUser.email}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Phone:</span> {selectedUser.phone_number || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-black">Account Information</h3>
                      <div className="text-black mb-2">
                        <span className="font-medium">Role:</span>{' '}
                        <Badge className={getRoleBadgeStyles(selectedUser.role)}>
                          {getRoleDisplayName(selectedUser.role)}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPermissions(selectedUser.role)}
                        className="text-black border-gray-300 hover:bg-gray-100"
                      >
                        View Role Permissions
                      </Button>
                    </div>

                    {selectedUser.role !== 'vendor' && selectedUser.id_image_url && (
                      <div>
                        <h3 className="text-sm font-medium text-black">ID Image</h3>
                        <div className="mt-2 relative h-48 sm:h-64 w-full">
                          <Image
                            src={selectedUser.id_image_url}
                            alt="User ID Image"
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            style={{ objectFit: 'contain' }}
                            className="rounded-md"
                          />
                        </div>
                      </div>
                    )}

                    {selectedUser.role !== 'vendor' && (
                      <div>
                        <h3 className="text-sm font-medium text-black">Verification Status</h3>
                        <div className="mt-2">
                          {selectedUser.id_image_url ? (
                            <Select 
                              value={selectedUser.is_id_verified ? "verified" : "not_verified"}
                              onValueChange={(value) => {
                                handleUpdateVerificationStatus(selectedUser.id, value === "verified");
                              }}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className={`w-[120px] rounded-full text-xs py-0.5 px-2.5 border ${
                                selectedUser.is_id_verified 
                                  ? "border-green-400 bg-green-50 text-green-700" 
                                  : "border-yellow-400 bg-yellow-50 text-yellow-700"
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white text-black">
                                <SelectItem value="verified" className="text-green-700">Verified</SelectItem>
                                <SelectItem value="not_verified" className="text-yellow-700">Not Verified</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className="border-red-400 bg-red-50 text-red-700 border">ID Missing</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="border-gray-300 text-black hover:bg-gray-100 w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveUser}
                      disabled={isSubmitting}
                      className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  canEditUsers && (
                    <Button
                      onClick={handleEditUser}
                      className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                  )
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Role Permissions</DialogTitle>
            <DialogDescription className="text-black">
              Permissions for {selectedRolePermissions?.role_name ? getRoleDisplayName(selectedRolePermissions.role_name) : 'this role'}
            </DialogDescription>
          </DialogHeader>

          {selectedRolePermissions ? (
            <div className="space-y-4">
              {selectedRolePermissions.role_name && (
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">{getRoleDescription(selectedRolePermissions.role_name)}</p>
                </div>
              )}
              
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Permission</TableHead>
                      <TableHead className="text-black text-right">Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selectedRolePermissions.permissions).map(entry => (
                      <TableRow key={entry[0]} className="border-gray-200">
                        <TableCell className="font-medium text-black">
                          {entry[0].split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </TableCell>
                        <TableCell className="text-right">
                          {typeof entry[1] === 'boolean' ? (
                            <Badge className={entry[1] ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-gray-50 text-gray-700 border border-gray-300'}>
                              {entry[1] ? 'Yes' : 'No'}
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                              onClick={() => alert(JSON.stringify(entry[1], null, 2))}
                            >
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter>
                <Button
                  onClick={() => setPermissionsDialogOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto"
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

      {/* Role Management Dialog */}
      <Dialog open={roleManagementOpen} onOpenChange={setRoleManagementOpen}>
        <DialogContent className="max-w-4xl bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Role Management</DialogTitle>
            <DialogDescription className="text-black">
              Manage and configure roles and their permissions
            </DialogDescription>
          </DialogHeader>

          {isLoadingRoles ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Loading roles...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-black">Available Roles</h3>
                {profile?.role === 'super_admin' && (
                  <Button 
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => setCreateRoleDialogOpen(true)}
                  >
                    Create Custom Role
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allRolePermissions.map(roleData => (
                  <Card key={roleData.role_name} className="border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">
                          <Badge className={getRoleBadgeStyles(roleData.role_name)}>
                            {getRoleDisplayName(roleData.role_name)}
                          </Badge>
                        </CardTitle>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedRolePermissions(roleData);
                              setPermissionsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {profile?.role === 'super_admin' && roleData.role_name !== 'super_admin' && roleData.role_name !== 'admin' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 text-indigo-600"
                              onClick={() => {/* TODO: Implement edit role functionality */}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{getRoleDescription(roleData.role_name)}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs space-y-1">
                        {Object.entries(roleData.permissions)
                          .filter(entry => entry[1] === true)
                          .slice(0, 3)
                          .map(entry => (
                            <div key={entry[0]} className="flex items-center">
                              <ShieldCheck className="h-3 w-3 mr-1 text-green-600" />
                              <span>
                                {entry[0].split('_')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ')}
                              </span>
                            </div>
                          ))}
                        
                        {Object.entries(roleData.permissions).filter(entry => entry[1] === true).length > 3 && (
                          <div 
                            className="text-blue-600 cursor-pointer" 
                            onClick={() => {
                              setSelectedRolePermissions(roleData);
                              setPermissionsDialogOpen(true);
                            }}
                          >
                            + {Object.entries(roleData.permissions).filter(entry => entry[1] === true).length - 3} more permissions
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-black mb-2">About Admin Roles</h4>
                <p className="text-xs text-gray-700 mb-3">
                  Admin roles provide different levels of access to the system. Each role has specific permissions that determine what actions the user can perform.
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>• <strong>Super Admin</strong> - Full access to all system functions</p>
                  <p>• <strong>Vendor Manager</strong> - Manages vendors and their approvals</p>
                  <p>• <strong>Marketplace Moderator</strong> - Monitors product listings</p>
                  <p>• <strong>User Support</strong> - Handles user tickets and issues</p>
                  <p>• <strong>Analytics Manager</strong> - Access to reports and analytics</p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRoleManagementOpen(false)}
                  className="bg-white text-black border-gray-300"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Create Custom Role</DialogTitle>
            <DialogDescription className="text-black">
              Define a new custom role with specific permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Role Name</label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Finance Manager"
                className="bg-white text-black border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-black">Permissions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(newRolePermissions).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`perm-${key}`}
                      checked={value}
                      onChange={(e) => setNewRolePermissions({
                        ...newRolePermissions,
                        [key]: e.target.checked
                      })}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <label htmlFor={`perm-${key}`} className="text-sm text-black">
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateRoleDialogOpen(false)}
              className="bg-white text-black border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                /* TODO: Implement role creation functionality */
                alert('Create role functionality would go here');
                setCreateRoleDialogOpen(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}