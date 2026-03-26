"use client";
import { useEffect, useMemo, useState } from "react";

import { formatDateTime, toInputDateTimeValue } from "@/lib/format";
import { HallAvailabilityCalendar } from "@/components/hall-availability-calendar";

type Hall = { id: string; name: string; capacity: number | null };
type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type Booking = {
  id: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  purpose: string | null;
  numberOfParticipants: number;
  hall: Hall;
};
type AvailabilityHall = Hall & {
  bookings: Array<{
    id: string;
    startTime: string;
    endTime: string;
    purpose: string | null;
    user: { name: string | null; email: string | null };
  }>;
};

type TabId = "bookings" | "calendar";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "bookings", label: "Bookings", icon: "📋" },
  { id: "calendar", label: "Calendar", icon: "📅" },
];

export function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("bookings");
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [purposeError, setPurposeError] = useState(false);
  const [timeError, setTimeError] = useState(false);

  const [form, setForm] = useState({
    hallId: "",
    startTime: toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
    endTime: toInputDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    purpose: "",
    numberOfParticipants: 1,
  });

  async function loadAll() {
    setLoading(true);
    const [hallsRes, bookingsRes, availabilityRes] = await Promise.all([
      fetch("/api/halls"),
      fetch("/api/bookings"),
      fetch("/api/halls/availability"),
    ]);
    const hallsData = await hallsRes.json();
    const bookingsData = await bookingsRes.json();
    const availabilityData = await availabilityRes.json();
    setHalls(hallsData);
    setBookings(bookingsData);
    setAvailability(availabilityData);
    if (!form.hallId && hallsData[0]?.id) {
      setForm((prev) => ({ ...prev, hallId: hallsData[0].id }));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcomingApproved = useMemo(
    () =>
      availability.map((hall) => ({
        ...hall,
        bookings: hall.bookings.slice(0, 5),
      })),
    [availability]
  );

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimeError(false);
    setPurposeError(false);
    setMessage("");

    if (!form.purpose.trim()) {
      setPurposeError(true);
      return;
    }

    if (new Date(form.startTime) >= new Date(form.endTime)) {
      setTimeError(true);
      alert("⚠️ StartTime must be before EndTime");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        numberOfParticipants: Number(form.numberOfParticipants),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create booking");
      setSubmitting(false);
      return;
    }

    setMessage(
      data.hasConflict
        ? "Request created. Admin will see conflict warning."
        : "Booking request submitted successfully."
    );
    await loadAll();
    setSubmitting(false);
  }

  async function cancelBooking(id: string) {
    const response = await fetch(`/api/bookings/${id}`, { method: "PATCH" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to cancel booking");
      return;
    }
    setMessage("Booking cancelled.");
    await loadAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-800 font-bold">Loading dashboard…</span>
      </div>
    );
  }

  const nowMin = toInputDateTimeValue(new Date());

  return (
    <div className="grid gap-5">
      {/* Tab Navigation */}
      <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === "bookings" && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* New Booking Form */}
          <section className="w-full lg:w-1/2 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900">New Booking Request</h2>
            <p className="mt-1 text-sm text-slate-700 font-medium">
              Requests are saved as pending. Only approved bookings block slots.
            </p>
            <form onSubmit={submitBooking} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Hall
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={form.hallId}
                  onChange={(e) => setForm((prev) => ({ ...prev, hallId: e.target.value }))}
                  required
                >
                  {halls.map((hall) => (
                    <option value={hall.id} key={hall.id}>
                      {hall.name} {hall.capacity ? `(${hall.capacity})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Start Time
                  <input
                    type="datetime-local"
                    min={nowMin}
                    className={`w-full rounded-md border px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 transition-colors ${
                      timeError ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  End Time
                  <input
                    type="datetime-local"
                    min={form.startTime || nowMin}
                    className={`w-full rounded-md border px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 transition-colors ${
                      timeError ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </label>
              </div>
              {timeError && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ StartTime must be before EndTime
                </p>
              )}

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Number of Participants
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={form.numberOfParticipants}
                  onChange={(e) => setForm((prev) => ({ ...prev, numberOfParticipants: Number(e.target.value) }))}
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Purpose
                <textarea
                  className={`w-full min-h-[80px] rounded-md border px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 transition-colors ${
                    purposeError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  value={form.purpose}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, purpose: e.target.value }));
                    if (e.target.value.trim()) setPurposeError(false);
                  }}
                  required
                />
                {purposeError && <span className="text-sm text-red-500">Purpose is required.</span>}
              </label>
              <button
                disabled={submitting}
                type="submit"
                className="rounded-md bg-blue-600 mt-2 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors w-full sm:w-auto"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
            {message && (
              <p className="mt-4 text-sm text-blue-800 bg-blue-50 rounded-md px-3 py-2 border border-blue-100">
                {message}
              </p>
            )}
          </section>

          {/* My Bookings */}
          <section className="w-full lg:w-1/2 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900">My Bookings</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-200 text-left text-xs font-black text-slate-900 uppercase tracking-wider">
                  <tr className="border-b-2 border-slate-300 whitespace-nowrap">
                    <th className="py-3 px-4">Hall</th>
                    <th className="py-3 px-4">People</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 text-gray-900 font-medium">
                        <span className="truncate block max-w-[120px] md:max-w-none" title={booking.hall.name}>
                          {booking.hall.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-800 whitespace-nowrap">
                        {booking.numberOfParticipants || 1}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-800 whitespace-nowrap">
                         <span className="block text-xs font-medium text-slate-800">{formatDateTime(booking.startTime)}</span>
                         <span className="block text-xs text-slate-600 font-bold tracking-tight">till {formatDateTime(booking.endTime)}</span>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="py-2.5">
                        {booking.status !== "CANCELLED" && booking.status !== "REJECTED" ? (
                          <button
                            type="button"
                            onClick={() => void cancelBooking(booking.id)}
                            className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        No bookings yet. Submit your first request!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Calendar Tab Content */}
      {activeTab === "calendar" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900">Hall Availability (Approved Only)</h2>
          <p className="mt-1 text-sm text-slate-700 font-medium mb-4">
            Calendar view of occupied slots per hall.
          </p>
          <div className="overflow-x-auto pb-4">
            <HallAvailabilityCalendar halls={availability} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {upcomingApproved.map((hall) => (
              <div key={hall.id} className="rounded-md border border-slate-200 p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900">{hall.name}</h3>
                {hall.bookings.length === 0 ? (
                  <p className="mt-2 text-sm text-green-700 bg-green-50 rounded px-2 py-1 inline-block">No approved bookings yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {hall.bookings.map((slot) => (
                      <li key={slot.id} className="rounded-md bg-slate-50 border border-slate-100 p-2.5">
                        <div className="text-gray-900 font-medium mb-0.5">
                          {formatDateTime(slot.startTime)} – {formatDateTime(slot.endTime)}
                        </div>
                        <div className="text-gray-600 text-xs">{slot.purpose ?? "No purpose provided"}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<BookingStatus, string> = {
    APPROVED: "bg-green-100 text-green-900 border-green-300 shadow-sm",
    PENDING: "bg-amber-100 text-amber-900 border-amber-300 shadow-sm",
    REJECTED: "bg-red-100 text-red-900 border-red-300 shadow-sm",
    CANCELLED: "bg-slate-100 text-slate-900 border-slate-300 shadow-sm",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black border uppercase tracking-widest ${styles[status]}`}>
      {status}
    </span>
  );
}
