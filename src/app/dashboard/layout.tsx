// app/dashboard/layout.tsx
'use client';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Users,
  Building,
  ShoppingBag,
  Store,
  Settings,
  Menu,
  Home,
  LogOut,
  User,
  Gift,
  MessageSquare,
  Bell,
  Clock,
  Megaphone,
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ElementType;
  title: string;
  href: string;
  active?: boolean;
}

const SidebarItem = ({ icon: Icon, title, href, active }: SidebarItemProps) => (
  <Link
    href={href}
    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 ${
      active ? 'bg-gray-100 text-black' : 'text-black'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span>{title}</span>
  </Link>
);

interface MobileSidebarProps {
  children: ReactNode;
}

const MobileSidebar = ({ children }: MobileSidebarProps) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon" className="md:hidden border-gray-300 text-black hover:bg-gray-100">
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-64 bg-white text-black border-gray-300">
      <div className="flex flex-col h-full">
        <div className="py-4">
          <h2 className="text-lg font-semibold px-3 text-black">College Marketplace</h2>
        </div>
        <div className="flex-1 px-3">{children}</div>
      </div>
    </SheetContent>
  </Sheet>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-black">Loading...</div>;
  }

  if (!user || !profile) {
    return null;
  }

  // Navigation items based on user role
  const getNavItems = () => {
    const commonItems = [
      { icon: Home, title: 'Dashboard', href: '/dashboard' },
      { icon: User, title: 'Profile', href: '/dashboard/profile' },
      { icon: Bell, title: 'Notifications', href: '/dashboard/notifications' },
    ];

    const vendorItems = [
      { icon: Store, title: 'Vendor Profile', href: '/dashboard/vendor-profile' },
      { icon: ShoppingBag, title: 'Menu Management', href: '/dashboard/menu' },
      { icon: Gift, title: 'Promotions', href: '/dashboard/promotions' },
      { icon: MessageSquare, title: 'Messages', href: '/dashboard/messages' },
      { icon: Clock, title: 'Order Management', href: '/dashboard/orders' },
    ];

    const adminItems = [
      { icon: Users, title: 'User Management', href: '/dashboard/users' },
      { icon: Building, title: 'Colleges', href: '/dashboard/colleges' },
      { icon: Store, title: 'Vendors', href: '/dashboard/vendors' },
      { icon: ShoppingBag, title: 'Marketplace', href: '/dashboard/marketplace' },
      { icon: Megaphone, title: 'Announcements', href: '/dashboard/announcements' },
      { icon: BarChart, title: 'Analytics', href: '/dashboard/analytics' },
      { icon: Settings, title: 'Settings', href: '/dashboard/settings' },
    ];

    switch (profile.role) {
      case 'admin':
        return [...commonItems, ...adminItems];
      case 'vendor':
        return [...commonItems, ...vendorItems];
      default:
        return commonItems;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-300 bg-white">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-black">College Marketplace</h2>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              title={item.title}
              href={item.href}
            />
          ))}
        </nav>
        <div className="p-4">
          <Button 
            onClick={signOut} 
            variant="outline" 
            className="w-full justify-start border-gray-300 text-black hover:bg-gray-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-gray-300 bg-white px-4 md:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar>
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => (
                  <SidebarItem
                    key={item.href}
                    icon={item.icon}
                    title={item.title}
                    href={item.href}
                  />
                ))}
                <div className="pt-4">
                  <Button 
                    onClick={signOut} 
                    variant="outline" 
                    className="w-full justify-start border-gray-300 text-black hover:bg-gray-100"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </nav>
            </MobileSidebar>
            <h1 className="text-lg font-semibold md:hidden text-black">College Marketplace</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full text-black hover:bg-gray-100">
                  <Avatar className="h-9 w-9 bg-gray-200 text-black">
                    <AvatarImage src={profile.profile_image_url || undefined} alt="Profile" />
                    <AvatarFallback className="bg-gray-200 text-black">
                      {profile.first_name?.[0] || profile.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white text-black border-gray-300">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-black">{profile.first_name || 'User'}</p>
                    <p className="text-xs leading-none text-black">{profile.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem asChild className="text-black hover:bg-gray-100">
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-black hover:bg-gray-100">
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem onClick={signOut} className="text-black hover:bg-gray-100">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}