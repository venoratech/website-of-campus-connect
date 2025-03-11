// app/dashboard/menu/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, FoodVendor, MenuItem } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash, CheckCircle2, XCircle } from 'lucide-react';

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export default function MenuManagementPage() {
  const { profile, isLoading } = useAuth();
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState('items');

  // Category form state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState(0);
  const [categoryIsActive, setCategoryIsActive] = useState(true);

  // Menu item form state
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('');
  const [itemIsVegetarian, setItemIsVegetarian] = useState(false);
  const [itemIsVegan, setItemIsVegan] = useState(false);
  const [itemIsGlutenFree, setItemIsGlutenFree] = useState(false);
  const [itemSpiceLevel, setItemSpiceLevel] = useState<number | null>(0);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  // New state for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== 'vendor') {
        setError('Only vendors can access this page');
        return;
      }

      const { data: vendorData, error: vendorError } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('profile_id', profile.id)
        .single();
      
      if (vendorError) {
        if (vendorError.code === 'PGRST116') {
          setError('Please set up your vendor profile first');
        } else {
          setError('Error fetching vendor profile');
          console.error(vendorError);
        }
        return;
      }

      setVendor(vendorData);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('display_order', { ascending: true });
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('name', { ascending: true });
      
      if (menuItemsError) {
        console.error('Error fetching menu items:', menuItemsError);
      } else {
        setMenuItems(menuItemsData || []);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setCategoryDisplayOrder(categories.length);
    setCategoryIsActive(true);
    setEditingCategoryId(null);
  };

  const resetMenuItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemPrice('');
    setItemCategoryId('');
    setItemImageUrl('');
    setItemPrepTime('');
    setItemIsVegetarian(false);
    setItemIsVegan(false);
    setItemIsGlutenFree(false);
    setItemSpiceLevel(0);
    setItemIsAvailable(true);
    setSelectedFile(null); // Reset file
    setEditingMenuItemId(null);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategoryDisplayOrder(category.display_order);
    setCategoryIsActive(category.is_active);
    setIsAddingCategory(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setItemName(item.name);
    setItemDescription(item.description || '');
    setItemPrice(item.price.toString());
    setItemCategoryId(item.category_id || '');
    setItemImageUrl(item.image_url || '');
    setItemPrepTime(item.preparation_time?.toString() || '');
    setItemIsVegetarian(item.is_vegetarian);
    setItemIsVegan(item.is_vegan);
    setItemIsGlutenFree(item.is_gluten_free);
    setItemSpiceLevel(item.spice_level);
    setItemIsAvailable(item.is_available);
    setSelectedFile(null); // Reset file on edit
    setIsAddingMenuItem(true);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('menu-images') // Create a bucket named 'menu-images' in Supabase Storage
      .upload(`public/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(`public/${fileName}`);

    return urlData.publicUrl;
  };

  const handleSaveCategory = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!categoryName) {
      setError('Please enter a category name');
      setIsSubmitting(false);
      return;
    }

    try {
      const categoryData = {
        vendor_id: vendor!.id,
        name: categoryName,
        description: categoryDescription || null,
        display_order: categoryDisplayOrder,
        is_active: categoryIsActive,
      };

      if (editingCategoryId) {
        const { error: updateError } = await supabase
          .from('menu_categories')
          .update(categoryData)
          .eq('id', editingCategoryId);
        
        if (updateError) throw updateError;
        
        setSuccess('Category updated successfully');
        setCategories(categories.map(cat => 
          cat.id === editingCategoryId ? { ...cat, ...categoryData, id: cat.id } : cat
        ));
      } else {
        const { data, error: insertError } = await supabase
          .from('menu_categories')
          .insert(categoryData)
          .select('*')
          .single();
        
        if (insertError) throw insertError;
        
        setSuccess('Category added successfully');
        if (data) {
          setCategories([...categories, data]);
        }
      }

      resetCategoryForm();
      setIsAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Error saving category');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will affect all menu items in this category.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setSuccess('Category deleted successfully');
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (err: any) {
      setError(err.message || 'Error deleting category');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMenuItem = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!itemName || !itemPrice) {
      setError('Please enter a name and price');
      setIsSubmitting(false);
      return;
    }

    try {
      let newImageUrl = itemImageUrl;
      if (selectedFile) {
        newImageUrl = await uploadImage(selectedFile);
      }

      const itemData = {
        vendor_id: vendor!.id,
        name: itemName,
        description: itemDescription || null,
        price: parseFloat(itemPrice),
        category_id: (itemCategoryId && itemCategoryId !== 'none') ? itemCategoryId : null,
        image_url: newImageUrl || null,
        preparation_time: itemPrepTime ? parseInt(itemPrepTime) : null,
        is_vegetarian: itemIsVegetarian,
        is_vegan: itemIsVegan,
        is_gluten_free: itemIsGlutenFree,
        spice_level: itemSpiceLevel,
        is_available: itemIsAvailable,
      };

      if (editingMenuItemId) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingMenuItemId);
        
        if (updateError) throw updateError;
        
        setSuccess('Menu item updated successfully');
        setMenuItems(menuItems.map(item => 
          item.id === editingMenuItemId ? { ...item, ...itemData, id: item.id } : item
        ));
      } else {
        const { data, error: insertError } = await supabase
          .from('menu_items')
          .insert(itemData)
          .select('*')
          .single();
        
        if (insertError) throw insertError;
        
        setSuccess('Menu item added successfully');
        if (data) {
          setMenuItems([...menuItems, data]);
        }
      }

      resetMenuItemForm();
      setIsAddingMenuItem(false);
    } catch (err: any) {
      setError(err.message || 'Error saving menu item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setSuccess('Menu item deleted successfully');
      setMenuItems(menuItems.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.message || 'Error deleting menu item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (id: string) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : 'Uncategorized';
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-black">Menu Management</h1>
        <Card className="border-gray-300">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-black">Vendor Profile Required</h2>
              <p className="text-black">You need to set up your vendor profile before managing your menu.</p>
              <Button asChild className="bg-gray-800 hover:bg-black text-white">
                <a href="/dashboard/vendor-profile">Set Up Vendor Profile</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Menu Management</h1>
          <p className="text-black">
            Manage your food menu categories and items
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

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="text-black">
        <TabsList className="mb-4 bg-gray-100 text-black">
          <TabsTrigger value="items" className="text-black data-[state=active]:bg-white">Menu Items</TabsTrigger>
          <TabsTrigger value="categories" className="text-black data-[state=active]:bg-white">Categories</TabsTrigger>
        </TabsList>
        
        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">Menu Items</h2>
            <Dialog open={isAddingMenuItem} onOpenChange={setIsAddingMenuItem}>
              <DialogTrigger asChild>
                <Button className="bg-gray-800 hover:bg-black text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-black">{editingMenuItemId ? 'Edit' : 'Add'} Menu Item</DialogTitle>
                  <DialogDescription className="text-black">
                    Enter the details for your menu item
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName" className="text-black font-medium">Name*</Label>
                    <Input
                      id="itemName"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="itemDescription" className="text-black font-medium">Description</Label>
                    <Textarea
                      id="itemDescription"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemPrice" className="text-black font-medium">Price*</Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="9.99"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="itemCategory" className="text-black font-medium">Category</Label>
                      <Select
                        value={itemCategoryId}
                        onValueChange={setItemCategoryId}
                      >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="none" className="text-black">Uncategorized</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id} className="text-black">
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Image Upload</Label>
                    <div
                      className="border-2 border-dashed border-gray-300 p-4 rounded-md text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => document.getElementById('itemImageUpload')?.click()}
                    >
                      {selectedFile ? (
                        <p className="text-black">{selectedFile.name}</p>
                      ) : (
                        <p className="text-black">Drag and drop an image here, or click to select a file</p>
                      )}
                      <input
                        id="itemImageUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemPrepTime" className="text-black font-medium">Preparation Time (min)</Label>
                      <Input
                        id="itemPrepTime"
                        type="number"
                        min="0"
                        value={itemPrepTime}
                        onChange={(e) => setItemPrepTime(e.target.value)}
                        placeholder="15"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="itemSpiceLevel" className="text-black font-medium">Spice Level (0-5)</Label>
                      <Input
                        id="itemSpiceLevel"
                        type="number"
                        min="0"
                        max="5"
                        value={itemSpiceLevel !== null ? itemSpiceLevel : ''}
                        onChange={(e) => setItemSpiceLevel(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Dietary Information</Label>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsVegetarian"
                          checked={itemIsVegetarian}
                          onChange={(e) => setItemIsVegetarian(e.target.checked)}
                          className="text-black border-gray-300"
                        />
                        <Label htmlFor="itemIsVegetarian" className="text-black">Vegetarian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsVegan"
                          checked={itemIsVegan}
                          onChange={(e) => setItemIsVegan(e.target.checked)}
                          className="text-black border-gray-300"
                        />
                        <Label htmlFor="itemIsVegan" className="text-black">Vegan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsGlutenFree"
                          checked={itemIsGlutenFree}
                          onChange={(e) => setItemIsGlutenFree(e.target.checked)}
                          className="text-black border-gray-300"
                        />
                        <Label htmlFor="itemIsGlutenFree" className="text-black">Gluten Free</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Availability</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="itemIsAvailable"
                        checked={itemIsAvailable}
                        onChange={(e) => setItemIsAvailable(e.target.checked)}
                        className="text-black border-gray-300"
                      />
                      <Label htmlFor="itemIsAvailable" className="text-black">Available for ordering</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetMenuItemForm();
                      setIsAddingMenuItem(false);
                    }}
                    className="border-gray-300 text-black hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveMenuItem} 
                    disabled={isSubmitting}
                    className="bg-gray-800 hover:bg-black text-white"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Item'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {menuItems.length === 0 ? (
            <Card className="border-gray-300">
              <CardContent className="p-6 text-center">
                <p className="text-black">No menu items yet. Add your first item!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-300">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Name</TableHead>
                      <TableHead className="text-black">Category</TableHead>
                      <TableHead className="text-black">Price</TableHead>
                      <TableHead className="text-center text-black">Available</TableHead>
                      <TableHead className="text-right text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id} className="border-gray-200">
                        <TableCell className="font-medium text-black">{item.name}</TableCell>
                        <TableCell className="text-black">{item.category_id ? getCategoryName(item.category_id) : 'Uncategorized'}</TableCell>
                        <TableCell className="text-black">${parseFloat(item.price.toString()).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {item.is_available ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 inline" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMenuItem(item)}
                            className="text-black hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="text-black hover:bg-gray-100"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">Categories</h2>
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <Button className="bg-gray-800 hover:bg-black text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-black">{editingCategoryId ? 'Edit' : 'Add'} Category</DialogTitle>
                  <DialogDescription className="text-black">
                    Enter the details for your menu category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName" className="text-black font-medium">Name*</Label>
                    <Input
                      id="categoryName"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Category name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription" className="text-black font-medium">Description</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                      placeholder="Category description"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="categoryDisplayOrder" className="text-black font-medium">Display Order</Label>
                    <Input
                      id="categoryDisplayOrder"
                      type="number"
                      min="0"
                      value={categoryDisplayOrder}
                      onChange={(e) => setCategoryDisplayOrder(parseInt(e.target.value))}
                      placeholder="0"
                    />
                    <p className="text-xs text-black">
                      Categories are displayed in ascending order (0 appears first)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Status</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="categoryIsActive"
                        checked={categoryIsActive}
                        onChange={(e) => setCategoryIsActive(e.target.checked)}
                        className="text-black border-gray-300"
                      />
                      <Label htmlFor="categoryIsActive" className="text-black">Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetCategoryForm();
                      setIsAddingCategory(false);
                    }}
                    className="border-gray-300 text-black hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveCategory} 
                    disabled={isSubmitting}
                    className="bg-gray-800 hover:bg-black text-white"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Category'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {categories.length === 0 ? (
            <Card className="border-gray-300">
              <CardContent className="p-6 text-center">
                <p className="text-black">No categories yet. Add your first category!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-300">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-black">Name</TableHead>
                      <TableHead className="text-black">Description</TableHead>
                      <TableHead className="text-center text-black">Order</TableHead>
                      <TableHead className="text-center text-black">Status</TableHead>
                      <TableHead className="text-right text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} className="border-gray-200">
                        <TableCell className="font-medium text-black">{category.name}</TableCell>
                        <TableCell className="text-black">{category.description || '-'}</TableCell>
                        <TableCell className="text-center text-black">{category.display_order}</TableCell>
                        <TableCell className="text-center">
                          {category.is_active ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 inline" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                            className="text-black hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-black hover:bg-gray-100"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}