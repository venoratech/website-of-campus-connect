// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on database schema
export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  profile_image_url: string | null;
  role: 'student' | 'vendor' | 'admin' | 'super_admin' | 'vendor_manager' | 'marketplace_moderator' | 'user_support_admin' | 'analytics_manager' | 'content_manager' | 'cashier';
  college_id: string | null;
  created_at: string;
  updated_at: string;
  student_id?: string | null;
  graduation_year?: number | null;
  business_name?: string | null;
  business_description?: string | null;
  business_logo_url?: string | null;
  business_hours?: Record<string, string | boolean | number>; // More specific type
  is_approved?: boolean;
  is_active?: boolean;
  is_id_verified: boolean | null;
  id_image_url: string | null;
};

export type College = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

export type FoodVendor = {
  id: string;
  profile_id: string;
  vendor_name: string;
  description: string | null;
  location: string;
  college_id: string;
  logo_url: string | null;
  banner_url: string | null;
  business_hours: Record<string, string | boolean | number> | null; // More specific type
  average_preparation_time: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  preparation_time: number | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  spice_level: number | null;
  allergens: string[] | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type FoodOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  payment_intent_id: string | null;
  special_instructions: string | null;
  scheduled_pickup_time: string | null;
  actual_pickup_time: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketplaceItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  seller_id: string;
  category_id: string;
  college_id: string;
  status: 'active' | 'sold' | 'reserved' | 'deleted';
  created_at: string;
  updated_at: string;
};

export type MarketplaceTransaction = {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'requested' | 'accepted' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'app_payment' | 'other' | null;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// New types for role-based permissions system
export type RoleName = Profile['role'];

export type RolePermission = {
  id: string;
  role_name: RoleName;
  permissions: {
    user_management?: boolean | { view?: boolean, issue_resolution?: boolean };
    vendor_management?: boolean;
    marketplace_management?: boolean;
    support_management?: boolean;
    analytics_access?: boolean | { vendor_analytics?: boolean, marketplace_analytics?: boolean };
    content_management?: boolean;
    settings_access?: boolean;
    role_assignment?: boolean;
    order_management?: boolean;
    payment_processing?: boolean;
    all_access?: boolean;
    vendor_profile?: boolean;
    menu_management?: boolean;
    order_processing?: boolean;
    vendor_analytics?: boolean;
    profile_management?: boolean;
    marketplace_access?: boolean;
    order_placement?: boolean;
    report_generation?: boolean;
    announcements?: boolean;
    terms_policies?: boolean;
  };
  created_at: string;
  updated_at: string;
}