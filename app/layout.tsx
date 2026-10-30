import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Semi_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "AutoPro", template: "%s · AutoPro" },
  description: "Detailing ve oto kuaför atölyeleri için araç kabul, hasar kaydı, atölye panosu ve kasa.",
  applicationName: "AutoPro",
};

export const viewport: Viewport = {
  themeColor: "#111317",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{ style: { background: "#22262e", border: "1px solid #2e333c", color: "#f3f4f6" } }}
        />
      </body>
    </html>
  );
}
