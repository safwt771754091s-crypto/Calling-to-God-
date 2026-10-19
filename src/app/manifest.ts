import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "TruePath",
    description:
      "A multi-lingual platform introducing Islam, the Quran, the Sunnah and the Prophet's biography.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f5f2e9",
    theme_color: "#0d5c46",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
