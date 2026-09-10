import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/nav";
import Footer from "./components/footer";
import { getAbout } from "./projects/utils";
import { baseUrl } from "./lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every value here comes from content/_about/info.md, so a new site is correct
// the moment the artist fills that file in — there is nothing to edit in code.
export function generateMetadata(): Metadata {
  const { metadata } = getAbout();
  const description = metadata.tagline ?? `Selected work by ${metadata.name}`;
  return {
    metadataBase: new URL(baseUrl),
    title: { default: metadata.name, template: `%s — ${metadata.name}` },
    description,
    openGraph: {
      type: "website",
      siteName: metadata.name,
      title: metadata.name,
      description,
      url: baseUrl,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-auto min-w-0 mt-6 flex flex-col px-4 md:px-0 max-w-7xl mx-auto w-full">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
