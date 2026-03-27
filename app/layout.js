import "./styles.scss";

export const metadata = {
  title: "Welcome to notes",
  description: "Made by Mat in his lab",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
