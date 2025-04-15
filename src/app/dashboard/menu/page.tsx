// Enhanced MenuManagementPage with Customization Options
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, FoodVendor, MenuItem } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Edit,
  Trash,
  CheckCircle2,
  XCircle,
  Plus,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface CustomizationGroup {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
}

interface CustomizationOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  display_order: number;
}

export default function MenuManagementPage() {
  const { profile, isLoading } = useAuth();
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState("items");
  const [customizationGroups, setCustomizationGroups] = useState<
    CustomizationGroup[]
  >([]);
  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem | null>(null);

  // Category form state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState(0);
  const [categoryIsActive, setCategoryIsActive] = useState(true);

  // Menu item form state
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(
    null
  );
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemPrepTime, setItemPrepTime] = useState("");
  const [itemIsVegetarian, setItemIsVegetarian] = useState(false);
  const [itemIsVegan, setItemIsVegan] = useState(false);
  const [itemIsGlutenFree, setItemIsGlutenFree] = useState(false);
  const [itemSpiceLevel, setItemSpiceLevel] = useState<number | null>(0);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Customization group form state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupIsRequired, setGroupIsRequired] = useState(false);
  const [groupMinSelections, setGroupMinSelections] = useState(0);
  const [groupMaxSelections, setGroupMaxSelections] = useState<number | null>(
    1
  );
  const [groupDisplayOrder, setGroupDisplayOrder] = useState(0);

  // Customization option form state
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingGroupForOption, setEditingGroupForOption] = useState<
    string | null
  >(null);
  const [optionName, setOptionName] = useState("");
  const [optionPriceAdjustment, setOptionPriceAdjustment] = useState("0.00");
  const [optionIsDefault, setOptionIsDefault] = useState(false);
  const [optionDisplayOrder, setOptionDisplayOrder] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== "vendor") {
        setError("Only vendors can access this page");
        return;
      }

      const { data: vendorData, error: vendorError } = await supabase
        .from("food_vendors")
        .select("*")
        .eq("profile_id", profile.id)
        .single();

      if (vendorError) {
        if (vendorError.code === "PGRST116") {
          setError("Please set up your vendor profile first");
        } else {
          setError("Error fetching vendor profile");
          console.error(vendorError);
        }
        return;
      }

      setVendor(vendorData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("vendor_id", vendorData.id)
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch menu items
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("vendor_id", vendorData.id)
        .order("name", { ascending: true });

      if (menuItemsError) {
        console.error("Error fetching menu items:", menuItemsError);
      } else {
        setMenuItems(menuItemsData || []);
      }

      // Fetch customization groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("item_customization_groups")
        .select("*")
        .order("display_order", { ascending: true });

      if (groupsError) {
        console.error("Error fetching customization groups:", groupsError);
      } else {
        setCustomizationGroups(groupsData || []);
      }

      // Fetch customization options
      const { data: optionsData, error: optionsError } = await supabase
        .from("customization_options")
        .select("*")
        .order("display_order", { ascending: true });

      if (optionsError) {
        console.error("Error fetching customization options:", optionsError);
      } else {
        setCustomizationOptions(optionsData || []);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  // Reset form functions
  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryDisplayOrder(categories.length);
    setCategoryIsActive(true);
    setEditingCategoryId(null);
  };

  const resetMenuItemForm = () => {
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemCategoryId("");
    setItemImageUrl("");
    setItemPrepTime("");
    setItemIsVegetarian(false);
    setItemIsVegan(false);
    setItemIsGlutenFree(false);
    setItemSpiceLevel(0);
    setItemIsAvailable(true);
    setSelectedFile(null);
    setEditingMenuItemId(null);
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupIsRequired(false);
    setGroupMinSelections(0);
    setGroupMaxSelections(1);
    setGroupDisplayOrder(
      customizationGroups.filter((g) => g.menu_item_id === activeMenuItem?.id)
        .length
    );
    setEditingGroupId(null);
  };

  const resetOptionForm = () => {
    setOptionName("");
    setOptionPriceAdjustment("0.00");
    setOptionIsDefault(false);
    setOptionDisplayOrder(
      customizationOptions.filter((o) => o.group_id === editingGroupForOption)
        .length
    );
    setEditingOptionId(null);
  };

  // Edit handlers
  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryDisplayOrder(category.display_order);
    setCategoryIsActive(category.is_active);
    setIsAddingCategory(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemPrice(item.price.toString());
    setItemCategoryId(item.category_id || "");
    setItemImageUrl(item.image_url || "");
    setItemPrepTime(item.preparation_time?.toString() || "");
    setItemIsVegetarian(item.is_vegetarian);
    setItemIsVegan(item.is_vegan);
    setItemIsGlutenFree(item.is_gluten_free);
    setItemSpiceLevel(item.spice_level);
    setItemIsAvailable(item.is_available);
    setSelectedFile(null);
    setIsAddingMenuItem(true);
  };

  const handleEditGroup = (group: CustomizationGroup) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupIsRequired(group.is_required);
    setGroupMinSelections(group.min_selections);
    setGroupMaxSelections(group.max_selections);
    setGroupDisplayOrder(group.display_order);
    setIsAddingGroup(true);
  };

  const handleEditOption = (option: CustomizationOption, groupId: string) => {
    setEditingOptionId(option.id);
    setEditingGroupForOption(groupId);
    setOptionName(option.name);
    setOptionPriceAdjustment(option.price_adjustment.toString());
    setOptionIsDefault(option.is_default);
    setOptionDisplayOrder(option.display_order);
    setIsAddingOption(true);
  };

  // File handling
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
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(`public/${fileName}`, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(`public/${fileName}`);

    return urlData.publicUrl;
  };

  // Save handlers
  const handleSaveCategory = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!categoryName) {
      setError("Please enter a category name");
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
          .from("menu_categories")
          .update(categoryData)
          .eq("id", editingCategoryId);

        if (updateError) throw updateError;

        setSuccess("Category updated successfully");
        setCategories(
          categories.map((cat) =>
            cat.id === editingCategoryId
              ? { ...cat, ...categoryData, id: cat.id }
              : cat
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("menu_categories")
          .insert(categoryData)
          .select("*")
          .single();

        if (insertError) throw insertError;

        setSuccess("Category added successfully");
        if (data) {
          setCategories([...categories, data]);
        }
      }

      resetCategoryForm();
      setIsAddingCategory(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving category");
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
      setError("Please enter a name and price");
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
        category_id:
          itemCategoryId && itemCategoryId !== "none" ? itemCategoryId : null,
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
          .from("menu_items")
          .update(itemData)
          .eq("id", editingMenuItemId);

        if (updateError) throw updateError;

        setSuccess("Menu item updated successfully");
        setMenuItems(
          menuItems.map((item) =>
            item.id === editingMenuItemId
              ? { ...item, ...itemData, id: item.id }
              : item
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("menu_items")
          .insert(itemData)
          .select("*")
          .single();

        if (insertError) throw insertError;

        setSuccess("Menu item added successfully");
        if (data) {
          setMenuItems([...menuItems, data]);
        }
      }

      resetMenuItemForm();
      setIsAddingMenuItem(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving menu item");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGroup = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!groupName) {
      setError("Please enter a group name");
      setIsSubmitting(false);
      return;
    }

    if (activeMenuItem === null) {
      setError("No menu item selected");
      setIsSubmitting(false);
      return;
    }

    try {
      const groupData = {
        menu_item_id: activeMenuItem.id,
        name: groupName,
        is_required: groupIsRequired,
        min_selections: groupMinSelections,
        max_selections: groupMaxSelections,
        display_order: groupDisplayOrder,
      };

      if (editingGroupId) {
        const { error: updateError } = await supabase
          .from("item_customization_groups")
          .update(groupData)
          .eq("id", editingGroupId);

        if (updateError) throw updateError;

        setSuccess("Customization group updated successfully");
        setCustomizationGroups(
          customizationGroups.map((group) =>
            group.id === editingGroupId
              ? { ...group, ...groupData, id: group.id }
              : group
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("item_customization_groups")
          .insert(groupData)
          .select("*")
          .single();

        if (insertError) throw insertError;

        setSuccess("Customization group added successfully");
        if (data) {
          setCustomizationGroups([...customizationGroups, data]);
        }
      }

      resetGroupForm();
      setIsAddingGroup(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error saving customization group"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveOption = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!optionName) {
      setError("Please enter an option name");
      setIsSubmitting(false);
      return;
    }

    if (editingGroupForOption === null) {
      setError("No customization group selected");
      setIsSubmitting(false);
      return;
    }

    try {
      const optionData = {
        group_id: editingGroupForOption,
        name: optionName,
        price_adjustment: parseFloat(optionPriceAdjustment) || 0,
        is_default: optionIsDefault,
        display_order: optionDisplayOrder,
      };

      if (editingOptionId) {
        const { error: updateError } = await supabase
          .from("customization_options")
          .update(optionData)
          .eq("id", editingOptionId);

        if (updateError) throw updateError;

        setSuccess("Customization option updated successfully");
        setCustomizationOptions(
          customizationOptions.map((option) =>
            option.id === editingOptionId
              ? { ...option, ...optionData, id: option.id }
              : option
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("customization_options")
          .insert(optionData)
          .select("*")
          .single();

        if (insertError) throw insertError;

        setSuccess("Customization option added successfully");
        if (data) {
          setCustomizationOptions([...customizationOptions, data]);
        }
      }

      resetOptionForm();
      setIsAddingOption(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error saving customization option"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteCategory = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This will affect all menu items in this category."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setSuccess("Category deleted successfully");
      setCategories(categories.filter((cat) => cat.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting category");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Check if this menu item is referenced in any orders
      const { data: orderItems, error: checkError } = await supabase
        .from("order_items")
        .select("id")
        .eq("menu_item_id", id)
        .limit(1);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        // This item is used in orders, mark it as unavailable instead of deleting
        const { error: updateError } = await supabase
          .from("menu_items")
          .update({
            is_available: false,
            description: `[REMOVED] ${
              menuItems.find((item) => item.id === id)?.description || ""
            }`,
          })
          .eq("id", id);

        if (updateError) throw updateError;

        setSuccess(
          "Menu item has been marked as unavailable because it exists in customer orders"
        );
        setMenuItems(
          menuItems.map((item) =>
            item.id === id ? { ...item, is_available: false } : item
          )
        );
      } else {
        // If no orders reference this item, we can safely delete it
        const { error: deleteError } = await supabase
          .from("menu_items")
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;

        setSuccess("Menu item deleted successfully");
        setMenuItems(menuItems.filter((item) => item.id !== id));

        // Also delete related customization groups and options
        const relatedGroups = customizationGroups.filter(
          (group) => group.menu_item_id === id
        );
        if (relatedGroups.length > 0) {
          const groupIds = relatedGroups.map((group) => group.id);

          // Options are automatically deleted by CASCADE constraint
          const { error: deleteGroupsError } = await supabase
            .from("item_customization_groups")
            .delete()
            .in("id", groupIds);

          if (deleteGroupsError) {
            console.error(
              "Error deleting related customization groups:",
              deleteGroupsError
            );
          } else {
            setCustomizationGroups(
              customizationGroups.filter(
                (group) => !groupIds.includes(group.id)
              )
            );
            setCustomizationOptions(
              customizationOptions.filter(
                (option) => !groupIds.includes(option.group_id)
              )
            );
          }
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error handling menu item deletion"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this customization group? This will also delete all options in this group."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("item_customization_groups")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setSuccess("Customization group deleted successfully");
      setCustomizationGroups(
        customizationGroups.filter((group) => group.id !== id)
      );

      // Options will be automatically deleted by CASCADE constraint
      setCustomizationOptions(
        customizationOptions.filter((option) => option.group_id !== id)
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error deleting customization group"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this customization option?")
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("customization_options")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setSuccess("Customization option deleted successfully");
      setCustomizationOptions(
        customizationOptions.filter((option) => option.id !== id)
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error deleting customization option"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCustomizations = (item: MenuItem) => {
    console.log("Viewing customizations for:", item.name); // Add debugging
    setActiveMenuItem(item);
    // Force a small delay before changing tab to ensure state is updated
    setTimeout(() => {
      setActiveTab("customizations");
    }, 50);
  };

  const getCategoryName = (id: string) => {
    const category = categories.find((cat) => cat.id === id);
    return category ? category.name : "Uncategorized";
  };

  const getGroupsForCurrentItem = () => {
    if (!activeMenuItem) return [];
    return customizationGroups
      .filter((group) => group.menu_item_id === activeMenuItem.id)
      .sort((a, b) => a.display_order - b.display_order);
  };

  const getOptionsForGroup = (groupId: string) => {
    return customizationOptions
      .filter((option) => option.group_id === groupId)
      .sort((a, b) => a.display_order - b.display_order);
  };

  // Drag and drop handlers for reordering
  const handleDragEndGroups = async (result: {
    destination: { index: number } | null;
    source: { index: number };
  }) => {
    if (!result.destination) return;

    const items = Array.from(getGroupsForCurrentItem());
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all affected items
    const updatedGroups = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setCustomizationGroups(
      customizationGroups.map((group) => {
        const updatedGroup = updatedGroups.find((u) => u.id === group.id);
        return updatedGroup ? updatedGroup : group;
      })
    );

    // Update in database
    for (const group of updatedGroups) {
      await supabase
        .from("item_customization_groups")
        .update({ display_order: group.display_order })
        .eq("id", group.id);
    }
  };

  const handleDragEndOptions = async (
    result: {
      destination: { index: number } | null;
      source: { index: number };
    },
    groupId: string
  ) => {
    if (!result.destination) return;

    const items = Array.from(getOptionsForGroup(groupId));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all affected items
    const updatedOptions = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setCustomizationOptions(
      customizationOptions.map((option) => {
        const updatedOption = updatedOptions.find((u) => u.id === option.id);
        return updatedOption ? updatedOption : option;
      })
    );

    // Update in database
    for (const option of updatedOptions) {
      await supabase
        .from("customization_options")
        .update({ display_order: option.display_order })
        .eq("id", option.id);
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-black">
          Menu Management
        </h1>
        <Card className="border-gray-300">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Vendor Profile Required
              </h2>
              <p className="text-black">
                You need to set up your vendor profile before managing your
                menu.
              </p>
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
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Menu Management
          </h1>
          <p className="text-black">
            Manage your food menu categories, items, and customization options
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

<Tabs 
  value={activeTab} 
  onValueChange={setActiveTab} 
  className="text-black"
  defaultValue="items"
>
        <TabsList className="mb-4 bg-gray-100 text-black">
          <TabsTrigger
            value="items"
            className="text-black data-[state=active]:bg-white"
          >
            Menu Items
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="text-black data-[state=active]:bg-white"
          >
            Categories
          </TabsTrigger>
          <TabsTrigger
            value="customizations"
            className="text-black data-[state=active]:bg-white"
          >
            Customizations
          </TabsTrigger>
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
                  <DialogTitle className="text-black">
                    {editingMenuItemId ? "Edit" : "Add"} Menu Item
                  </DialogTitle>
                  <DialogDescription className="text-black">
                    Enter the details for your menu item
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="itemName"
                      className="text-black font-medium"
                    >
                      Name*
                    </Label>
                    <Input
                      id="itemName"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Item name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="itemDescription"
                      className="text-black font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="itemDescription"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Item description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="itemPrice"
                        className="text-black font-medium"
                      >
                        Price*
                      </Label>
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
                      <Label
                        htmlFor="itemCategory"
                        className="text-black font-medium"
                      >
                        Category
                      </Label>
                      <Select
                        value={itemCategoryId}
                        onValueChange={setItemCategoryId}
                      >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="none" className="text-black">
                            Uncategorized
                          </SelectItem>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id}
                              className="text-black"
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">
                      Image Upload
                    </Label>
                    <div
                      className="border-2 border-dashed border-gray-300 p-4 rounded-md text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() =>
                        document.getElementById("itemImageUpload")?.click()
                      }
                    >
                      {selectedFile ? (
                        <p className="text-black">{selectedFile.name}</p>
                      ) : (
                        <p className="text-black">
                          Drag and drop an image here, or click to select a file
                        </p>
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
                      <Label
                        htmlFor="itemPrepTime"
                        className="text-black font-medium"
                      >
                        Preparation Time (min)
                      </Label>
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
                      <Label
                        htmlFor="itemSpiceLevel"
                        className="text-black font-medium"
                      >
                        Spice Level (0-5)
                      </Label>
                      <Input
                        id="itemSpiceLevel"
                        type="number"
                        min="0"
                        max="5"
                        value={itemSpiceLevel !== null ? itemSpiceLevel : ""}
                        onChange={(e) =>
                          setItemSpiceLevel(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">
                      Dietary Information
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsVegetarian"
                          checked={itemIsVegetarian}
                          onChange={(e) =>
                            setItemIsVegetarian(e.target.checked)
                          }
                          className="text-black border-gray-300"
                        />
                        <Label
                          htmlFor="itemIsVegetarian"
                          className="text-black"
                        >
                          Vegetarian
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsVegan"
                          checked={itemIsVegan}
                          onChange={(e) => setItemIsVegan(e.target.checked)}
                          className="text-black border-gray-300"
                        />
                        <Label htmlFor="itemIsVegan" className="text-black">
                          Vegan
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="itemIsGlutenFree"
                          checked={itemIsGlutenFree}
                          onChange={(e) =>
                            setItemIsGlutenFree(e.target.checked)
                          }
                          className="text-black border-gray-300"
                        />
                        <Label
                          htmlFor="itemIsGlutenFree"
                          className="text-black"
                        >
                          Gluten Free
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">
                      Availability
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="itemIsAvailable"
                        checked={itemIsAvailable}
                        onChange={(e) => setItemIsAvailable(e.target.checked)}
                        className="text-black border-gray-300"
                      />
                      <Label htmlFor="itemIsAvailable" className="text-black">
                        Available for ordering
                      </Label>
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
                    {isSubmitting ? "Saving..." : "Save Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {menuItems.length === 0 ? (
            <Card className="border-gray-300">
              <CardContent className="p-6 text-center">
                <p className="text-black">
                  No menu items yet. Add your first item!
                </p>
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
                      <TableHead className="text-center text-black">
                        Available
                      </TableHead>
                      <TableHead className="text-right text-black">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id} className="border-gray-200">
                        <TableCell className="font-medium text-black">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-black">
                          {item.category_id
                            ? getCategoryName(item.category_id)
                            : "Uncategorized"}
                        </TableCell>
                        <TableCell className="text-black">
                          ${parseFloat(item.price.toString()).toFixed(2)}
                        </TableCell>
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewCustomizations(item);
                            }}
                            title="Manage Customizations"
                            className="text-black hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMenuItem(item)}
                            title="Edit Item"
                            className="text-black hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMenuItem(item.id)}
                            title="Delete Item"
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
                  <DialogTitle className="text-black">
                    {editingCategoryId ? "Edit" : "Add"} Category
                  </DialogTitle>
                  <DialogDescription className="text-black">
                    Enter the details for your menu category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="categoryName"
                      className="text-black font-medium"
                    >
                      Name*
                    </Label>
                    <Input
                      id="categoryName"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Category name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="categoryDescription"
                      className="text-black font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                      placeholder="Category description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="categoryDisplayOrder"
                      className="text-black font-medium"
                    >
                      Display Order
                    </Label>
                    <Input
                      id="categoryDisplayOrder"
                      type="number"
                      min="0"
                      value={categoryDisplayOrder}
                      onChange={(e) =>
                        setCategoryDisplayOrder(parseInt(e.target.value))
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-black">
                      Categories are displayed in ascending order (0 appears
                      first)
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
                      <Label htmlFor="categoryIsActive" className="text-black">
                        Active
                      </Label>
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
                    {isSubmitting ? "Saving..." : "Save Category"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {categories.length === 0 ? (
            <Card className="border-gray-300">
              <CardContent className="p-6 text-center">
                <p className="text-black">
                  No categories yet. Add your first category!
                </p>
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
                      <TableHead className="text-center text-black">
                        Order
                      </TableHead>
                      <TableHead className="text-center text-black">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-black">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} className="border-gray-200">
                        <TableCell className="font-medium text-black">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-black">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell className="text-center text-black">
                          {category.display_order}
                        </TableCell>
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

        {/* Customizations Tab */}
        <TabsContent value="customizations" className="space-y-4">
          <div className="flex justify-between items-center">
            {activeMenuItem ? (
              <>
                <div className="flex flex-col">
                  <h2 className="text-xl font-semibold text-black">
                    Customizations for {activeMenuItem.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Add customization groups and options for this menu item
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveMenuItem(null);
                      setActiveTab("items");
                    }}
                    className="text-black border-gray-300"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Menu Items
                  </Button>
                  <Dialog open={isAddingGroup} onOpenChange={setIsAddingGroup}>
                    <DialogTrigger asChild>
                      <Button className="bg-gray-800 hover:bg-black text-white">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
                      <DialogHeader>
                        <DialogTitle className="text-black">
                          {editingGroupId ? "Edit" : "Add"} Customization Group
                        </DialogTitle>
                        <DialogDescription className="text-black">
                          Create a group of customization options
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="groupName"
                            className="text-black font-medium"
                          >
                            Group Name*
                          </Label>
                          <Input
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g., Toppings, Sizes, Protein Options"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Label className="text-black font-medium">
                              Required
                            </Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Switch
                                checked={groupIsRequired}
                                onCheckedChange={setGroupIsRequired}
                                id="groupIsRequired"
                              />
                              <Label
                                htmlFor="groupIsRequired"
                                className="text-black"
                              >
                                Customer must select options from this group
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="groupMinSelections"
                              className="text-black font-medium"
                            >
                              Minimum Selections
                            </Label>
                            <Input
                              id="groupMinSelections"
                              type="number"
                              min="0"
                              value={groupMinSelections}
                              onChange={(e) =>
                                setGroupMinSelections(parseInt(e.target.value))
                              }
                              placeholder="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="groupMaxSelections"
                              className="text-black font-medium"
                            >
                              Maximum Selections
                            </Label>
                            <Input
                              id="groupMaxSelections"
                              type="number"
                              min="1"
                              value={groupMaxSelections || ""}
                              onChange={(e) =>
                                setGroupMaxSelections(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : null
                                )
                              }
                              placeholder="1"
                            />
                            <p className="text-xs text-black">
                              Leave empty for unlimited selections
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="groupDisplayOrder"
                            className="text-black font-medium"
                          >
                            Display Order
                          </Label>
                          <Input
                            id="groupDisplayOrder"
                            type="number"
                            min="0"
                            value={groupDisplayOrder}
                            onChange={(e) =>
                              setGroupDisplayOrder(parseInt(e.target.value))
                            }
                            placeholder="0"
                          />
                          <p className="text-xs text-black">
                            Groups are displayed in ascending order (0 appears
                            first)
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetGroupForm();
                            setIsAddingGroup(false);
                          }}
                          className="border-gray-300 text-black hover:bg-gray-100"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveGroup}
                          disabled={isSubmitting}
                          className="bg-gray-800 hover:bg-black text-white"
                        >
                          {isSubmitting ? "Saving..." : "Save Group"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <div className="w-full">
                <h2 className="text-xl font-semibold text-black text-center">
                  Select a menu item to manage customizations
                </h2>
              </div>
            )}
          </div>

          {activeMenuItem ? (
            getGroupsForCurrentItem().length === 0 ? (
              <Card className="border-gray-300">
                <CardContent className="p-6 text-center">
                  <p className="text-black mb-4">
                    No customization groups yet for this item.
                  </p>
                  <Button
                    onClick={() => setIsAddingGroup(true)}
                    className="bg-gray-800 hover:bg-black text-white"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add your first customization group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DragDropContext onDragEnd={handleDragEndGroups}>
                <Droppable droppableId="customizationGroups">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-6"
                    >
                      {getGroupsForCurrentItem().map((group, index) => (
                        <Draggable
                          key={group.id}
                          draggableId={group.id}
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              className="border-gray-300"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps}>
                                      <Menu className="h-5 w-5 text-gray-400 cursor-move" />
                                    </div>
                                    <h3 className="text-lg font-medium text-black">
                                      {group.name}
                                    </h3>
                                    {group.is_required && (
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                        Required
                                      </Badge>
                                    )}
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      {group.min_selections} -{" "}
                                      {group.max_selections === null
                                        ? "∞"
                                        : group.max_selections}{" "}
                                      selections
                                    </Badge>
                                  </div>
                                  <div className="flex gap-1">
                                    <Dialog
                                      open={
                                        isAddingOption &&
                                        editingGroupForOption === group.id
                                      }
                                      onOpenChange={(open) => {
                                        setIsAddingOption(open);
                                        if (open)
                                          setEditingGroupForOption(group.id);
                                      }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="bg-gray-800 hover:bg-black text-white"
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          Add Option
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
                                        <DialogHeader>
                                          <DialogTitle className="text-black">
                                            {editingOptionId ? "Edit" : "Add"}{" "}
                                            Option to {group.name}
                                          </DialogTitle>
                                          <DialogDescription className="text-black">
                                            Add customization options to this
                                            group
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                          <div className="space-y-2">
                                            <Label
                                              htmlFor="optionName"
                                              className="text-black font-medium"
                                            >
                                              Option Name*
                                            </Label>
                                            <Input
                                              id="optionName"
                                              value={optionName}
                                              onChange={(e) =>
                                                setOptionName(e.target.value)
                                              }
                                              placeholder="e.g., Extra Cheese, Large Size"
                                            />
                                          </div>

                                          <div className="space-y-2">
                                            <Label
                                              htmlFor="optionPriceAdjustment"
                                              className="text-black font-medium"
                                            >
                                              Price Adjustment
                                            </Label>
                                            <Input
                                              id="optionPriceAdjustment"
                                              type="number"
                                              step="0.01"
                                              value={optionPriceAdjustment}
                                              onChange={(e) =>
                                                setOptionPriceAdjustment(
                                                  e.target.value
                                                )
                                              }
                                              placeholder="0.00"
                                            />
                                            <p className="text-xs text-black">
                                              Additional cost for this option
                                              (can be 0)
                                            </p>
                                          </div>

                                          <div className="flex items-center space-x-2">
                                            <div className="flex-1">
                                              <Label className="text-black font-medium">
                                                Default Selection
                                              </Label>
                                              <div className="flex items-center space-x-2 mt-1">
                                                <Switch
                                                  checked={optionIsDefault}
                                                  onCheckedChange={
                                                    setOptionIsDefault
                                                  }
                                                  id="optionIsDefault"
                                                />
                                                <Label
                                                  htmlFor="optionIsDefault"
                                                  className="text-black"
                                                >
                                                  This option is selected by
                                                  default
                                                </Label>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <Label
                                              htmlFor="optionDisplayOrder"
                                              className="text-black font-medium"
                                            >
                                              Display Order
                                            </Label>
                                            <Input
                                              id="optionDisplayOrder"
                                              type="number"
                                              min="0"
                                              value={optionDisplayOrder}
                                              onChange={(e) =>
                                                setOptionDisplayOrder(
                                                  parseInt(e.target.value)
                                                )
                                              }
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                              resetOptionForm();
                                              setIsAddingOption(false);
                                            }}
                                            className="border-gray-300 text-black hover:bg-gray-100"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            type="button"
                                            onClick={handleSaveOption}
                                            disabled={isSubmitting}
                                            className="bg-gray-800 hover:bg-black text-white"
                                          >
                                            {isSubmitting
                                              ? "Saving..."
                                              : "Save Option"}
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditGroup(group)}
                                      className="text-black border-gray-300"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleDeleteGroup(group.id)
                                      }
                                      className="text-black border-gray-300"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-2">
                                  {getOptionsForGroup(group.id).length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                      No options yet. Add your first option to
                                      this group.
                                    </div>
                                  ) : (
                                    <DragDropContext
                                      onDragEnd={(result) =>
                                        handleDragEndOptions(result, group.id)
                                      }
                                    >
                                      <Droppable
                                        droppableId={`options-${group.id}`}
                                      >
                                        {(provided) => (
                                          <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                          >
                                            <Table>
                                              <TableHeader className="bg-gray-50">
                                                <TableRow>
                                                  <TableHead className="w-10"></TableHead>
                                                  <TableHead className="text-black">
                                                    Name
                                                  </TableHead>
                                                  <TableHead className="text-black">
                                                    Price
                                                  </TableHead>
                                                  <TableHead className="text-center text-black">
                                                    Default
                                                  </TableHead>
                                                  <TableHead className="text-center text-black">
                                                    Order
                                                  </TableHead>
                                                  <TableHead className="text-right text-black">
                                                    Actions
                                                  </TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {getOptionsForGroup(
                                                  group.id
                                                ).map((option, index) => (
                                                  <Draggable
                                                    key={option.id}
                                                    draggableId={option.id}
                                                    index={index}
                                                  >
                                                    {(provided) => (
                                                      <TableRow
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className="border-gray-200"
                                                      >
                                                        <TableCell
                                                          {...provided.dragHandleProps}
                                                        >
                                                          <Menu className="h-4 w-4 text-gray-400 cursor-move" />
                                                        </TableCell>
                                                        <TableCell className="font-medium text-black">
                                                          {option.name}
                                                        </TableCell>
                                                        <TableCell className="text-black">
                                                          {option.price_adjustment >
                                                          0
                                                            ? `+$${option.price_adjustment.toFixed(
                                                                2
                                                              )}`
                                                            : option.price_adjustment <
                                                              0
                                                            ? `-$${Math.abs(
                                                                option.price_adjustment
                                                              ).toFixed(2)}`
                                                            : "$0.00"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                          {option.is_default ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                                                          ) : (
                                                            <XCircle className="h-5 w-5 text-red-500 inline" />
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-center text-black">
                                                          {option.display_order}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                              handleEditOption(
                                                                option,
                                                                group.id
                                                              )
                                                            }
                                                            className="text-black hover:bg-gray-100"
                                                          >
                                                            <Edit className="h-4 w-4" />
                                                          </Button>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                              handleDeleteOption(
                                                                option.id
                                                              )
                                                            }
                                                            className="text-black hover:bg-gray-100"
                                                          >
                                                            <Trash className="h-4 w-4" />
                                                          </Button>
                                                        </TableCell>
                                                      </TableRow>
                                                    )}
                                                  </Draggable>
                                                ))}
                                                {provided.placeholder}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        )}
                                      </Droppable>
                                    </DragDropContext>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )
          ) : (
            <Card className="border-gray-300">
              <CardContent className="p-6 text-center">
                <p className="text-black mb-2">
                  Select a menu item from the &quot;Menu Items&quot; tab to
                  manage its customization options.
                </p>
                <Button
                  onClick={() => setActiveTab("items")}
                  className="bg-gray-800 hover:bg-black text-white"
                >
                  Go to Menu Items
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
