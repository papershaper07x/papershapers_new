import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid reusing stale PostCSS output between local/hosted production builds.
  experimental: { turbopackFileSystemCacheForBuild: false },
  async headers() {
    const privateHeaders=[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}];
    return [
      {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self)'}]},
      ...(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production'?[{source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]:[]),
      ...['/auth','/api/:path*','/noticeboard/dashboard','/noticeboard/post','/noticeboard/report','/papershapers/dashboard','/papershapers/papers/:path*','/papershapers/tests/:path*','/papershapers/for-teachers/rooms/:path*','/papershapers/room/:path*','/papershapers/journal/new'].map(source=>({source,headers:privateHeaders})),
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/api/billing/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/downloads/:file.apk", headers: [
        { key: "Content-Type", value: "application/vnd.android.package-archive" },
        { key: "Content-Disposition", value: "attachment" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ] },
      { source: "/downloads/android-release.json", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
