"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import FullCalendar from "@fullcalendar/react";

type AvailabilityHall = {
  id: string;
  name: string;
  bookings: Array<{
    id: string;
    startTime: string;
    endTime: string;
    purpose: string | null;
    user: { name: string | null; email: string | null };
  }>;
};

type Props = {
  halls: AvailabilityHall[];
};

export function HallAvailabilityCalendar({ halls }: Props) {
  const events = halls.flatMap((hall) =>
    hall.bookings.map((booking) => ({
      id: booking.id,
      title: `${hall.name}${booking.purpose ? ` - ${booking.purpose}` : ""}`,
      start: booking.startTime,
      end: booking.endTime,
      allDay: false,
    }))
  );

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 custom-calendar-wrapper">
      <div className="min-w-[800px]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
          }}
          height="auto"
          events={events}
          nowIndicator
        />
      </div>
    </div>
  );
}
