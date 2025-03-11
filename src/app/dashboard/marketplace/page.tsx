// app/dashboard/marketplace/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, MarketplaceItem, MarketplaceTransaction } from '@/lib/supabase';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatPrice } from '@/lib/utils';
import { Eye, CheckCircle, XCircle, ShoppingBag, DollarSign, BarChart4 } from 'lucide-react';

interface ItemWithDetails extends MarketplaceItem {
  seller?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  category?: {
    name: string;
  };
  college?: {
    name: string;
  };
  image?: {
    image_url: string;
    is_primary: boolean;
  }[];
}

interface TransactionWithDetails extends MarketplaceTransaction {
  item?: {
    title: string;
    price: number;
  };
  buyer?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  seller?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export default function MarketplacePage() {
  const { profile, isLoading } = useAuth();
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewItemOpen, setViewItemOpen] = useState(false);
  const [viewTransactionOpen, setViewTransactionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== 'admin') {
        setError('Only administrators can access this page');
        return;
      }

      try {
        // Fetch marketplace items with relations
        const { data: itemsData, error: itemsError } = await supabase
          .from('marketplace_items')
          .select(`
            *,
            seller:seller_id (email, first_name, last_name),
            category:category_id (name),
            college:college_id (name)
          `)
          .order('created_at', { ascending: false });
        
        if (itemsError) throw itemsError;
        
        // Fetch images for each item
        const itemsWithImages = await Promise.all(itemsData.map(async (item) => {
          const { data: imageData } = await supabase
            .from('item_images')
            .select('image_url, is_primary')
            .eq('item_id', item.id);
          
          return {
            ...item,
            image: imageData
          };
        }));
        
        setItems(itemsWithImages);
        
        // Fetch transactions with relations
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('marketplace_transactions')
          .select(`
            *,
            item:item_id (title, price),
            buyer:buyer_id (email, first_name, last_name),
            seller:seller_id (email, first_name, last_name)
          `)
          .order('created_at', { ascending: false });
        
        if (transactionsError) throw transactionsError;
        
        setTransactions(transactionsData);
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('item_categories')
          .select('id, name')
          .order('name');
        
        if (categoriesError) throw categoriesError;
        
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.message || 'Error fetching marketplace data');
        console.error(err);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the marketplace?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('marketplace_items')
        .update({ status: 'deleted' })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      setSuccess('Item removed successfully');
      
      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status: 'deleted' } : item
      ));
    } catch (err: any) {
      setError(err.message || 'Error removing item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewItem = (item: ItemWithDetails) => {
    setSelectedItem(item);
    setViewItemOpen(true);
  };

  const handleViewTransaction = (transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction);
    setViewTransactionOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-green-500', label: 'Active' },
      'sold': { color: 'bg-blue-500', label: 'Sold' },
      'reserved': { color: 'bg-yellow-500', label: 'Reserved' },
      'deleted': { color: 'bg-red-500', label: 'Deleted' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', label: status };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTransactionStatusBadge = (status: string) => {
    const statusConfig = {
      'requested': { color: 'bg-yellow-500', label: 'Requested' },
      'accepted': { color: 'bg-blue-500', label: 'Accepted' },
      'completed': { color: 'bg-green-500', label: 'Completed' },
      'cancelled': { color: 'bg-red-500', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', label: status };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPrimaryImage = (item: ItemWithDetails) => {
    if (!item.image || item.image.length === 0) return null;
    
    const primaryImage = item.image.find(img => img.is_primary);
    return primaryImage ? primaryImage.image_url : item.image[0].image_url;
  };

  const filteredItems = items.filter(item => {
    const searchMatches = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.seller?.email && item.seller.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const statusMatches = statusFilter === 'all' || item.status === statusFilter;
    const categoryMatches = categoryFilter === 'all' || item.category_id === categoryFilter;
    
    return searchMatches && statusMatches && categoryMatches;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const searchMatches = 
      (transaction.item?.title && transaction.item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.buyer?.email && transaction.buyer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.seller?.email && transaction.seller.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const statusMatches = statusFilter === 'all' || transaction.status === statusFilter;
    
    return searchMatches && statusMatches;
  });

  // Stats
  const itemStats = {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    sold: items.filter(i => i.status === 'sold').length,
    reserved: items.filter(i => i.status === 'reserved').length,
    deleted: items.filter(i => i.status === 'deleted').length
  };

  const transactionStats = {
    total: transactions.length,
    requested: transactions.filter(t => t.status === 'requested').length,
    accepted: transactions.filter(t => t.status === 'accepted').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    cancelled: transactions.filter(t => t.status === 'cancelled').length,
    totalValue: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Marketplace Management</h1>
        <p className="text-black">
          Manage listings and transactions in the student marketplace
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
            <CardTitle className="text-sm font-medium text-black">Total Listings</CardTitle>
            <ShoppingBag className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{itemStats.total}</div>
            <p className="text-xs text-black">
              {itemStats.active} active, {itemStats.sold} sold
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Transactions</CardTitle>
            <BarChart4 className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{transactionStats.total}</div>
            <p className="text-xs text-black">
              {transactionStats.completed} completed
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Transaction Value</CardTitle>
            <DollarSign className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{formatPrice(transactionStats.totalValue)}</div>
            <p className="text-xs text-black">
              From completed transactions
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Categories</CardTitle>
            <BarChart4 className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{categories.length}</div>
            <p className="text-xs text-black">
              Available for listings
            </p>
          </CardContent>
        </Card>
      </div>


      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items" className="text-black">Marketplace Items</TabsTrigger>
          <TabsTrigger value="transactions" className="text-black">Transactions</TabsTrigger>
        </TabsList>
        
        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-1/3"
            />
          </div>

          <Card className="border-0 shadow-md">
          <CardContent className="p-0">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-0">
                    <TableHead className="border-b">Item</TableHead>
                    <TableHead className="border-b">Buyer</TableHead>
                    <TableHead className="border-b">Seller</TableHead>
                    <TableHead className="border-b">Amount</TableHead>
                    <TableHead className="border-b">Date</TableHead>
                    <TableHead className="border-b">Status</TableHead>
                    <TableHead className="border-b text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPrimaryImage(item) && (
                              <img 
                                src={getPrimaryImage(item)!} 
                                alt={item.title} 
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">{item.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.seller ? (
                            <div>
                              <p>
                                {item.seller.first_name} {item.seller.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.seller.email}
                              </p>
                            </div>
                          ) : (
                            'Unknown Seller'
                          )}
                        </TableCell>
                        <TableCell>{formatPrice(item.price)}</TableCell>
                        <TableCell>{item.category?.name || 'Uncategorized'}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isSubmitting}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
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
        
        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-1/3"
            />
          </div>


          <Card className="border-0 shadow-md">
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.item?.title || 'Unknown Item'}
                        </TableCell>
                        <TableCell>
                          {transaction.buyer ? (
                            <div>
                              <p>{transaction.buyer.first_name} {transaction.buyer.last_name}</p>
                              <p className="text-xs text-gray-500">{transaction.buyer.email}</p>
                            </div>
                          ) : (
                            'Unknown Buyer'
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.seller ? (
                            <div>
                              <p>{transaction.seller.first_name} {transaction.seller.last_name}</p>
                              <p className="text-xs text-gray-500">{transaction.seller.email}</p>
                            </div>
                          ) : (
                            'Unknown Seller'
                          )}
                        </TableCell>
                        <TableCell>{formatPrice(transaction.amount)}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTransaction(transaction)}
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
        </TabsContent>
      </Tabs>

      {/* Item Details Dialog */}
      <Dialog open={viewItemOpen} onOpenChange={setViewItemOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Item Details</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex space-x-4">
                {getPrimaryImage(selectedItem) && (
                  <img 
                    src={getPrimaryImage(selectedItem)!} 
                    alt={selectedItem.title} 
                    className="h-32 w-32 rounded-md object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                  <p className="text-sm text-gray-500">{selectedItem.category?.name || 'Uncategorized'}</p>
                  <p className="text-lg font-bold mt-2">{formatPrice(selectedItem.price)}</p>
                  <div className="mt-2">
                    {getStatusBadge(selectedItem.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-gray-700">{selectedItem.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Condition</h4>
                  <p className="capitalize">{selectedItem.condition.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Location</h4>
                  <p>{selectedItem.college?.name || 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Seller</h4>
                {selectedItem.seller ? (
                  <div>
                    <p>{selectedItem.seller.first_name} {selectedItem.seller.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedItem.seller.email}</p>
                  </div>
                ) : (
                  <p>Unknown Seller</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Listed On</h4>
                  <p>{formatDate(selectedItem.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Last Updated</h4>
                  <p>{formatDate(selectedItem.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItemOpen(false)}>
              Close
            </Button>
            {selectedItem && selectedItem.status === 'active' && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleRemoveItem(selectedItem.id);
                  setViewItemOpen(false);
                }}
                disabled={isSubmitting}
              >
                Remove Listing
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={viewTransactionOpen} onOpenChange={setViewTransactionOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedTransaction.item?.title || 'Unknown Item'}
                </h3>
                <div className="mt-2">
                  {getTransactionStatusBadge(selectedTransaction.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Transaction ID</h4>
                  <p className="text-sm font-mono">{selectedTransaction.id}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Amount</h4>
                  <p className="text-lg font-bold">{formatPrice(selectedTransaction.amount)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Buyer</h4>
                {selectedTransaction.buyer ? (
                  <div>
                    <p>{selectedTransaction.buyer.first_name} {selectedTransaction.buyer.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedTransaction.buyer.email}</p>
                  </div>
                ) : (
                  <p>Unknown Buyer</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Seller</h4>
                {selectedTransaction.seller ? (
                  <div>
                    <p>{selectedTransaction.seller.first_name} {selectedTransaction.seller.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedTransaction.seller.email}</p>
                  </div>
                ) : (
                  <p>Unknown Seller</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Created On</h4>
                  <p>{formatDate(selectedTransaction.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Last Updated</h4>
                  <p>{formatDate(selectedTransaction.updated_at)}</p>
                </div>
              </div>
              
              {selectedTransaction.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-gray-700">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTransactionOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}