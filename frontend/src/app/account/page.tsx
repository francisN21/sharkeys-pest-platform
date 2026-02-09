"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import AccountPage from "../account/profile/page";
import BookingsPage from "../account/bookings/page";
import { me, type MeResponse } from "../../lib/api/auth";

type Section = "one" | "two" | "three";

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<Section>("one");

  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await me();
        if (!alive) return;

        if (!res?.ok || !res.user) {
          setErr("Not authenticated");
          router.replace("/login");
          return;
        }

        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Not logged in";
        setErr(msg);
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {/* Button group tabs */}
        <div className="inline-flex rounded-lg shadow-sm -space-x-px" role="group">
          <TabButton
            label="Account"
            active={activeSection === "one"}
            position="first"
            onClick={() => setActiveSection("one")}
          />
          <TabButton
            label="Bookings"
            active={activeSection === "two"}
            position="middle"
            onClick={() => setActiveSection("two")}
          />
          <TabButton
            label="Template"
            active={activeSection === "three"}
            position="last"
            onClick={() => setActiveSection("three")}
          />
        </div>

        {/* Render modular "pages" */}
        <div className="w-full max-w-3xl bg-white rounded-xl shadow p-6">
          {activeSection === "one" && <AccountPage />}
          {activeSection === "two" && <BookingsPage />}
          {activeSection === "three" && (
            <div>
              <h2 className="text-xl font-bold mb-2">Template</h2>
              <p className="text-gray-600">Replace this with your third page/component.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/** reusable tab button (button-group style) */
function TabButton({
  label,
  active,
  position,
  onClick,
}: {
  label: string;
  active: boolean;
  position: "first" | "middle" | "last";
  onClick: () => void;
}) {
  const rounded =
    position === "first" ? "rounded-l-lg" : position === "last" ? "rounded-r-lg" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 text-sm font-medium leading-5 border focus:outline-none focus:ring-2 focus:ring-blue-500",
        rounded,
        active
          ? "bg-blue-600 text-white border-blue-600 z-10"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}