import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/terms-conditions`;

export const metadata: Metadata = {
  title: "Terms and Conditions | HalalResMenu",
  description:
    "Terms and conditions for using HalalResMenu — your rights, responsibilities, and our policies.",
  alternates: { canonical },
};

export default function TermsConditionsPage() {
  return (
    <LegalPageShell
      title="Terms and Conditions"
      description="Effective Date: July 11, 2026. These Terms govern your access to and use of HalalResMenu."
    >
      <section>
        <p>
          Welcome to HalalResMenu (&ldquo;we,&rdquo; &ldquo;our,&rdquo;
          &ldquo;us,&rdquo; or the &ldquo;Website&rdquo;). These Terms and
          Conditions (&ldquo;Terms&rdquo;) govern your access to and use of{" "}
          <a href="https://halalresmenu.com">https://halalresmenu.com</a>.
        </p>
        <p>
          By accessing or using our Website, you agree to be bound by these
          Terms. If you do not agree with any part of these Terms, please do
          not use the Website.
        </p>
      </section>

      <section>
        <h2>1. About HalalResMenu</h2>
        <p>
          HalalResMenu is an online directory designed to help users discover
          halal restaurants, browse menus, view restaurant information, and
          access other dining-related content. We provide informational content
          gathered from publicly available sources, restaurant owners, official
          business listings, and user submissions.
        </p>
        <p>
          We do not own, operate, manage, or control the restaurants listed on
          our Website unless explicitly stated.
        </p>
      </section>

      <section>
        <h2>2. Acceptance of Terms</h2>
        <p>By using this Website, you confirm that you:</p>
        <ul>
          <li>Are at least 13 years of age.</li>
          <li>Will use the Website only for lawful purposes.</li>
          <li>Will not misuse or interfere with the operation of the Website.</li>
          <li>Agree to comply with all applicable laws and regulations.</li>
        </ul>
      </section>

      <section>
        <h2>3. Accuracy of Information</h2>
        <p>
          We strive to keep all restaurant information accurate and up to date.
          However, we cannot guarantee that all information is complete,
          current, or error-free.
        </p>
        <p>Restaurant details may change at any time, including:</p>
        <ul>
          <li>Halal status</li>
          <li>Menus</li>
          <li>Prices</li>
          <li>Opening hours</li>
          <li>Contact information</li>
          <li>Delivery services</li>
          <li>Facilities</li>
          <li>Locations</li>
        </ul>
        <p>
          Users should verify important information directly with the restaurant
          before making travel or dining decisions.
        </p>
      </section>

      <section>
        <h2>4. Restaurant Listings</h2>
        <p>Restaurant listings may include information obtained from:</p>
        <ul>
          <li>Official restaurant websites</li>
          <li>Restaurant owners</li>
          <li>Public business directories</li>
          <li>User contributions</li>
          <li>Social media pages</li>
          <li>Other publicly available sources</li>
        </ul>
        <p>
          Restaurant owners may contact us to request updates, corrections, or
          ownership verification of their listings.
        </p>
      </section>

      <section>
        <h2>5. User Conduct</h2>
        <p>When using HalalResMenu, you agree not to:</p>
        <ul>
          <li>Submit false or misleading information.</li>
          <li>Attempt to gain unauthorized access to our systems.</li>
          <li>
            Use automated tools to scrape or copy large portions of our Website
            without permission.
          </li>
          <li>Upload malicious software or harmful content.</li>
          <li>Impersonate another individual or business.</li>
          <li>Violate any applicable laws or regulations.</li>
        </ul>
        <p>
          We reserve the right to restrict or terminate access to users who
          violate these Terms.
        </p>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          Unless otherwise stated, all content on HalalResMenu, including but
          not limited to:
        </p>
        <ul>
          <li>Website design</li>
          <li>Text</li>
          <li>Graphics</li>
          <li>Logos</li>
          <li>Icons</li>
          <li>Original images</li>
          <li>Databases</li>
          <li>Layout</li>
          <li>Articles</li>
        </ul>
        <p>
          is owned by or licensed to HalalResMenu and is protected by applicable
          intellectual property laws.
        </p>
        <p>You may:</p>
        <ul>
          <li>View Website content for personal, non-commercial use.</li>
          <li>Share links to our pages.</li>
        </ul>
        <p>You may not:</p>
        <ul>
          <li>Copy or reproduce substantial portions of our content.</li>
          <li>Republish articles without permission.</li>
          <li>
            Modify or distribute our original content for commercial purposes.
          </li>
          <li>Use our trademarks without written permission.</li>
        </ul>
        <p>
          Restaurant names, logos, and trademarks remain the property of their
          respective owners.
        </p>
      </section>

      <section>
        <h2>7. Third-Party Links</h2>
        <p>Our Website may include links to third-party websites, including:</p>
        <ul>
          <li>Restaurant websites</li>
          <li>Online ordering platforms</li>
          <li>Reservation services</li>
          <li>Mapping services</li>
          <li>Social media platforms</li>
        </ul>
        <p>These links are provided for convenience only.</p>
        <p>
          We do not control or endorse third-party websites and are not
          responsible for their content, availability, privacy practices, or
          services.
        </p>
      </section>

      <section>
        <h2>8. Advertisements and Affiliate Links</h2>
        <p>
          HalalResMenu may display advertisements, sponsored content, or
          affiliate links.
        </p>
        <p>
          If you click an affiliate link or make a purchase through one of these
          links, we may receive a commission at no additional cost to you.
        </p>
        <p>Sponsored content will be identified where appropriate.</p>
      </section>

      <section>
        <h2>9. User Submissions</h2>
        <p>If you submit:</p>
        <ul>
          <li>Restaurant updates</li>
          <li>Corrections</li>
          <li>Reviews (if available)</li>
          <li>Images</li>
          <li>Suggestions</li>
          <li>Business information</li>
        </ul>
        <p>
          you grant HalalResMenu a non-exclusive, worldwide, royalty-free license
          to use, publish, edit, and display that content on the Website.
        </p>
        <p>You confirm that you have the necessary rights to submit such content.</p>
        <p>
          We reserve the right to remove or edit submissions that are
          inaccurate, unlawful, offensive, or inappropriate.
        </p>
      </section>

      <section>
        <h2>10. Disclaimer</h2>
        <p>
          The information provided on HalalResMenu is for general informational
          purposes only.
        </p>
        <p>
          Although we make reasonable efforts to maintain accurate information,
          we make no warranties or representations regarding:
        </p>
        <ul>
          <li>Accuracy</li>
          <li>Reliability</li>
          <li>Availability</li>
          <li>Completeness</li>
          <li>Suitability</li>
        </ul>
        <p>Your use of the Website is entirely at your own risk.</p>
      </section>

      <section>
        <h2>11. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, HalalResMenu and its owners,
          employees, contributors, and affiliates shall not be liable for any
          direct, indirect, incidental, consequential, or special damages
          arising from:
        </p>
        <ul>
          <li>Use of the Website</li>
          <li>Reliance on Website information</li>
          <li>Restaurant experiences</li>
          <li>Temporary service interruptions</li>
          <li>Technical errors</li>
          <li>Third-party services or websites</li>
        </ul>
        <p>
          This limitation applies even if we have been advised of the
          possibility of such damages.
        </p>
      </section>

      <section>
        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless HalalResMenu, its owners,
          employees, and affiliates from any claims, damages, liabilities, costs,
          or expenses resulting from:
        </p>
        <ul>
          <li>Your use of the Website.</li>
          <li>Your violation of these Terms.</li>
          <li>Your infringement of another person&apos;s rights.</li>
          <li>Your submission of unlawful or misleading content.</li>
        </ul>
      </section>

      <section>
        <h2>13. Privacy</h2>
        <p>
          Your use of this Website is also governed by our{" "}
          <Link href="/privacy">Privacy Policy</Link>, which explains how we
          collect, use, and protect your information.
        </p>
      </section>

      <section>
        <h2>14. Changes to These Terms</h2>
        <p>We reserve the right to modify these Terms at any time.</p>
        <p>
          Updated versions will be posted on this page with a revised Effective
          Date.
        </p>
        <p>
          Your continued use of the Website after changes become effective
          constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>15. Governing Law</h2>
        <p>
          These Terms shall be governed by and interpreted in accordance with
          the laws applicable to the operation of HalalResMenu.
        </p>
        <p>
          Any disputes arising from these Terms or your use of the Website shall
          be subject to the jurisdiction of the competent courts where required
          by applicable law.
        </p>
      </section>

      <section>
        <h2>16. Contact Us</h2>
        <p>
          If you have any questions regarding these Terms and Conditions, please
          contact us.
        </p>
        <p>
          Email:{" "}
          <a href="mailto:support@halalresmenu.com">support@halalresmenu.com</a>
        </p>
        <p>
          Website:{" "}
          <a href="https://halalresmenu.com">https://halalresmenu.com</a>
        </p>
        <p>
          We aim to respond to enquiries as promptly as reasonably possible.
        </p>
      </section>
    </LegalPageShell>
  );
}
