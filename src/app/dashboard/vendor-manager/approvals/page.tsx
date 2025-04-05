// 'use client';

// import { useEffect, useState } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/lib/supabase';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
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
// import { Badge } from '@/components/ui/badge';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { formatDate } from '@/lib/utils';
// import { Eye, CheckCircle, XCircle, Search } from 'lucide-react';

// interface VendorApplication {
//   id: string;
//   business_name: string;
//   business_type: string;
//   contact_name: string;
//   contact_email: string;
//   contact_phone: string;
//   description: string;
//   status: 'pending' | 'approved' | 'rejected';
//   submitted_at: string;
//   reviewed_at?: string;
//   reviewed_by?: string;
//   rejection_reason?: string;
//   documents?: string[];
// }

// export default function VendorApprovalsPage() {
//   const { profile, isLoading } = useAuth();
//   const [applications, setApplications] = useState<VendorApplication[]>([]);
//   const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
//   const [viewDialogOpen, setViewDialogOpen] = useState(false);
//   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
//   const [rejectionReason, setRejectionReason] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('all');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   // Mock data
//   useEffect(() => {
//     if (!profile || (profile.role !== 'vendor_manager' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
//       setError('You do not have sufficient permissions to access this page');
//       return;
//     }

//     // Simulate fetching applications
//     const mockApplications: VendorApplication[] = [
//       {
//         id: '1',
//         business_name: 'Campus Bites',
//         business_type: 'Restaurant',
//         contact_name: 'Jane Smith',
//         contact_email: 'jane@campusbites.com',
//         contact_phone: '(555) 123-4567',
//         description: 'Local restaurant specializing in healthy, affordable meals for students. We offer a variety of options including vegetarian and vegan dishes.',
//         status: 'pending',
//         submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//         documents: ['business_license.pdf', 'food_safety_cert.pdf']
//       },
//       {
//         id: '2',
//         business_name: 'Tech Supplies Co.',
//         business_type: 'Retail',
//         contact_name: 'Michael Johnson',
//         contact_email: 'michael@techsupplies.com',
//         contact_phone: '(555) 987-6543',
//         description: 'Campus tech store providing affordable computer accessories, repair services, and electronics for students and faculty.',
//         status: 'approved',
//         submitted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
//         reviewed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
//         reviewed_by: 'Admin',
//         documents: ['business_license.pdf', 'insurance_cert.pdf']
//       },
//       {
//         id: '3',
//         business_name: 'Campus Books & Coffee',
//         business_type: 'Bookstore/Cafe',
//         contact_name: 'Sarah Williams',
//         contact_email: 'sarah@campusbooks.com',
//         contact_phone: '(555) 456-7890',
//         description: 'Combined bookstore and coffee shop offering textbooks, study materials, and a comfortable environment for studying or group meetings.',
//         status: 'pending',
//         submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
//         documents: ['business_license.pdf', 'insurance_cert.pdf']
//       },
//       {
//         id: '4',
//         business_name: 'Quick Snacks Vending',
//         business_type: 'Vending',
//         contact_name: 'Robert Chen',
//         contact_email: 'robert@quicksnacks.com',
//         contact_phone: '(555) 234-5678',
//         description: 'Vending machine service providing snacks, drinks, and quick meal options across campus buildings and residence halls.',
//         status: 'rejected',
//         submitted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
//         reviewed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
//         reviewed_by: 'Admin',
//         rejection_reason: 'Incomplete documentation. Please resubmit with proof of insurance and health department certification.',
//         documents: ['business_license.pdf']
//       },
//       {
//         id: '5',
//         business_name: 'Campus Laundry Services',
//         business_type: 'Service',
//         contact_name: 'Lisa Martinez',
//         contact_email: 'lisa@campuslaundry.com',
//         contact_phone: '(555) 876-5432',
//         description: 'Laundry and dry cleaning pickup and delivery service for students and faculty, with eco-friendly cleaning options.',
//         status: 'pending',
//         submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
//         documents: ['business_license.pdf', 'insurance_cert.pdf', 'service_agreement.pdf']
//       }
//     ];

//     setApplications(mockApplications);
//   }, [profile]);

//   const handleViewApplication = (application: VendorApplication) => {
//     setSelectedApplication(application);
//     setViewDialogOpen(true);
//   };

//   const handleApproveApplication = async (applicationId: string) => {
//     setIsSubmitting(true);
//     setError(null);
//     setSuccess(null);
    
//     try {
//       // In a real application, you would call the API to approve the vendor
//       // await supabase
//       //   .from('vendor_applications')
//       //   .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: profile?.id })
//       //   .eq('id', applicationId);
      
//       // Update local state for demo
//       setTimeout(() => {
//         const now = new Date().toISOString();
//         const updatedApplications = applications.map(app => 
//           app.id === applicationId 
//             ? { 
//                 ...app, 
//                 status: 'approved', 
//                 reviewed_at: now, 
//                 reviewed_by: profile?.first_name || 'Admin' 
//               } 
//             : app
//         );
        
//         setApplications(updatedApplications);
        
//         if (selectedApplication?.id === applicationId) {
//           setSelectedApplication({
//             ...selectedApplication,
//             status: 'approved',
//             reviewed_at: now,
//             reviewed_by: profile?.first_name || 'Admin'
//           });
//         }
        
//         setSuccess('Vendor application approved successfully');
//         setIsSubmitting(false);
//       }, 600);
//     } catch (error) {
//       console.error('Error approving vendor application:', error);
//       setError('Failed to approve vendor application. Please try again.');
//       setIsSubmitting(false);
//     }
//   };

//   const handleOpenRejectDialog = (application: VendorApplication) => {
//     setSelectedApplication(application);
//     setRejectionReason('');
//     setRejectDialogOpen(true);
//   };

//   const handleRejectApplication = async () => {
//     if (!selectedApplication) return;
//     if (!rejectionReason.trim()) {
//       setError('Please provide a reason for rejection');
//       return;
//     }
    
//     setIsSubmitting(true);
//     setError(null);
//     setSuccess(null);
    
//     try {
//       // In a real application, you would call the API to reject the vendor
//       // await supabase
//       //   .from('vendor_applications')
//       //   .update({ 
//       //     status: 'rejected', 
//       //     reviewed_at: new Date().toISOString(), 
//       //     reviewed_by: profile?.id,
//       //     rejection_reason: rejectionReason 
//       //   })
//       //   .eq('id', selectedApplication.id);
      
//       // Update local state for demo
//       setTimeout(() => {
//         const now = new Date().toISOString();
//         const updatedApplications = applications.map(app => 
//           app.id === selectedApplication.id 
//             ? { 
//                 ...app, 
//                 status: 'rejected', 
//                 reviewed_at: now, 
//                 reviewed_by: profile?.first_name || 'Admin',
//                 rejection_reason: rejectionReason
//               } 
//             : app
//         );
        
//         setApplications(updatedApplications);
//         setRejectDialogOpen(false);
//         setSuccess('Vendor application rejected successfully');
//         setIsSubmitting(false);
//       }, 600);
//     } catch (error) {
//       console.error('Error rejecting vendor application:', error);
//       setError('Failed to reject vendor application. Please try again.');
//       setIsSubmitting(false);
//     }
//   };

//   // Filter applications based on search query and status
//   const filteredApplications = applications.filter(application => {
//     const searchMatches = 
//       application.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       application.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       application.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       application.business_type.toLowerCase().includes(searchQuery.toLowerCase());

//     const statusMatches = statusFilter === 'all' || application.status === statusFilter;
    
//     return searchMatches && statusMatches;
//   });

//   // Helper for status badge styling
//   const getStatusBadgeStyles = (status: VendorApplication['status']): string => {
//     switch (status) {
//       case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
//       case 'approved': return 'bg-green-50 text-green-700 border-green-300 border';
//       case 'rejected': return 'bg-red-50 text-red-700 border-red-300 border';
//       default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
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

//   // Application stats
//   const applicationStats = {
//     pending: applications.filter(a => a.status === 'pending').length,
//     approved: applications.filter(a => a.status === 'approved').length,
//     rejected: applications.filter(a => a.status === 'rejected').length,
//     total: applications.length
//   };

//   return (
//     <div className="space-y-6 px-2 sm:px-4 pb-6">
//       <div>
//         <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Vendor Approvals</h1>
//         <p className="text-black text-sm sm:text-base">
//           Review and manage vendor applications for the marketplace
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
//             <CardTitle className="text-sm font-medium text-black">Pending</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-yellow-600">{applicationStats.pending}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Approved</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-green-600">{applicationStats.approved}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Rejected</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-red-600">{applicationStats.rejected}</div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-gray-300">
//           <CardHeader className="pb-2 pt-4 px-3">
//             <CardTitle className="text-sm font-medium text-black">Total</CardTitle>
//           </CardHeader>
//           <CardContent className="pt-0 pb-3 px-3">
//             <div className="text-xl font-bold text-black">{applicationStats.total}</div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div>
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
//           >
//             <option value="all">All Applications</option>
//             <option value="pending">Pending Review</option>
//             <option value="approved">Approved</option>
//             <option value="rejected">Rejected</option>
//           </select>
//         </div>
        
//         <div className="relative w-full sm:w-auto">
//           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
//           <Input
//             placeholder="Search vendors..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-8 bg-white text-black border-gray-300 h-9 w-full sm:w-64"
//           />
//         </div>
//       </div>

//       {/* Applications Table */}
//       <Card className="border-gray-300">
//         <CardContent className="p-0">
//           <Table>
//             <TableHeader className="bg-gray-50">
//               <TableRow>
//                 <TableHead className="text-black">Business Name</TableHead>
//                 <TableHead className="text-black">Contact</TableHead>
//                 <TableHead className="text-black">Type</TableHead>
//                 <TableHead className="text-black">Status</TableHead>
//                 <TableHead className="text-black">Submitted</TableHead>
//                 <TableHead className="text-right text-black">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {filteredApplications.length === 0 ? (
//                 <TableRow>
//                   <TableCell colSpan={6} className="text-center py-8 text-black">
//                     No applications found
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 filteredApplications.map((application) => (
//                   <TableRow key={application.id} className="border-gray-200">
//                     <TableCell className="font-medium text-black">
//                       {application.business_name}
//                       <p className="text-gray-500 text-xs truncate max-w-xs">{application.description.substring(0, 60)}...</p>
//                     </TableCell>
//                     <TableCell className="text-black">
//                       <div>{application.contact_name}</div>
//                       <div className="text-xs text-gray-500">{application.contact_email}</div>
//                     </TableCell>
//                     <TableCell className="text-black">{application.business_type}</TableCell>
//                     <TableCell>
//                       <Badge className={getStatusBadgeStyles(application.status)}>
//                         {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
//                       </Badge>
//                     </TableCell>
//                     <TableCell className="text-black">{formatDate(application.submitted_at)}</TableCell>
//                     <TableCell className="text-right">
//                       <div className="flex justify-end space-x-1">
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => handleViewApplication(application)}
//                           className="text-black hover:bg-gray-100 h-8"
//                         >
//                           <Eye className="h-4 w-4 mr-1" />
//                           View
//                         </Button>
                        
//                         {application.status === 'pending' && (
//                           <>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleApproveApplication(application.id)}
//                               disabled={isSubmitting}
//                               className="text-green-700 hover:bg-green-50 hover:text-green-800 h-8"
//                             >
//                               <CheckCircle className="h-4 w-4 mr-1" />
//                               Approve
//                             </Button>
                            
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleOpenRejectDialog(application)}
//                               disabled={isSubmitting}
//                               className="text-red-700 hover:bg-red-50 hover:text-red-800 h-8"
//                             >
//                               <XCircle className="h-4 w-4 mr-1" />
//                               Reject
//                             </Button>
//                           </>
//                         )}
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       {/* View Application Dialog */}
//       <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
//         <DialogContent className="sm:max-w-2xl max-w-[90%] bg-white text-black border-gray-300">
//           <DialogHeader>
//             <DialogTitle className="text-black">Vendor Application: {selectedApplication?.business_name}</DialogTitle>
//             <DialogDescription className="text-black">
//               Submitted on {selectedApplication?.submitted_at && formatDate(selectedApplication.submitted_at)}
//             </DialogDescription>
//           </DialogHeader>

//           {selectedApplication && (
//             <div className="space-y-4">
//               <div className="flex flex-wrap gap-2 items-center justify-between">
//                 <Badge className={getStatusBadgeStyles(selectedApplication.status)}>
//                   {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
//                 </Badge>
                
//                 {selectedApplication.reviewed_at && (
//                   <div className="text-sm text-gray-500">
//                     Reviewed by {selectedApplication.reviewed_by} on {formatDate(selectedApplication.reviewed_at)}
//                   </div>
//                 )}
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <h3 className="text-sm font-medium text-black">Business Information</h3>
//                   <div className="text-sm space-y-1 text-black">
//                     <p><span className="font-medium">Business Name:</span> {selectedApplication.business_name}</p>
//                     <p><span className="font-medium">Business Type:</span> {selectedApplication.business_type}</p>
//                   </div>
//                 </div>
                
//                 <div className="space-y-2">
//                   <h3 className="text-sm font-medium text-black">Contact Information</h3>
//                   <div className="text-sm space-y-1 text-black">
//                     <p><span className="font-medium">Contact Name:</span> {selectedApplication.contact_name}</p>
//                     <p><span className="font-medium">Email:</span> {selectedApplication.contact_email}</p>
//                     <p><span className="font-medium">Phone:</span> {selectedApplication.contact_phone}</p>
//                   </div>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <h3 className="text-sm font-medium text-black">Business Description</h3>
//                 <div className="text-sm p-3 border rounded-md bg-gray-50 text-black">
//                   {selectedApplication.description}
//                 </div>
//               </div>

//               {selectedApplication.documents && selectedApplication.documents.length > 0 && (
//                 <div className="space-y-2">
//                   <h3 className="text-sm font-medium text-black">Submitted Documents</h3>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     {selectedApplication.documents.map((doc, index) => (
//                       <Button 
//                         key={index} 
//                         variant="outline" 
//                         className="justify-start text-blue-600 hover:text-blue-800 border-gray-300"
//                       >
//                         <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                         </svg>
//                         {doc}
//                       </Button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {selectedApplication.rejection_reason && (
//                 <div className="space-y-2">
//                   <h3 className="text-sm font-medium text-red-700">Rejection Reason</h3>
//                   <div className="text-sm p-3 border border-red-300 rounded-md bg-red-50 text-red-800">
//                     {selectedApplication.rejection_reason}
//                   </div>
//                 </div>
//               )}

//               {/* Action buttons - only show for pending applications */}
//               <div className="flex justify-between items-center pt-4 border-t">
//                 {selectedApplication.status === 'pending' ? (
//                   <div className="flex space-x-2">
//                     <Button
//                       onClick={() => handleApproveApplication(selectedApplication.id)}
//                       disabled={isSubmitting}
//                       className="bg-green-600 hover:bg-green-700 text-white"
//                     >
//                       <CheckCircle className="h-4 w-4 mr-1" />
//                       Approve Application
//                     </Button>
                    
//                     <Button
//                       onClick={() => {
//                         setViewDialogOpen(false);
//                         handleOpenRejectDialog(selectedApplication);
//                       }}
//                       disabled={isSubmitting}
//                       variant="outline"
//                       className="border-red-300 text-red-700 hover:bg-red-50"
//                     >
//                       <XCircle className="h-4 w-4 mr-1" />
//                       Reject
//                     </Button>
//                   </div>
//                 ) : (
//                   <div></div> // Empty div to maintain flex justify-between
//                 )}
                
//                 <Button
//                   onClick={() => setViewDialogOpen(false)}
//                   className="bg-black hover:bg-gray-800 text-white"
//                 >
//                   Close
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Reject Application Dialog */}
//       <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
//         <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
//           <DialogHeader>
//             <DialogTitle className="text-black">Reject Vendor Application</DialogTitle>
//             <DialogDescription className="text-gray-500">
//               Please provide a reason for rejecting this application from {selectedApplication?.business_name}.
//               This will be shared with the applicant.
//             </DialogDescription>
//           </DialogHeader>
          
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-black">Rejection Reason</label>
//               <Textarea
//                 value={rejectionReason}
//                 onChange={(e) => setRejectionReason(e.target.value)}
//                 placeholder="Please explain why this application is being rejected..."
//                 className="bg-white text-black border-gray-300 resize-none h-32"
//               />
//             </div>
//           </div>
          
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setRejectDialogOpen(false)}
//               disabled={isSubmitting}
//               className="border-gray-300 text-black hover:bg-gray-100"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleRejectApplication}
//               disabled={isSubmitting || !rejectionReason.trim()}
//               className="bg-red-600 hover:bg-red-700 text-white"
//             >
//               Reject Application
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// } 