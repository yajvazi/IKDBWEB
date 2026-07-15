import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://*.stripe.com; connect-src 'self' https://api.stripe.com https://q.stripe.com https://r.stripe.com https://m.stripe.network; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
