import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/privacy`;

export const metadata: Metadata = {
  title: "Privacy Policy | HalalResMenu",
  description:
    "HalalResMenu privacy policy — how we collect, use, share, and protect your information.",
  alternates: { canonical },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="Effective Date: July 11, 2026. This policy explains what information we collect, how we use it, when we share it, and the choices you have when using HalalResMenu."
    >
      <section>
        <p>
          Welcome to HalalResMenu (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
          &ldquo;us&rdquo;). Your privacy is important to us. This Privacy Policy
          explains what information we collect, how we use it, when we share it,
          and the choices you have regarding your personal information when using{" "}
          <a href="https://halalresmenu.com">https://halalresmenu.com</a>.
        </p>
        <p>
          By accessing or using our website, you agree to the practices described
          in this Privacy Policy.
        </p>
      </section>

      <section>
        <h2>1. Information We Collect</h2>
        <p>We may collect the following types of information:</p>

        <h3>Information You Provide</h3>
        <p>You may voluntarily provide information when you:</p>
        <ul>
          <li>Contact us via email or contact forms</li>
          <li>Submit restaurant updates or corrections</li>
          <li>Report inaccurate information</li>
          <li>Claim a restaurant listing</li>
          <li>Subscribe to newsletters or updates</li>
        </ul>
        <p>This information may include:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Business information</li>
          <li>Restaurant details</li>
          <li>Any information you choose to provide</li>
        </ul>

        <h3>Information Collected Automatically</h3>
        <p>
          When you visit our website, certain information may be collected
          automatically, including:
        </p>
        <ul>
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device information</li>
          <li>Operating system</li>
          <li>Pages visited</li>
          <li>Date and time of your visit</li>
          <li>Referring website</li>
          <li>Time spent on pages</li>
          <li>Click activity</li>
        </ul>
        <p>
          This information helps us improve our website and user experience.
        </p>

        <h3>Cookies and Similar Technologies</h3>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Remember user preferences</li>
          <li>Improve website performance</li>
          <li>Measure website traffic</li>
          <li>Understand visitor behavior</li>
          <li>Personalize content where appropriate</li>
        </ul>
        <p>
          You can disable cookies through your browser settings. Some features of
          the website may not function properly if cookies are disabled.
        </p>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Operate and maintain our website</li>
          <li>Improve user experience</li>
          <li>Respond to enquiries</li>
          <li>Verify restaurant information</li>
          <li>Process listing updates</li>
          <li>Prevent fraud and abuse</li>
          <li>Analyze website performance</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>3. Restaurant Information</h2>
        <p>
          Restaurant information displayed on HalalResMenu is gathered from
          publicly available sources, restaurant websites, business owners,
          official directories, and user submissions.
        </p>
        <p>
          Although we strive for accuracy, restaurant information&mdash;including
          halal status, certification, menus, opening hours, pricing, and
          facilities&mdash;may change without notice.
        </p>
        <p>
          Users should always contact the restaurant directly to confirm important
          details before visiting.
        </p>
      </section>

      <section>
        <h2>4. Analytics</h2>
        <p>
          We may use analytics services to better understand how visitors use our
          website.
        </p>
        <p>These services may collect anonymous information such as:</p>
        <ul>
          <li>Pages viewed</li>
          <li>Traffic sources</li>
          <li>Device type</li>
          <li>Geographic region</li>
          <li>User interactions</li>
        </ul>
        <p>Analytics data is used only to improve our services.</p>
      </section>

      <section>
        <h2>5. Advertising</h2>
        <p>
          We may display advertisements through third-party advertising partners,
          including Google AdSense or similar advertising platforms.
        </p>
        <p>
          These providers may use cookies or similar technologies to deliver
          relevant advertisements based on your browsing activity.
        </p>
        <p>
          You can learn more about Google&apos;s advertising practices and manage
          your ad preferences through your Google Account.
        </p>
      </section>

      <section>
        <h2>6. Third-Party Links</h2>
        <p>Our website may contain links to third-party websites, including:</p>
        <ul>
          <li>Restaurant websites</li>
          <li>Delivery services</li>
          <li>Social media platforms</li>
          <li>Mapping services</li>
          <li>Reservation platforms</li>
        </ul>
        <p>
          We are not responsible for the privacy practices or content of external
          websites. We encourage users to review the privacy policies of any
          third-party websites they visit.
        </p>
      </section>

      <section>
        <h2>7. Data Sharing</h2>
        <p>We may share information only when necessary:</p>
        <ul>
          <li>With service providers who help operate our website</li>
          <li>To comply with legal obligations</li>
          <li>To protect our legal rights</li>
          <li>To investigate fraud or misuse</li>
          <li>During a business transfer such as a merger or acquisition</li>
        </ul>
        <p>We never sell personal information to third parties.</p>
      </section>

      <section>
        <h2>8. Data Security</h2>
        <p>
          We implement reasonable technical and organizational measures to protect
          your information from unauthorized access, misuse, alteration, or
          disclosure.
        </p>
        <p>
          However, no internet transmission or electronic storage system is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Data Retention</h2>
        <p>We retain personal information only for as long as necessary to:</p>
        <ul>
          <li>Provide our services</li>
          <li>Respond to enquiries</li>
          <li>Meet legal requirements</li>
          <li>Resolve disputes</li>
          <li>Enforce our policies</li>
        </ul>
        <p>
          When information is no longer required, it is securely deleted or
          anonymized where appropriate.
        </p>
      </section>

      <section>
        <h2>10. Your Rights</h2>
        <p>Depending on your location, you may have rights including:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Restrict processing</li>
          <li>Object to certain processing activities</li>
          <li>Request a copy of your information</li>
          <li>Withdraw consent where applicable</li>
        </ul>
        <p>To exercise these rights, please contact us.</p>
      </section>

      <section>
        <h2>11. Children&apos;s Privacy</h2>
        <p>HalalResMenu is not intended for children under the age of 13.</p>
        <p>
          We do not knowingly collect personal information from children. If we
          become aware that a child has provided personal information, we will
          promptly remove it.
        </p>
      </section>

      <section>
        <h2>12. International Users</h2>
        <p>
          If you access our website from outside the United Kingdom, your
          information may be transferred and processed in countries where our
          service providers operate.
        </p>
        <p>
          By using our website, you consent to such transfers where permitted by
          applicable law.
        </p>
      </section>

      <section>
        <h2>13. GDPR Compliance</h2>
        <p>
          If you are located in the United Kingdom or the European Economic Area
          (EEA), we process personal information in accordance with applicable
          data protection laws, including the UK GDPR and EU GDPR where applicable.
        </p>
        <p>Where required, we rely on lawful bases such as:</p>
        <ul>
          <li>Your consent</li>
          <li>Legitimate interests</li>
          <li>Contractual necessity</li>
          <li>Legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>14. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>
          Any changes will be posted on this page along with the updated effective
          date.
        </p>
        <p>
          Your continued use of the website after changes are posted constitutes
          acceptance of the revised Privacy Policy.
        </p>
      </section>

      <section>
        <h2>15. Contact Us</h2>
        <p>
          If you have any questions regarding this Privacy Policy or wish to
          exercise your privacy rights, please contact us.
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
          We will respond to privacy-related requests as soon as reasonably
          possible.
        </p>
      </section>
    </LegalPageShell>
  );
}
