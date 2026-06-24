import type { Metadata } from "next";
import {
  LegalPageShell,
  PlaceholderLegalText,
} from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/privacy`;

export const metadata: Metadata = {
  title: "Privacy Policy | HalalResMenu",
  description: "HalalResMenu privacy policy — how we collect, use, and protect information.",
  alternates: { canonical },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This policy describes how HalalResMenu handles personal and usage information. Full legal text is pending review."
    >
      <section>
        <h2>Information We Collect</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>How We Use Information</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Third-Party Data Sources</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Cookies</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Your Rights</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Contact for Privacy Concerns</h2>
        <PlaceholderLegalText />
      </section>
    </LegalPageShell>
  );
}
