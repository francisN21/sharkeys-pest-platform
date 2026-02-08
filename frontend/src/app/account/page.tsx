"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import AccountPage from "../account/profile/page";
import Bookingspage from "../account/bookings/page";
import { me, logout as apiLogout, type MeResponse } from "../../lib/api/auth";

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
                {/* Tabs */}
                <div className="flex gap-3 mb-8">
                    <TabButton
                    label="Page 1"
                    active={activeSection === "one"}
                    onClick={() => setActiveSection("one")}
                    />
                    <TabButton
                    label="Page 2"
                    active={activeSection === "two"}
                    onClick={() => setActiveSection("two")}
                    />
                    <TabButton
                    label="Page 3"
                    active={activeSection === "three"}
                    onClick={() => setActiveSection("three")}
                    />
                </div>

                {/* Render modular "pages" */}
                <div className="w-full max-w-3xl bg-white rounded-xl shadow p-6">
                    {activeSection === "one" && <AccountPage />}
                    {activeSection === "two" && <Bookingspage />}
                </div>
            </section>
    </main>
  );
}

/** reusable tab button */
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition
        ${active ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-100"}
      `}
    >
      {label}
    </button>
  );
}