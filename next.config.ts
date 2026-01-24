/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3001", "localhost:3000"]
        }
    }
};

export default nextConfig;