// app/dashboard/marketplace/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, MarketplaceItem, MarketplaceTransaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatPrice } from '@/lib/utils';
import { Eye, XCircle, ShoppingBag, DollarSign, BarChart4 } from 'lucide-react';

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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching marketplace data');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error removing item');
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
    return <div className="p-4 text-black">Loading...</div>;
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 pb-6 text-black">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Marketplace Management</h1>
        <p className="text-black text-sm sm:text-base">
          Manage listings and transactions in the student marketplace
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

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Total Listings</CardTitle>
            <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{itemStats.total}</div>
            <p className="text-xs text-black">
              {itemStats.active} active, {itemStats.sold} sold
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Transactions</CardTitle>
            <BarChart4 className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{transactionStats.total}</div>
            <p className="text-xs text-black">
              {transactionStats.completed} completed
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Value</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{formatPrice(transactionStats.totalValue)}</div>
            <p className="text-xs text-black">Completed transactions</p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-4 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-black">Categories</CardTitle>
            <BarChart4 className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="text-lg sm:text-2xl font-bold text-black">{categories.length}</div>
            <p className="text-xs text-black">Available for listings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-3">
          <TabsTrigger value="items" className="text-black flex-1">Marketplace Items</TabsTrigger>
          <TabsTrigger value="transactions" className="text-black flex-1">Transactions</TabsTrigger>
        </TabsList>
        
        {/* Items Tab */}
        <TabsContent value="items" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="text-black">
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
              className="w-full sm:w-1/3 h-9 text-sm"
            />
          </div>

          {/* Mobile Item Cards View */}
          <div className="sm:hidden space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-black">
                No items found
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card key={item.id} className="border-gray-300">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {getPrimaryImage(item) && (
                        <div className="relative h-16 w-16 flex-shrink-0">
                          <Image 
                            src={getPrimaryImage(item)!} 
                            alt={item.title} 
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-black truncate">{item.title}</h3>
                        <p className="text-sm text-black">{formatPrice(item.price)}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div>{getStatusBadge(item.status)}</div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewItem(item)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isSubmitting}
                                className="h-8 w-8"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between text-xs">
                        <span>Seller: {item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : 'Unknown'}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-0">
                        <TableHead className="border-b text-black">Item</TableHead>
                        <TableHead className="border-b text-black">Seller</TableHead>
                        <TableHead className="border-b text-black">Price</TableHead>
                        <TableHead className="border-b text-black">Category</TableHead>
                        <TableHead className="border-b text-black">Date</TableHead>
                        <TableHead className="border-b text-black">Status</TableHead>
                        <TableHead className="border-b text-right text-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-black">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-black">
                              <div className="flex items-center space-x-2">
                                {getPrimaryImage(item) && (
                                  <div className="relative h-10 w-10">
                                    <Image 
                                      src={getPrimaryImage(item)!} 
                                      alt={item.title} 
                                      width={40}
                                      height={40}
                                      className="rounded object-cover"
                                    />
                                  </div>
                                )}
                                <span className="font-medium">{item.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-black">
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
                            <TableCell className="text-black">{formatPrice(item.price)}</TableCell>
                            <TableCell className="text-black">{item.category?.name || 'Uncategorized'}</TableCell>
                            <TableCell className="text-black">{formatDate(item.created_at)}</TableCell>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="text-black">
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
              className="w-full sm:w-1/3 h-9 text-sm"
            />
          </div>

          {/* Mobile Transaction Cards View */}
          <div className="sm:hidden space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-black">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="border-gray-300">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-black">{transaction.item?.title || 'Unknown Item'}</h3>
                        <p className="text-sm font-bold text-black">{formatPrice(transaction.amount)}</p>
                      </div>
                      <div>
                        {getTransactionStatusBadge(transaction.status)}
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Buyer:</span><br />
                        {transaction.buyer ? `${transaction.buyer.first_name} ${transaction.buyer.last_name}` : 'Unknown'}
                      </div>
                      <div>
                        <span className="text-gray-500">Seller:</span><br />
                        {transaction.seller ? `${transaction.seller.first_name} ${transaction.seller.last_name}` : 'Unknown'}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex justify-between items-center border-t border-gray-200 pt-2">
                      <span className="text-xs text-black">{formatDate(transaction.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewTransaction(transaction)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-black">Item</TableHead>
                        <TableHead className="text-black">Buyer</TableHead>
                        <TableHead className="text-black">Seller</TableHead>
                        <TableHead className="text-black">Amount</TableHead>
                        <TableHead className="text-black">Date</TableHead>
                        <TableHead className="text-black">Status</TableHead>
                        <TableHead className="text-right text-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-black">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium text-black">
                              {transaction.item?.title || 'Unknown Item'}
                            </TableCell>
                            <TableCell className="text-black">
                              {transaction.buyer ? (
                                <div>
                                  <p>{transaction.buyer.first_name} {transaction.buyer.last_name}</p>
                                  <p className="text-xs text-gray-500">{transaction.buyer.email}</p>
                                </div>
                              ) : (
                                'Unknown Buyer'
                              )}
                            </TableCell>
                            <TableCell className="text-black">
                              {transaction.seller ? (
                                <div>
                                  <p>{transaction.seller.first_name} {transaction.seller.last_name}</p>
                                  <p className="text-xs text-gray-500">{transaction.seller.email}</p>
                                </div>
                              ) : (
                                'Unknown Seller'
                              )}
                            </TableCell>
                            <TableCell className="text-black">{formatPrice(transaction.amount)}</TableCell>
                            <TableCell className="text-black">{formatDate(transaction.created_at)}</TableCell>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Details Dialog - Fixed with proper DialogTitle */}
      <Dialog open={viewItemOpen} onOpenChange={setViewItemOpen}>
        <DialogContent className="max-w-[95%] sm:max-w-md md:max-w-lg bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Item Details</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
<div className="flex flex-col sm:flex-row sm:space-x-4">
                {getPrimaryImage(selectedItem) && (
                  <div className="relative h-40 w-full sm:h-32 sm:w-32 mb-3 sm:mb-0">
                    <Image 
                      src={getPrimaryImage(selectedItem)!} 
                      alt={selectedItem.title} 
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black">{selectedItem.title}</h3>
                  <p className="text-sm text-gray-500">{selectedItem.category?.name || 'Uncategorized'}</p>
                  <p className="text-lg font-bold mt-2 text-black">{formatPrice(selectedItem.price)}</p>
                  <div className="mt-2">
                    {getStatusBadge(selectedItem.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-black">Description</h4>
                <p className="text-black">{selectedItem.description}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-black">Condition</h4>
                  <p className="capitalize text-black">{selectedItem.condition.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-black">Location</h4>
                  <p className="text-black">{selectedItem.college?.name || 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-black">Seller</h4>
                {selectedItem.seller ? (
                  <div>
                    <p className="text-black">{selectedItem.seller.first_name} {selectedItem.seller.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedItem.seller.email}</p>
                  </div>
                ) : (
                  <p className="text-black">Unknown Seller</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-black">Listed On</h4>
                  <p className="text-black">{formatDate(selectedItem.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-black">Last Updated</h4>
                  <p className="text-black">{formatDate(selectedItem.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setViewItemOpen(false)}
              className="w-full sm:w-auto text-black border-black hover:bg-gray-100"
            >
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
                className="w-full sm:w-auto"
              >
                Remove Listing
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog - Fixed with proper DialogTitle */}
      <Dialog open={viewTransactionOpen} onOpenChange={setViewTransactionOpen}>
        <DialogContent className="max-w-[95%] sm:max-w-md md:max-w-lg bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-black">
                  {selectedTransaction.item?.title || 'Unknown Item'}
                </h3>
                <div className="mt-2">
                  {getTransactionStatusBadge(selectedTransaction.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-black">Transaction ID</h4>
                  <p className="text-sm font-mono text-black break-all">{selectedTransaction.id}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-black">Amount</h4>
                  <p className="text-lg font-bold text-black">{formatPrice(selectedTransaction.amount)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-black">Buyer</h4>
                {selectedTransaction.buyer ? (
                  <div>
                    <p className="text-black">{selectedTransaction.buyer.first_name} {selectedTransaction.buyer.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedTransaction.buyer.email}</p>
                  </div>
                ) : (
                  <p className="text-black">Unknown Buyer</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-black">Seller</h4>
                {selectedTransaction.seller ? (
                  <div>
                    <p className="text-black">{selectedTransaction.seller.first_name} {selectedTransaction.seller.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedTransaction.seller.email}</p>
                  </div>
                ) : (
                  <p className="text-black">Unknown Seller</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-black">Created On</h4>
                  <p className="text-black">{formatDate(selectedTransaction.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-black">Last Updated</h4>
                  <p className="text-black">{formatDate(selectedTransaction.updated_at)}</p>
                </div>
              </div>
              
              {selectedTransaction.notes && (
                <div>
                  <h4 className="font-medium mb-1 text-black">Notes</h4>
                  <p className="text-black">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setViewTransactionOpen(false)}
              className="w-full sm:w-auto text-black border-black hover:bg-gray-100"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}