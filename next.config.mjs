/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/portfolio", destination: "/realisations", permanent: true },
      { source: "/content-experience", destination: "/services", permanent: true },
      { source: "/v2", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
