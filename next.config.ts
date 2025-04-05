import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'res.cloudinary.com',
      'oycsktwubyhwamssuohp.supabase.co',
      'placehold.co'  // Added this line

    ],
  },
};

export default nextConfig;