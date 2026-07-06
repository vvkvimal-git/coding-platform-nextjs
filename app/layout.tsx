
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Bluebirds Solutions — Assessment infrastructure for modern institutions",
    template: "%s — Bluebirds Solutions",
  },
  description:
    "Premium online assessment and quiz management for universities, colleges, and recruitment teams.",
  authors: [{ name: "Bluebirds Solutions" }],
  openGraph: {
    title: "Bluebirds Solutions — Assessment infrastructure for modern institutions",
    description:
      "Premium online assessment and quiz management for universities, colleges, and recruitment teams.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Fira+Code:wght@400;500;700&family=Source+Code+Pro:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
        />
        {/* Theme init script: prevents flash of light mode on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('axiom-theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
