// app/page.tsx
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, Store, BarChart3, Bell, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>
        <div className="container mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center relative">
          <div className="flex flex-col md:w-1/2 space-y-6">

            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              College Marketplace Admin
            </h1>
            <p className="text-lg md:text-xl text-indigo-100">
              A unified platform to manage your campus marketplace and food service operations
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
          <div className="mt-12 md:mt-0 md:w-1/2 flex justify-center">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-white/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-500/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square hover:bg-indigo-500/30 transition-colors cursor-pointer border border-indigo-400/30">
                  <ShoppingBag className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Marketplace</span>
                </div>
                <div className="bg-indigo-500/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square hover:bg-indigo-500/30 transition-colors cursor-pointer border border-indigo-400/30">
                  <Store className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Food Vendors</span>
                </div>
                <div className="bg-indigo-500/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square hover:bg-indigo-500/30 transition-colors cursor-pointer border border-indigo-400/30">
                  <Users className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">User Management</span>
                </div>
                <div className="bg-indigo-500/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square hover:bg-indigo-500/30 transition-colors cursor-pointer border border-indigo-400/30">
                  <BarChart3 className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Platform Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools to manage your campus marketplace efficiently and effectively
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow border-gray-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Store className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Vendor Management</h3>
                <p className="text-gray-600">
                  Approve vendor applications, manage profiles, and monitor performance across your campus.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-gray-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingBag className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Order Tracking</h3>
                <p className="text-gray-600">
                  Monitor orders in real-time, track status changes, and ensure smooth delivery operations.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-gray-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">User Management</h3>
                <p className="text-gray-600">
                  Manage student accounts, vendor profiles, and administrative access all in one place.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
              <h2 className="text-3xl font-bold mb-4 text-gray-900">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800">
                  Powerful Dashboard
                </span>
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                Transform your marketplace operations with our comprehensive analytics suite. Get real-time insights into sales, user behavior, and vendor performance.
              </p>
              <div className="space-y-6">
                <div className="group flex items-center p-6 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-6 shadow-inner">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Real-time Analytics</h4>
                    <p className="text-gray-600">Monitor sales trends, track user engagement, and analyze peak ordering times</p>
                  </div>
                </div>
                <div className="group flex items-center p-6 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-6 shadow-inner">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Intelligent Alerts</h4>
                    <p className="text-gray-600">Stay informed with customizable notifications for orders, vendors, and system updates</p>
                  </div>
                </div>
                <div className="group flex items-center p-6 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-6 shadow-inner">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Advanced Configuration</h4>
                    <p className="text-gray-600">Tailor the platform with custom reports, automated workflows, and role-based access</p>
                  </div>
                </div>
              </div>

            </div>
            <div className="md:w-1/2">
              <Card className="shadow-xl border-gray-200">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Dashboard Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">1,248</p>
                      <p className="text-xs text-indigo-600 flex items-center">
                        <span className="inline-block mr-1">↑</span> 12% from last month
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-sm text-gray-600">Active Vendors</p>
                      <p className="text-2xl font-bold text-gray-900">38</p>
                      <p className="text-xs text-indigo-600 flex items-center">
                        <span className="inline-block mr-1">↑</span> 5 new this month
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg mb-4 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-600 mb-2">Monthly Sales</p>
                    <div className="h-32 flex items-end space-x-2 p-2">
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-1/4 rounded-t"></div>
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-1/3 rounded-t"></div>
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-1/2 rounded-t"></div>
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-3/4 rounded-t"></div>
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-2/3 rounded-t"></div>
                      <div className="bg-gradient-to-t from-indigo-600 to-indigo-500 w-1/6 h-full rounded-t"></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-600 mb-2">Recent Orders</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                        <div>
                          <span className="text-sm font-medium text-gray-900">#12345</span>
                          <p className="text-xs text-gray-600">Pizza Delivery</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">Completed</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                        <div>
                          <span className="text-sm font-medium text-gray-900">#12346</span>
                          <p className="text-xs text-gray-600">Textbook Sale</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">Processing</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">College Marketplace</h3>
              <p className="text-gray-400">Streamline your campus commerce</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/signup" className="text-gray-400 hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="text-gray-400">Email: support@collegemarketplace.com</li>
                <li className="text-gray-400">Phone: (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} College Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}