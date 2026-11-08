import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WIN GROUP | Business Portal",
  description: "Wolf Independent National Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
