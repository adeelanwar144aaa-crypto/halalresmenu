import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getApexOrigin } from "@/lib/sitemap-data";

export const runtime = "edge";

const canonical = `${getApexOrigin()}/about`;

export const metadata: Metadata = {
  title: "About Us | HalalResMenu",
  description:
    "Learn about HalalResMenu — your trusted guide to discovering halal restaurants, menus, and dining information across the UK.",
  alternates: { canonical },
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About HalalResMenu"
      description="Your trusted destination for discovering halal restaurants, exploring menus, and finding the information you need before your next meal."
    >
      <section>
        <p>
          Welcome to HalalResMenu, your trusted destination for discovering halal
          restaurants, exploring restaurant menus, checking halal dining options,
          and finding the information you need before your next meal.
        </p>
        <p>
          Whether you&apos;re searching for a local halal restaurant, planning a
          family dinner, looking for a takeaway menu, or exploring new places to
          eat while traveling, HalalResMenu is designed to make finding reliable
          restaurant information simple and convenient.
        </p>
        <p>
          Our goal is to help people make informed dining decisions by bringing
          restaurant menus, opening hours, contact information, locations,
          facilities, and halal-related details together in one easy-to-use
          platform.
        </p>
      </section>

      <section>
        <h2>Our Mission</h2>
        <p>
          At HalalResMenu, our mission is to make halal dining more accessible by
          providing a comprehensive restaurant directory that helps people
          discover restaurants with confidence.
        </p>
        <p>
          Finding halal food should not be difficult. We believe everyone deserves
          quick access to accurate restaurant information, whether they&apos;re
          searching for:
        </p>
        <ul>
          <li>Halal restaurants near them</li>
          <li>Restaurant menus</li>
          <li>Opening hours</li>
          <li>Restaurant locations</li>
          <li>Contact details</li>
          <li>Delivery and takeaway options</li>
          <li>Family-friendly restaurants</li>
          <li>Prayer facilities (where available)</li>
          <li>Customer ratings and dining information</li>
        </ul>
        <p>
          By organizing restaurant information in one place, we aim to save users
          time while helping restaurants reach more customers.
        </p>
      </section>

      <section>
        <h2>What We Offer</h2>
        <p>HalalResMenu is more than just a restaurant directory.</p>
        <p>
          We provide useful information to help visitors compare restaurants
          before deciding where to eat.
        </p>
        <p>Our listings may include:</p>
        <ul>
          <li>Restaurant menus</li>
          <li>Halal dining information</li>
          <li>Restaurant addresses</li>
          <li>Phone numbers</li>
          <li>Business hours</li>
          <li>Cuisine types</li>
          <li>Food categories</li>
          <li>Delivery availability</li>
          <li>Takeaway services</li>
          <li>Reservation information</li>
          <li>Maps and directions</li>
          <li>Website and social media links</li>
          <li>Restaurant photos</li>
          <li>Pricing information (where available)</li>
          <li>Accessibility features</li>
          <li>Family dining information</li>
        </ul>
        <p>
          Our goal is to present restaurant details in a clear, organized format
          so users can quickly find the information they need.
        </p>
      </section>

      <section>
        <h2>Helping You Discover Halal Restaurants</h2>
        <p>
          Whether you&apos;re craving burgers, Pakistani food, Indian cuisine,
          Turkish kebabs, Middle Eastern dishes, pizza, seafood, desserts, or
          international cuisine, HalalResMenu helps you explore a wide variety of
          halal dining options.
        </p>
        <p>
          Our directory includes restaurants across different cities and regions,
          making it easier to discover both popular establishments and hidden
          local favorites.
        </p>
        <p>
          From casual cafés to fine dining restaurants, we aim to showcase a
          diverse range of halal food experiences for every occasion.
        </p>
      </section>

      <section>
        <h2>Restaurant Menus Made Easy</h2>
        <p>
          One of the most valuable features of HalalResMenu is providing easy
          access to restaurant menus whenever possible.
        </p>
        <p>Before visiting a restaurant, many diners want to know:</p>
        <ul>
          <li>What food is available</li>
          <li>Menu prices</li>
          <li>Signature dishes</li>
          <li>Vegetarian options</li>
          <li>Kids&apos; meals</li>
          <li>Beverage selections</li>
          <li>Dessert choices</li>
          <li>Meal combinations</li>
        </ul>
        <p>
          Our platform helps users browse available menu information so they can
          decide where to eat before leaving home.
        </p>
        <p>
          Please note that menus and prices may change over time. We always
          recommend confirming the latest menu and pricing directly with the
          restaurant.
        </p>
      </section>

      <section>
        <h2>Our Commitment to Accurate Information</h2>
        <p>
          We work hard to provide useful and up-to-date restaurant information.
        </p>
        <p>Restaurant details may be collected from:</p>
        <ul>
          <li>Official restaurant websites</li>
          <li>Restaurant owners</li>
          <li>Public business listings</li>
          <li>Publicly available information</li>
          <li>Customer submissions</li>
          <li>Business directories</li>
          <li>Social media pages</li>
        </ul>
        <p>
          Although we make every reasonable effort to keep our listings current,
          restaurant information can change without notice.
        </p>
        <p>
          Opening hours, menus, prices, halal certifications, facilities, and
          services may change over time. We encourage visitors to verify
          important details directly with the restaurant before visiting.
        </p>
      </section>

      <section>
        <h2>Supporting Restaurant Owners</h2>
        <p>
          We believe accurate information benefits both diners and restaurant
          owners.
        </p>
        <p>Restaurant owners are welcome to contact us if they would like to:</p>
        <ul>
          <li>Update restaurant information</li>
          <li>Correct inaccurate details</li>
          <li>Add new menu items</li>
          <li>Update opening hours</li>
          <li>Change contact information</li>
          <li>Add new restaurant photos</li>
          <li>Claim their restaurant listing</li>
        </ul>
        <p>
          Keeping restaurant listings accurate helps improve the experience for
          everyone.
        </p>
      </section>

      <section>
        <h2>Why Choose HalalResMenu?</h2>
        <p>
          We understand that choosing where to eat involves more than simply
          finding the nearest restaurant.
        </p>
        <p>
          Our platform is built to help users compare restaurants using practical
          information, including:
        </p>
        <ul>
          <li>Menu availability</li>
          <li>Cuisine type</li>
          <li>Restaurant location</li>
          <li>Dining options</li>
          <li>Delivery services</li>
          <li>Takeaway availability</li>
          <li>Family suitability</li>
          <li>Restaurant facilities</li>
          <li>Contact information</li>
        </ul>
        <p>
          Our aim is to make restaurant discovery faster, easier, and more
          reliable.
        </p>
      </section>

      <section>
        <h2>Built for Food Lovers and Travelers</h2>
        <p>
          Whether you&apos;re a local resident looking for your next favorite
          restaurant or a traveler searching for halal food in an unfamiliar city,
          HalalResMenu helps simplify your search.
        </p>
        <p>
          We understand that finding halal restaurants while traveling can
          sometimes be challenging. That&apos;s why we continue expanding our
          directory to include more restaurants, menus, and useful dining
          information across different locations.
        </p>
      </section>

      <section>
        <h2>Our Vision</h2>
        <p>
          Our long-term vision is to become one of the most trusted online
          resources for halal restaurant information.
        </p>
        <p>
          We continue working to expand our restaurant database, improve listing
          quality, and provide helpful information that connects diners with
          restaurants serving halal food.
        </p>
        <p>
          As our platform grows, we remain committed to accuracy, transparency,
          and creating a better experience for everyone searching for halal
          dining options.
        </p>
      </section>

      <section>
        <h2>Get in Touch</h2>
        <p>
          We value feedback from our visitors, restaurant owners, and community
          members.
        </p>
        <p>
          If you notice incorrect restaurant information, have suggestions for
          improving our website, or would like to update a restaurant listing,
          we&apos;d love to hear from you.
        </p>
        <p>
          Together, we can help build a more complete and reliable resource for
          discovering halal restaurants, exploring restaurant menus, and making
          dining decisions with confidence.
        </p>
        <p>
          Thank you for choosing HalalResMenu. We look forward to helping you
          discover your next great halal dining experience.
        </p>
        <p>
          <Link href="/contact">Contact us</Link> or email{" "}
          <a href="mailto:support@halalresmenu.com">support@halalresmenu.com</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
