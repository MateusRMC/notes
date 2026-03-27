import "./styles.scss";

export const metadata = {
  title: "Welcome to notes",
  description: "Made by Mat in his lab",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="main">
          <h1 className="header">Notes for Life</h1>
          {children}
        </div>
      </body>
    </html>
  );
}
