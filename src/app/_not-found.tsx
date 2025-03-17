import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}