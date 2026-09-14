import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ernesto Vargas | B2B-Preisanpassungen & Kundenpreisanalyse",
  description:
    "Professionelle Web-Applikation zur Analyse, Simulation und kundenindividuellen Kommunikation von B2B-Preisanpassungen für Ernesto Vargas Corporate Fashion & Workwear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
