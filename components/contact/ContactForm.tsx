"use client";

import { useState } from "react";

const CONTACT_EMAIL = "support@halalresmenu.com";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = encodeURIComponent(
      `HalalResMenu contact from ${name || "visitor"}`
    );
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 shadow-sm outline-none ring-halal-500/20 transition focus:border-halal-400 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 shadow-sm outline-none ring-halal-500/20 transition focus:border-halal-400 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-700">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={6}
            className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 shadow-sm outline-none ring-halal-500/20 transition focus:border-halal-400 focus:ring-2"
          />
        </div>
        <button
          type="submit"
          className="inline-flex rounded-xl bg-halal-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-halal-600/20 transition hover:bg-halal-700"
        >
          Send message
        </button>
      </form>
      {submitted ? (
        <p className="mt-4 text-sm text-halal-800">
          Your email app should open with your message. If it did not, email us
          directly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      ) : null}
      <p className="mt-6 text-sm text-zinc-600">
        Prefer email? Write to{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-semibold text-halal-700 underline decoration-halal-200 underline-offset-2 hover:text-halal-900"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
