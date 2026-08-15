"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { useFacilitiesHub } from "@/modules/principal/api/facilities";

interface HubCard {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
}

export default function PrincipalFacilitiesHubPage() {
  const hub = useFacilitiesHub();
  const data = hub.data;

  const cards: HubCard[] = data
    ? [
        {
          href: "/principal/facilities/classrooms",
          icon: "meeting_room",
          title: "Classrooms",
          subtitle: data.classrooms.tracked
            ? `${data.classrooms.rooms_count} rooms across ${data.classrooms.blocks_count} blocks`
            : "Not tracked in this system yet",
        },
        {
          href: "/principal/facilities/laboratories",
          icon: "science",
          title: "Laboratories",
          subtitle: data.laboratories.tracked ? `${data.laboratories.labs_count} labs · department in-charge listed` : "Not tracked in this system yet",
        },
        {
          href: "/principal/facilities/medical",
          icon: "medical_services",
          title: "Medical centre",
          subtitle: `${data.medical.equipment_total_quantity} equipment items · sick room and ambulance`,
        },
        {
          href: "/principal/facilities/sports",
          icon: "sports_soccer",
          title: "Sports",
          subtitle: `${data.sports.disciplines_count} disciplines · ground, court and gym`,
        },
        {
          href: "/principal/facilities/library",
          icon: "menu_book",
          title: "Library",
          subtitle: `${data.library.distinct_titles} titles · borrow status live`,
        },
        {
          href: "/principal/facilities/venue-bookings",
          icon: "event_available",
          title: "Venue booked",
          subtitle: `${data.venue_bookings.this_month_count} bookings this month`,
        },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Campus &amp; facilities
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Classrooms, laboratories, library and venue bookings · hostel and transport now sit under Institution
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hub.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border p-5"
                style={{ background: principalColors.bg, borderColor: principalColors.border }}
              >
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-3.5 w-36" />
                </div>
              </div>
            ))
          : cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="flex items-center gap-4 rounded-2xl border p-5 transition-transform hover:-translate-y-0.5"
                style={{ background: principalColors.bg, borderColor: principalColors.border }}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                  <Icon name={card.icon} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold" style={{ color: principalColors.heading }}>
                    {card.title}
                  </div>
                  <div className="mt-0.5 truncate text-[13px]" style={{ color: principalColors.textFaint }}>
                    {card.subtitle}
                  </div>
                </div>
                <Icon name="chevron_right" size={20} style={{ color: principalColors.primary }} />
              </Link>
            ))}
      </div>
    </div>
  );
}
