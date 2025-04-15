'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">University Companion App - Terms, Policies, and Privacy</h1>
        <p className="text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This document outlines the terms and conditions for using the University Companion App (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), as well as our policies regarding refunds, food service terms, and how we handle your personal data. Our app is designed to simplify and enhance student life by providing services such as food ordering, a student marketplace, tutoring services, and AI-powered productivity tools, tailored specifically for university students. By downloading or using this app, you agree to these terms and policies.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1. Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">General terms of service for using the app:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must be a university student or affiliated with a university to use this app.</li>
            <li>You are responsible for keeping your account details secure.</li>
            <li>You agree not to misuse the app or violate any laws while using it.</li>
            <li>All content and services provided in the app are protected by intellectual property rights.</li>
            <li>We may suspend or terminate access if any user violates these terms.</li>
            <li>We are not liable for third-party services, including vendor disputes.</li>
            <li>We may update these terms at any time, and your continued use means you accept the changes.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Rules for buying and selling on the marketplace:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All transactions are directly between buyers and sellers.</li>
            <li>Sellers are responsible for accurately describing their products and setting their refund/return terms.</li>
            <li>Buyers should review a seller&#39;s return policy before purchasing.</li>
            <li>The app does not guarantee refunds or intervene in payment disputes.</li>
            <li>Users are encouraged to resolve issues respectfully and report misconduct when necessary.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>3. Food Service Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Terms for ordering food and delivery:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Orders are processed by third-party food vendors listed in the app.</li>
            <li>Food quality, delivery time, and order accuracy are the responsibility of the vendor.</li>
            <li>You must provide accurate delivery details and be available to receive your order.</li>
            <li>If there is an issue (e.g. wrong item, poor quality), you should contact the vendor directly.</li>
            <li>The app does not guarantee compensation or replacements for incorrect or unsatisfactory orders.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>4. Refund Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Policies regarding refunds and cancellations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The University Companion App acts as a platform and does not directly process payments or refunds.</li>
            <li>Refunds for food orders or marketplace items are managed solely by the vendor or seller.</li>
            <li>If you have an issue with a product or order, contact the vendor through the app.</li>
            <li>We may assist in facilitating communication between users and vendors when possible, but we are not liable for refund decisions.</li>
            <li>Always check vendor return/refund terms before completing a purchase.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>5. Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">How we handle and protect your personal data:</p>
          <p className="mb-4">
            We collect and use your personal data to deliver services and improve your experience. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Your name, email, and university info during registration</li>
            <li>Usage data, such as your orders and interactions</li>
            <li>Securely processed payment information (via third-party gateway)</li>
            <li>Optional camera access for ID verification and marketplace uploads</li>
          </ul>
          <p>
            We use this information to operate, personalize, and enhance your experience. We do not sell your data. You can access, update, or delete your data at any time.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detailed Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This Privacy Policy outlines how University Companion App (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, stores, and protects the personal information of its users (&quot;you&quot;).
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-4">Information Collection</h3>
          
          <h4 className="font-semibold mb-2">Personal Information</h4>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Account Registration: We collect information such as your name, email address, and university affiliation when you create an account.</li>
            <li>Usage Data: Information on how you use the app, such as your search queries, orders, and interactions with other users.</li>
          </ul>

          <h4 className="font-semibold mb-2">Sensitive Information</h4>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Payment Information: If you make purchases within the app, we collect transaction-related information, including your payment card details and billing address, which are processed by our secure payment gateway provider.</li>
            <li>Camera Access: We may request access to your device&#39;s camera to facilitate ID verification for account security and to allow you to upload photos directly when adding products to the marketplace.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-4">Use of Information</h3>
          <p className="mb-4">The information we collect is used to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Provide and manage the services you request.</li>
            <li>Enhance and personalize your app experience.</li>
            <li>Communicate with you about updates, services, and promotional offers.</li>
            <li>Conduct analysis and research to improve the app.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-4">Data Sharing and Disclosure</h3>
          
          <h4 className="font-semibold mb-2">Third-Party Service Providers</h4>
          <p className="mb-4">
            We may share your information with third-party vendors who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.
          </p>

          <h4 className="font-semibold mb-2">Legal Requirements</h4>
          <p className="mb-4">
            We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-4">Data Security</h3>
          <p className="mb-4">
            We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information. These include using encryption for data transmission and ensuring that any third parties we work with uphold the same standards of data protection.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-4">User Rights</h3>
          <p className="mb-4">
            You have the right to access, update, or delete the personal information we hold about you. You can also object to the processing of your personal data, request a restriction on processing, and request data portability where applicable.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-4">Changes to This Privacy Policy</h3>
          <p className="mb-4">
            We reserve the right to update or change our Privacy Policy at any time. Changes to the policy will be effective immediately upon being posted on this page. We encourage you to periodically review this Privacy Policy to stay informed of updates.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-4">Contact Us</h3>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <p>
            Email: <a href="mailto:info@venoratech.com" className="text-blue-600 hover:underline">info@venoratech.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 