/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: false,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'v5.airtableusercontent.com',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'dl.airtable.com',
          port: '',
          pathname: '/**',
        },
      ],
    },
    async headers() {
      const allowedOrigin = process.env.APP_BASE_URL || "https://onboarding.smilecliniq.com"
      return [
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: allowedOrigin },
            { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          ],
        },
      ]
    },
  }
  
  export default nextConfig
  
  