// 'use client';

// import { useEffect, useState } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Textarea } from '@/components/ui/textarea';
// import { Badge } from '@/components/ui/badge';
// import { formatDate } from '@/lib/utils';
// import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';

// interface Policy {
//   id: string;
//   title: string;
//   content: string;
//   category: 'general' | 'fees' | 'conduct' | 'quality' | 'compliance';
//   status: 'active' | 'inactive' | 'draft';
//   created_at: string;
//   updated_at: string;
//   applies_to: 'all_vendors' | 'food_vendors' | 'retail_vendors' | 'service_vendors';
//   created_by: string;
// }

// export default function VendorPoliciesPage() {
//   const { profile, isLoading } = useAuth();
//   const [policies, setPolicies] = useState<Policy[]>([]);
//   const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
//   const [editDialogOpen, setEditDialogOpen] = useState(false);
//   const [viewDialogOpen, setViewDialogOpen] = useState(false);
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [categoryFilter, setCategoryFilter] = useState('all');
//   const [newPolicy, setNewPolicy] = useState({
//     title: '',
//     content: '',
//     category: 'general',
//     status: 'draft',
//     applies_to: 'all_vendors'
//   });
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   // Mock data
//   useEffect(() => {
//     if (!profile || (profile.role !== 'vendor_manager' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
//       setError('You do not have sufficient permissions to access this page');
//       return;
//     }

//     // Simulate fetching policies
//     const mockPolicies: Policy[] = [
//       {
//         id: '1',
//         title: 'Quality Standards for Food Vendors',
//         content: 'All food vendors must maintain a minimum health inspection score of 90 or above. Regular inspections will be conducted without prior notice. Vendors must display current health certificates and follow all food safety regulations.',
//         category: 'quality',
//         status: 'active',
//         created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
//         updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
//         applies_to: 'food_vendors',
//         created_by: 'Admin'
//       },
//       {
//         id: '2',
//         title: 'Commission Fee Structure',
//         content: 'Marketplace commission fees are set at 12% of the total transaction amount for all vendors. Food vendors are eligible for a reduced rate of 10% if monthly sales exceed $5,000. Commission fees are calculated automatically and deducted from payouts.',
//         category: 'fees',
//         status: 'active',
//         created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
//         updated_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
//         applies_to: 'all_vendors',
//         created_by: 'Admin'
//       },
//       {
//         id: '3',
//         title: 'Vendor Conduct Guidelines',
//         content: 'All vendors must maintain professional conduct when interacting with customers and marketplace staff. Vendors must respond to customer inquiries within 24 hours and resolve disputes according to the marketplace resolution process. Failure to adhere to these guidelines may result in temporary or permanent removal from the platform.',
//         category: 'conduct',
//         status: 'active',
//         created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
//         updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
//         applies_to: 'all_vendors',
//         created_by: 'Admin'
//       },
//       {
//         id: '4',
//         title: 'Service Level Agreements',
//         content: 'Service vendors must maintain a minimum 4-star rating to remain active on the platform. Services must be delivered within the timeframe specified at the time of purchase. Cancellation policies must be clearly stated in the service description.',
//         category: 'compliance',
//         status: 'draft',
//         created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
//         updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
//         applies_to: 'service_vendors',
//         created_by: 'Admin'
//       },
//       {
//         id: '5',
//         title: 'Operating Hours Policy',
//         content: 'All vendors must maintain their published operating hours. Any temporary changes to operating hours must be updated in the system at least 24 hours in advance. Repeated violations of published operating hours may result in penalties.',
//         category: 'general',
//         status: 'inactive',
//         created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
//         updated_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
//         applies_to: 'all_vendors',
//         created_by: 'Admin'
//       }
//     ];

//     setPolicies(mockPolicies);
//   }, [profile]);

//   const handleViewPolicy = (policy: Policy) => {
//     setSelectedPolicy(policy);
//     setViewDialogOpen(true);
//   };

//   const handleEditPolicy = (policy: Policy) => {
//     setSelectedPolicy(policy);
//     setNewPolicy({
//       title: policy.title,
//       content: policy.content,
//       category: policy.category,
//       status: policy.status,
//       applies_to: policy.applies_to
//     });
//     setEditDialogOpen(true);
//   };

//   const handleDeletePolicy = (policy: Policy) => {
//     setSelectedPolicy(policy);
//     setDeleteDialogOpen(true);
//   };

//   const handleCreatePolicy = () => {
//     setSelectedPolicy(null);
//     setNewPolicy({
//       title: '',
//       content: '',
//       category: 'general',
//       status: 'draft',
//       applies_to: 'all_vendors'
//     });
//     setEditDialogOpen(true);
//   };

//   const handleSavePolicy = () => {
//     if (!newPolicy.title || !newPolicy.content) {
//       setError('Please fill in all required fields');
//       return;
//     }

//     setError(null);
//     setSuccess(null);

//     // Add or update policy
//     if (selectedPolicy) {
//       // Update existing policy
//       const updatedPolicies = policies.map(p => 
//         p.id === selectedPolicy.id ? {
//           ...p, 
//           title: newPolicy.title,
//           content: newPolicy.content,
//           category: newPolicy.category as Policy['category'],
//           status: newPolicy.status as Policy['status'],
//           applies_to: newPolicy.applies_to as Policy['applies_to'],
//           updated_at: new Date().toISOString()
//         } : p
//       );
//       setPolicies(updatedPolicies);
//       setSuccess('Policy updated successfully');
//     } else {
//       // Create new policy
//       const newId = (policies.length + 1).toString();
//       const now = new Date().toISOString();
//       const newPolicyObj: Policy = {
//         id: newId,
//         title: newPolicy.title,
//         content: newPolicy.content,
//         category: newPolicy.category as Policy['category'],
//         status: newPolicy.status as Policy['status'],
//         applies_to: newPolicy.applies_to as Policy['applies_to'],
//         created_at: now,
//         updated_at: now,
//         created_by: profile?.first_name || 'Admin'
//       };
      
//       setPolicies([newPolicyObj, ...policies]);
//       setSuccess('Policy created successfully');
//     }
    
//     setEditDialogOpen(false);
//   };

//   const handleConfirmDelete = () => {
//     if (!selectedPolicy) return;
    
//     // Remove policy
//     setPolicies(policies.filter(p => p.id !== selectedPolicy.id));
//     setDeleteDialogOpen(false);
//     setSuccess('Policy deleted successfully');
//   };

//   const handleActivatePolicy = (policyId: string) => {
//     const updatedPolicies = policies.map(p => 
//       p.id === policyId ? {
//         ...p, 
//         status: 'active',
//         updated_at: new Date().toISOString()
//       } : p
//     );
//     setPolicies(updatedPolicies);
//     setSuccess('Policy activated successfully');
//   };

//   const handleDeactivatePolicy = (policyId: string) => {
//     const updatedPolicies = policies.map(p => 
//       p.id === policyId ? {
//         ...p, 
//         status: 'inactive',
//         updated_at: new Date().toISOString()
//       } : p
//     );
//     setPolicies(updatedPolicies);
//     setSuccess('Policy deactivated successfully');
//   };

//   // Filter policies based on search query and category
//   const filteredPolicies = policies.filter(policy => {
//     const searchMatches = 
//       policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       policy.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       policy.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       policy.applies_to.toLowerCase().includes(searchQuery.toLowerCase());

//     const categoryMatches = categoryFilter === 'all' || policy.category === categoryFilter;
    
//     return searchMatches && categoryMatches;
//   });

//   // Helper for status badge styling
//   const getStatusBadgeStyles = (status: Policy['status']): string => {
//     switch (status) {
//       case 'active': return 'bg-green-50 text-green-700 border-green-300 border';
//       case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-300 border';
//       case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
//       default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
//     }
//   };

//   // Helper for category badge styling
//   const getCategoryBadgeStyles = (category: Policy['category']): string => {
//     switch (category) {
//       case 'general': return 'bg-blue-50 text-blue-700 border-blue-300 border';
//       case 'fees': return 'bg-purple-50 text-purple-700 border-purple-300 border';
//       case 'conduct': return 'bg-indigo-50 text-indigo-700 border-indigo-300 border';
//       case 'quality': return 'bg-teal-50 text-teal-700 border-teal-300 border';
//       case 'compliance': return 'bg-orange-50 text-orange-700 border-orange-300 border';
//       default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
//     }
//   };

//   // Helper for applies_to text format
//   const formatAppliesTo = (appliesTo: Policy['applies_to']): string => {
//     switch (appliesTo) {
//       case 'all_vendors': return 'All Vendors';
//       case 'food_vendors': return 'Food Vendors';
//       case 'retail_vendors': return 'Retail Vendors';
//       case 'service_vendors': return 'Service Vendors';
//       default: return appliesTo;
//     }
//   };

//   if (isLoading) {
//     return <div className="text-black p-4">Loading...</div>;
//   }

//   // Check if user has appropriate permissions to access this page
//   const canAccessVendorManager = profile && (
//     profile.role === 'vendor_manager' || 
//     profile.role === 'admin' || 
//     profile.role === 'super_admin'
//   );

//   if (!canAccessVendorManager) {
//     return (
//       <div className="p-4">
//         <h1 className="text-xl font-bold text-black">Access Denied</h1>
//         <p className="text-black">You do not have permission to access this page.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6 px-2 sm:px-4 pb-6">
//       <div>
//         <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Vendor Policies</h1>
//         <p className="text-black text-sm sm:text-base">
//           Create and manage policies for marketplace vendors
//         </p>
//       </div>

//       {error && (
//         <div className="bg-red-50 p-3 rounded-md border border-red-300">
//           <p className="text-red-800 font-medium text-sm">{error}</p>
//         </div>
//       )}

//       {success && (
//         <div className="bg-green-50 p-3 rounded-md border border-green-300">
//           <p className="text-green-800 font-medium text-sm">{success}</p>
//         </div>
//       )}

//       {/* Stats Cards */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Total Policies</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-black">{policies.length}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Active</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-green-600">{policies.filter(p => p.status === 'active').length}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Drafts</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-yellow-600">{policies.filter(p => p.status === 'draft').length}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Inactive</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-gray-600">{policies.filter(p => p.status === 'inactive').length}</div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Controls */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div className="flex items-center space-x-2">
//           <select
//             value={categoryFilter}
//             onChange={(e) => setCategoryFilter(e.target.value)}
//             className="h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
//           >
//             <option value="all">All Categories</option>
//             <option value="general">General</option>
//             <option value="fees">Fees</option>
//             <option value="conduct">Conduct</option>
//             <option value="quality">Quality</option>
//             <option value="compliance">Compliance</option>
//           </select>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           <Input
//             placeholder="Search policies..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="bg-white text-black border-gray-300 h-9 max-w-sm"
//           />
          
//           <Button 
//             onClick={handleCreatePolicy}
//             className="bg-black hover:bg-gray-800 text-white"
//           >
//             <Plus className="h-4 w-4 mr-1" />
//             New Policy
//           </Button>
//         </div>
//       </div>

//       {/* Policies Table */}
//       <Card className="border-gray-300">
//         <CardContent className="p-0">
//           <Table>
//             <TableHeader className="bg-gray-50">
//               <TableRow>
//                 <TableHead className="text-black">Title</TableHead>
//                 <TableHead className="text-black">Category</TableHead>
//                 <TableHead className="text-black">Applies To</TableHead>
//                 <TableHead className="text-black">Status</TableHead>
//                 <TableHead className="text-black">Last Updated</TableHead>
//                 <TableHead className="text-right text-black">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {filteredPolicies.length === 0 ? (
//                 <TableRow>
//                   <TableCell colSpan={6} className="text-center py-8 text-black">
//                     No policies found
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 filteredPolicies.map((policy) => (
//                   <TableRow key={policy.id} className="border-gray-200">
//                     <TableCell className="font-medium text-black">
//                       {policy.title}
//                       <p className="text-gray-500 text-xs truncate max-w-xs">{policy.content.substring(0, 100)}...</p>
//                     </TableCell>
//                     <TableCell>
//                       <Badge className={getCategoryBadgeStyles(policy.category)}>
//                         {policy.category.charAt(0).toUpperCase() + policy.category.slice(1)}
//                       </Badge>
//                     </TableCell>
//                     <TableCell className="text-black">{formatAppliesTo(policy.applies_to)}</TableCell>
//                     <TableCell>
//                       <Badge className={getStatusBadgeStyles(policy.status)}>
//                         {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
//                       </Badge>
//                     </TableCell>
//                     <TableCell className="text-black">{formatDate(policy.updated_at)}</TableCell>
//                     <TableCell className="text-right">
//                       <div className="flex justify-end items-center space-x-1">
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => handleViewPolicy(policy)}
//                           className="text-black hover:bg-gray-100 h-8 w-8"
//                         >
//                           <Eye className="h-4 w-4" />
//                         </Button>
                        
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => handleEditPolicy(policy)}
//                           className="text-black hover:bg-gray-100 h-8 w-8"
//                         >
//                           <Pencil className="h-4 w-4" />
//                         </Button>
                        
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => handleDeletePolicy(policy)}
//                           className="text-red-600 hover:bg-red-50 h-8 w-8"
//                         >
//                           <Trash2 className="h-4 w-4" />
//                         </Button>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       {/* View Policy Dialog */}
//       <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
//         <DialogContent className="sm:max-w-lg max-w-[90%] bg-white text-black border-gray-300">
//           <DialogHeader>
//             <DialogTitle className="text-black">{selectedPolicy?.title}</DialogTitle>
//             <DialogDescription className="text-gray-500">
//               Created by {selectedPolicy?.created_by} on {selectedPolicy?.created_at && formatDate(selectedPolicy.created_at)}
//             </DialogDescription>
//           </DialogHeader>
          
//           <div className="space-y-4">
//             <div className="flex flex-wrap gap-2 justify-between items-center">
//               <div className="flex flex-wrap gap-2">
//                 <Badge className={getStatusBadgeStyles(selectedPolicy?.status || 'draft')}>
//                   {selectedPolicy?.status.charAt(0).toUpperCase() + selectedPolicy?.status.slice(1)}
//                 </Badge>
                
//                 <Badge className={getCategoryBadgeStyles(selectedPolicy?.category || 'general')}>
//                   {selectedPolicy?.category.charAt(0).toUpperCase() + selectedPolicy?.category.slice(1)}
//                 </Badge>
                
//                 <Badge variant="outline" className="capitalize">
//                   Applies to: {selectedPolicy && formatAppliesTo(selectedPolicy.applies_to)}
//                 </Badge>
//               </div>
              
//               <div className="text-sm text-gray-500">
//                 Last updated: {selectedPolicy?.updated_at && formatDate(selectedPolicy.updated_at)}
//               </div>
//             </div>
            
//             <div className="border rounded-md p-4 bg-gray-50 whitespace-pre-wrap text-black">
//               {selectedPolicy?.content}
//             </div>
            
//             <div className="flex justify-between items-center pt-4 border-t">
//               <div className="space-x-2">
//                 {selectedPolicy?.status === 'draft' && (
//                   <Button
//                     onClick={() => {
//                       handleActivatePolicy(selectedPolicy.id);
//                       setViewDialogOpen(false);
//                     }}
//                     className="bg-green-600 hover:bg-green-700 text-white"
//                   >
//                     Activate Policy
//                   </Button>
//                 )}
                
//                 {selectedPolicy?.status === 'active' && (
//                   <Button
//                     onClick={() => {
//                       handleDeactivatePolicy(selectedPolicy.id);
//                       setViewDialogOpen(false);
//                     }}
//                     className="bg-gray-600 hover:bg-gray-700 text-white"
//                   >
//                     Deactivate
//                   </Button>
//                 )}
                
//                 {selectedPolicy?.status === 'inactive' && (
//                   <Button
//                     onClick={() => {
//                       handleActivatePolicy(selectedPolicy.id);
//                       setViewDialogOpen(false);
//                     }}
//                     className="bg-green-600 hover:bg-green-700 text-white"
//                   >
//                     Reactivate
//                   </Button>
//                 )}
//               </div>
              
//               <Button
//                 onClick={() => setViewDialogOpen(false)}
//                 className="bg-black hover:bg-gray-800 text-white"
//               >
//                 Close
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Policy Dialog */}
//       <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
//         <DialogContent className="sm:max-w-lg max-w-[90%] bg-white text-black border-gray-300">
//           <DialogHeader>
//             <DialogTitle className="text-black">
//               {selectedPolicy ? 'Edit Policy' : 'Create New Policy'}
//             </DialogTitle>
//             <DialogDescription className="text-gray-500">
//               {selectedPolicy 
//                 ? 'Make changes to the policy' 
//                 : 'Create a new policy for marketplace vendors'}
//             </DialogDescription>
//           </DialogHeader>
          
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-black">Policy Title</label>
//               <Input
//                 value={newPolicy.title}
//                 onChange={(e) => setNewPolicy({...newPolicy, title: e.target.value})}
//                 className="bg-white text-black border-gray-300"
//                 placeholder="Enter policy title"
//               />
//             </div>
            
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-black">Policy Content</label>
//               <Textarea
//                 value={newPolicy.content}
//                 onChange={(e) => setNewPolicy({...newPolicy, content: e.target.value})}
//                 className="bg-white text-black border-gray-300 h-40"
//                 placeholder="Enter policy content"
//               />
//             </div>
            
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-black">Category</label>
//                 <select
//                   value={newPolicy.category}
//                   onChange={(e) => setNewPolicy({...newPolicy, category: e.target.value})}
//                   className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
//                 >
//                   <option value="general">General</option>
//                   <option value="fees">Fees</option>
//                   <option value="conduct">Conduct</option>
//                   <option value="quality">Quality</option>
//                   <option value="compliance">Compliance</option>
//                 </select>
//               </div>
              
//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-black">Status</label>
//                 <select
//                   value={newPolicy.status}
//                   onChange={(e) => setNewPolicy({...newPolicy, status: e.target.value})}
//                   className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
//                 >
//                   <option value="draft">Draft</option>
//                   <option value="active">Active</option>
//                   <option value="inactive">Inactive</option>
//                 </select>
//               </div>
//             </div>
            
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-black">Applies To</label>
//               <select
//                 value={newPolicy.applies_to}
//                 onChange={(e) => setNewPolicy({...newPolicy, applies_to: e.target.value})}
//                 className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
//               >
//                 <option value="all_vendors">All Vendors</option>
//                 <option value="food_vendors">Food Vendors</option>
//                 <option value="retail_vendors">Retail Vendors</option>
//                 <option value="service_vendors">Service Vendors</option>
//               </select>
//             </div>
//           </div>
          
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setEditDialogOpen(false)}
//               className="border-gray-300 text-black hover:bg-gray-100"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleSavePolicy}
//               className="bg-black hover:bg-gray-800 text-white"
//             >
//               {selectedPolicy ? 'Save Changes' : 'Create Policy'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
//           <DialogHeader>
//             <DialogTitle className="text-black">Confirm Deletion</DialogTitle>
//             <DialogDescription className="text-gray-500">
//               Are you sure you want to delete this policy? This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
          
//           {selectedPolicy && (
//             <div>
//               <p className="font-medium text-black">{selectedPolicy.title}</p>
//               <p className="text-sm text-gray-500 truncate">{selectedPolicy.content.substring(0, 100)}...</p>
//             </div>
//           )}
          
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setDeleteDialogOpen(false)}
//               className="border-gray-300 text-black hover:bg-gray-100"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleConfirmDelete}
//               className="bg-red-600 hover:bg-red-700 text-white"
//             >
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// } 