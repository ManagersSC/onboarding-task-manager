/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: false,
    },
    // Ensure docs-content/ is bundled into the serverless function for Vercel deployments
    outputFileTracingIncludes: {
      '/docs': ['./docs-content/**/*'],
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
        // VULN-M1: Global security headers
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' https://v5.airtableusercontent.com https://dl.airtable.com data:; frame-ancestors 'none';" },
          ],
        },
        // CORS headers for API routes
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: allowedOrigin },
            { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type, X-Requested-With" },
          ],
        },
      ]
    },
  }
  
  export default nextConfig
  
  