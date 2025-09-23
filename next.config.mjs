/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // Avoid ESLint build failures on Vercel due to legacy CLI options
      ignoreDuringBuilds: true,
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
      return [
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          ],
        },
      ]
    },
  }
  
  export default nextConfig
  
  