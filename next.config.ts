import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['shelly-nonloxodromical-unpermanently.ngrok-free.dev'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
