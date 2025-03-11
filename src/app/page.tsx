// app/page.tsx
'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, Store, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center">
          <div className="flex flex-col md:w-1/2 space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">College Marketplace Admin</h1>
            <p className="text-lg md:text-xl">
              A unified platform to manage your campus marketplace and food service operations
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-gray-100">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
          <div className="mt-12 md:mt-0 md:w-1/2 flex justify-center">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square">
                  <ShoppingBag className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Marketplace</span>
                </div>
                <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square">
                  <Store className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Food Vendors</span>
                </div>
                <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square">
                  <Users className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">User Management</span>
                </div>
                <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center justify-center aspect-square">
                  <ArrowRight className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Get Started</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Store className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Vendor Management</h3>
              <p className="text-gray-600">
                Approve vendor applications, manage profiles, and monitor performance across your campus.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <ShoppingBag className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Order Tracking</h3>
              <p className="text-gray-600">
                Monitor orders in real-time, track status changes, and ensure smooth delivery operations.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-gray-600">
                Manage student accounts, vendor profiles, and administrative access all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
              <h2 className="text-3xl font-bold mb-4">Powerful Dashboard</h2>
              <p className="text-gray-600 mb-6">
                Get insights into your marketplace operations with comprehensive analytics, sales data, and user metrics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <div className="rounded-full bg-green-100 p-1 mr-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Real-time sales tracking</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-green-100 p-1 mr-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Vendor performance metrics</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-green-100 p-1 mr-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Order status notifications</span>
                </li>
              </ul>
              <Button asChild className="mt-6">
                <Link href="/dashboard">
                  View Dashboard Demo
                </Link>
              </Button>
            </div>
            <div className="md:w-1/2 bg-gray-100 rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 bg-blue-600 text-white">
                <h3 className="font-medium">Dashboard Preview</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded shadow">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold">1,248</p>
                  </div>
                  <div className="bg-white p-4 rounded shadow">
                    <p className="text-sm text-gray-500">Active Vendors</p>
                    <p className="text-2xl font-bold">38</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded shadow mb-4">
                  <p className="text-sm text-gray-500 mb-2">Monthly Sales</p>
                  <div className="h-32 bg-gray-200 rounded flex items-end space-x-2 p-2">
                    <div className="bg-blue-500 w-1/6 h-1/4 rounded-t"></div>
                    <div className="bg-blue-500 w-1/6 h-1/3 rounded-t"></div>
                    <div className="bg-blue-500 w-1/6 h-1/2 rounded-t"></div>
                    <div className="bg-blue-500 w-1/6 h-3/4 rounded-t"></div>
                    <div className="bg-blue-500 w-1/6 h-2/3 rounded-t"></div>
                    <div className="bg-blue-500 w-1/6 h-full rounded-t"></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <p className="text-sm text-gray-500 mb-2">Recent Orders</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm">#12345</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Completed</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm">#12346</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Processing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="text-xl font-bold mb-4">College Marketplace</h3>
              <p className="text-gray-400">Streamline your campus commerce</p>
            </div>
            <div className="mt-6 md:mt-0">
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-gray-400 hover:text-white">Login</Link></li>
                <li><Link href="/signup" className="text-gray-400 hover:text-white">Sign Up</Link></li>
                <li><Link href="/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} College Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}