import "../styles/globals.css";

export const metadata = {
  title: "OncoLens",
  description: "Cancer screening triage and clinician-patient collaboration prototype"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
