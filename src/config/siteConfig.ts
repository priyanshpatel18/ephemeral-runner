import { Metadata } from "next";

const { title, description, ogImage, baseURL, appName } = {
  title: "Ephemeral Runner",
  description: "A lightweight 2D tile-based movement demo powered by MagicBlock’s ephemeral rollup—supercharged on-chain gameplay with real-time responsiveness.",
  baseURL: "https://ephemeral-runner.priyanshpatel.com",
  ogImage: "https://ephemeral-runner.priyanshpatel.com/open-graph.png",
  appName: "Ephemeral Runner",
};

export const siteConfig: Metadata = {
  title,
  description,
  metadataBase: new URL(baseURL),
  openGraph: {
    title,
    description,
    images: [ogImage],
    url: baseURL,
    type: "website",
    siteName: appName,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ogImage,
    creator: "@priyansh_ptl18",
  },
  icons: {
    icon: [
      { rel: "icon", type: "image/x-icon", url: "/favicon.ico" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "48x48",
        url: "/favicon-48x48.png",
      },
      { rel: "icon", type: "image/svg+xml", url: "/favicon.svg" },
    ],
    apple: "/apple-touch-icon.png",
  },
  applicationName: appName,
  alternates: {
    canonical: baseURL,
  },
  keywords: [
    "tile-based",
    "2D game",
    "ephemeral rollup",
    "MagicBlock",
    "Solana",
    "real-time gameplay",
  ],
};
