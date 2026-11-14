import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WIN GROUP | Business Portal",
  description: "Wolf Independent National Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
