// app/dashboard/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
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
import { Eye, Edit, User, UserX, CheckCircle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
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
  const [editRole, setEditRole] = useState<'student' | 'vendor' | 'admin'>('student');
  const [editIsApproved, setEditIsApproved] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      // Only fetch users if the current user is an admin
      if (!profile) return;
      
      if (profile.role !== 'admin') {
        setError('Only administrators can access this page');
        return;
      }

      try {
        // Debug to console - this will show in browser dev tools
        console.log('Fetching users as admin with role:', profile.role);
        
        // Temporarily log the current user to verify their admin status
        console.log('Current user:', profile);
        
        // Fetch ALL users with explicit debugging
        const { data, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (usersError) {
          console.error('Supabase error:', usersError);
          throw usersError;
        }
        
        if (!data || data.length === 0) {
          console.log('No users found in the database');
          setError('No users found in the database. Please check your database connection.');
        } else {
          console.log(`Found ${data.length} users:`, data);
          // Additional debugging - check if user roles exist
          const roles = data.map(user => user.role);
          const uniqueRoles = [...new Set(roles)];
          console.log('User roles found:', uniqueRoles);
        }
        
        setUsers(data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching users');
        console.error(err);
      }
    };

    if (!isLoading) {
      fetchUsers();
    }
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
    setIsEditing(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser || profile?.role !== 'admin') return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          role: editRole,
          is_approved: editIsApproved,
        })
        .eq('id', selectedUser.id);
      
      if (updateError) throw updateError;
      
      setSuccess('User updated successfully');
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? {
          ...u,
          first_name: editFirstName,
          last_name: editLastName,
          role: editRole,
          is_approved: editIsApproved,
        } : u
      ));
      
      // Update selected user
      setSelectedUser({
        ...selectedUser,
        first_name: editFirstName,
        last_name: editLastName,
        role: editRole,
        is_approved: editIsApproved,
      });
      
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Error updating user');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (profile?.role !== 'admin') return;
    
    if (!confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // In a real application, you'd use Supabase Auth Admin APIs to disable the user
      // For now, we'll just simulate it by updating a field
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      setSuccess('User deactivated successfully');
      
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: false } : u
      ));
      
      // Update selected user if needed
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: false });
      }
    } catch (err: any) {
      setError(err.message || 'Error deactivating user');
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
    admin: users.filter(u => u.role === 'admin').length,
    pendingVendors: users.filter(u => u.role === 'vendor' && !u.is_approved).length
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  // Block non-admin users from accessing this page at the UI level
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">User Management</h1>
        <p className="text-black">
          Manage users, roles, and permissions
        </p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Users</CardTitle>
            <User className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Students</CardTitle>
            <User className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{usersByRole.student}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Vendors</CardTitle>
            <User className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{usersByRole.vendor}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Pending Approval</CardTitle>
            <User className="h-4 w-4 text-yellow-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{usersByRole.pendingVendors}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-black">Users</h2>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px] bg-white text-black border-gray-300">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">All Roles</SelectItem>
                <SelectItem value="student" className="text-black">Students</SelectItem>
                <SelectItem value="vendor" className="text-black">Vendors</SelectItem>
                <SelectItem value="admin" className="text-black">Administrators</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/3">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-black border-gray-300"
            />
          </div>
        </div>

        <Card className="border-gray-300">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Name</TableHead>
                  <TableHead className="text-black">Email</TableHead>
                  <TableHead className="text-black">Role</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-black">Joined</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-black">
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
                        <Badge className={
                          user.role === 'admin'
                            ? 'border-purple-400 bg-purple-50 text-purple-700 border'
                            : user.role === 'vendor'
                            ? 'border-green-400 bg-green-50 text-green-700 border'
                            : 'border-blue-400 bg-blue-50 text-blue-700 border'
                        }>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewUser(user)}
                          className="text-black hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateUser(user.id)}
                          disabled={user.is_active === false}
                          className="text-black hover:bg-gray-100"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* User Details Dialog */}
      <Dialog open={viewUserOpen} onOpenChange={setViewUserOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Role</label>
                      <Select value={editRole} onValueChange={(value) => setEditRole(value as any)}>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="student" className="text-black">Student</SelectItem>
                          <SelectItem value="vendor" className="text-black">Vendor</SelectItem>
                          <SelectItem value="admin" className="text-black">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Status</label>
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
                      <div className="mt-2 space-y-1">
                        <p className="text-black">
                          <span className="font-medium">Role:</span>{' '}
                          <Badge className={
                            selectedUser.role === 'admin'
                              ? 'border-purple-400 bg-purple-50 text-purple-700 border'
                              : selectedUser.role === 'vendor'
                              ? 'border-green-400 bg-green-50 text-green-700 border'
                              : 'border-blue-400 bg-blue-50 text-blue-700 border'
                          }>
                            {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                          </Badge>
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Status:</span>{' '}
                          {selectedUser.role === 'vendor' && !selectedUser.is_approved ? (
                            <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border">Pending Approval</Badge>
                          ) : selectedUser.is_active === false ? (
                            <Badge className="border-red-400 bg-red-50 text-red-700 border">Inactive</Badge>
                          ) : (
                            <Badge className="border-green-400 bg-green-50 text-green-700 border">Active</Badge>
                          )}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Joined:</span> {formatDate(selectedUser.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedUser.role === 'student' && (
                      <div>
                        <h3 className="text-sm font-medium text-black">Student Information</h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-black">
                            <span className="font-medium">Student ID:</span> {selectedUser.student_id || 'Not provided'}
                          </p>
                          <p className="text-black">
                            <span className="font-medium">Graduation Year:</span> {selectedUser.graduation_year || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedUser.role === 'vendor' && (
                      <div>
                        <h3 className="text-sm font-medium text-black">Vendor Information</h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-black">
                            <span className="font-medium">Business Name:</span> {selectedUser.business_name || 'Not provided'}
                          </p>
                          <p className="text-black">
                            <span className="font-medium">Approval Status:</span>{' '}
                            {selectedUser.is_approved ? (
                              <span className="text-green-700 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" /> Approved
                              </span>
                            ) : (
                              <span className="text-yellow-700 flex items-center">
                                <XCircle className="h-4 w-4 mr-1" /> Pending
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <DialogFooter className="mt-6">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      className="border-gray-300 text-black hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveUser} 
                      disabled={isSubmitting}
                      className="bg-gray-800 hover:bg-black text-white"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleEditUser}
                    className="bg-gray-800 hover:bg-black text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}