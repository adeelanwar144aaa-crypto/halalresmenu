import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/contact`;

export const metadata: Metadata = {
  title: "Contact Us | HalalResMenu",
  description:
    "Get in touch with HalalResMenu — questions, corrections, restaurant claims, and general enquiries.",
  alternates: { canonical },
};

export default function ContactPage() {
  return (
    <LegalPageShell
      title="Contact us"
      description="Questions about a listing, a correction, or working with HalalResMenu? Send us a message."
    >
      <ContactForm />
    </LegalPageShell>
  );
}
