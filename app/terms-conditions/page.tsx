import type { Metadata } from "next";
import {
  LegalPageShell,
  PlaceholderLegalText,
} from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/terms-conditions`;

export const metadata: Metadata = {
  title: "Terms and Conditions | HalalResMenu",
  description: "Terms and conditions for using HalalResMenu.",
  alternates: { canonical },
};

export default function TermsConditionsPage() {
  return (
    <LegalPageShell
      title="Terms and Conditions"
      description="By using HalalResMenu you agree to these terms. Full legal text is pending review."
    >
      <section>
        <h2>Acceptance of Terms</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Use of Site</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Accuracy of Information</h2>
        <p>
          Restaurant halal status, menus, opening hours, and certification details
          may change. HalalResMenu does not guarantee that any venue is halal
          certified or suitable for your dietary requirements.
        </p>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Third-Party Links</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Limitation of Liability</h2>
        <PlaceholderLegalText />
      </section>
      <section>
        <h2>Changes to Terms</h2>
        <PlaceholderLegalText />
      </section>
    </LegalPageShell>
  );
}
