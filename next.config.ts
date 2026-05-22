import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@base-ui/react",
      "@tiptap/extension-character-count",
      "@tiptap/extension-highlight",
      "@tiptap/extension-image",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-text-align",
      "@tiptap/extension-typography",
      "@tiptap/extension-underline",
      "@tiptap/pm",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "lucide-react",
    ],
  },
};

export default nextConfig;
