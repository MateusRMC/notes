import "./styles.scss";
import { ThemeProvider } from "./lib/themeProvider";
import { iosStartupImages } from "./ios-startup-image";

export const metadata = {
  title: "Simple Notes - Write and nothing more.",
  description: "Write and nothing more.",
  applicationName: "Simple Notes",

  icons: {
    icon: "/icons/favicon-196.png",
    apple: "/icons/apple-icon-180.png",
  },

  appleWebApp: {
    capable: true,
    title: "Simple Notes",
    statusBarStyle: "default",
    startupImage: iosStartupImages,
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Simple Notes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="main">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
