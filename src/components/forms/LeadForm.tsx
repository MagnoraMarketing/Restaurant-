"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";

export function LeadForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  return status === "done" ? (
    <div className="card grid place-items-center p-10 text-center">
      <p className="text-5xl">🎉</p>
      <p className="h-display mt-4 text-2xl">Tak! Vi kontakter dig inden for 1 hverdag.</p>
    </div>
  ) : (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await api("/api/leads", { method: "POST", body: JSON.stringify(data) });
          setStatus("done");
        } catch (err) {
          setError((err as Error).message);
          setStatus("error");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Navn</span>
          <input name="name" required minLength={2} className="input" autoComplete="name" />
        </label>
        <label>
          <span className="label">Restaurant</span>
          <input name="restaurant" required className="input" autoComplete="organization" />
        </label>
        <label>
          <span className="label">E-mail</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label>
          <span className="label">Telefon</span>
          <input name="phone" type="tel" className="input" autoComplete="tel" />
        </label>
      </div>
      <label>
        <span className="label">Type</span>
        <select name="type" className="input">
          <option>Pizzeria</option>
          <option>Restaurant</option>
          <option>Burger & Fastfood</option>
          <option>Sushi & Takeaway</option>
          <option>Café</option>
          <option>Andet</option>
        </select>
      </label>
      <label>
        <span className="label">Hvad vil du gerne se?</span>
        <textarea name="message" rows={3} className="input" placeholder="Fx telefon-AI, bordbooking eller integration til vores POS" />
      </label>
      {status === "error" && <p className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sender…" : "Book demo"}
      </button>
    </form>
  );
}
