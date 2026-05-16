import "./styles.scss";

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
  },
};

export const viewport = {
  themeColor: "#fff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="main">{children}</div>
      </body>
    </html>
  );
}
