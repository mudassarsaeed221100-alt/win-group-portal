import QuickLinks from "./QuickLinks";

export const metadata = {
  title: "WIN GROUP | Business Portal",
  description: "Wolf Independent National Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <QuickLinks />
      </body>
    </html>
  );
}
