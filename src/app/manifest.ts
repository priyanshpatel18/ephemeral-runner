import type { MetadataRoute } from "next";

const { appName, description } = {
  appName: "Ephemeral Runner",
  description:
    "A lightweight 2D tile-based movement demo powered by MagicBlock’s ephemeral rollup—supercharged on-chain gameplay with real-time responsiveness. ",
};

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: description,
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}