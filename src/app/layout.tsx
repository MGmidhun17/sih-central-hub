import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { Header, Footer } from "@/components/ui";
import "./globals.css";
import "./professional.css";
export const metadata: Metadata = {
  title: {
    default: "HackRepo — Good ideas deserve to be found",
    template: "%s | HackRepo",
  },
  description:
    "Discover student innovation. An SIH-aligned project repository with technology taxonomy tagging and teacher review.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Header />
          <div id="main-content">{children}</div>
          <Footer />
        </Provider>
      </body>
    </html>
  );
}
