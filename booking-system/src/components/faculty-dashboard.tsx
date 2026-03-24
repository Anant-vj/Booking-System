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

export function FacultyDashboard() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [form, setForm] = useState({
    hallId: "",
    startTime: toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
    endTime: toInputDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    purpose: "",
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
    setSubmitting(true);
    setMessage("");

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
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
    return <p className="text-sm text-slate-600">Loading dashboard...</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">New Booking Request</h2>
        <p className="mt-1 text-sm text-slate-600">
          Requests are saved as pending. Only approved bookings block slots.
        </p>
        <form onSubmit={submitBooking} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            Hall
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
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
          <label className="grid gap-1 text-sm">
            Start Time
            <input
              type="datetime-local"
              className="rounded-md border border-slate-300 px-3 py-2"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            End Time
            <input
              type="datetime-local"
              className="rounded-md border border-slate-300 px-3 py-2"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Purpose (optional)
            <textarea
              className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
              value={form.purpose}
              onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
            />
          </label>
          <button
            disabled={submitting}
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-blue-700">{message}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">My Bookings</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2">Hall</th>
                <th className="py-2">Time</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100">
                  <td className="py-2">{booking.hall.name}</td>
                  <td className="py-2">
                    {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                  </td>
                  <td className="py-2">{booking.status}</td>
                  <td className="py-2">
                    {booking.status !== "CANCELLED" && booking.status !== "REJECTED" ? (
                      <button
                        type="button"
                        onClick={() => void cancelBooking(booking.id)}
                        className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-semibold">Hall Availability (Approved Only)</h2>
        <p className="mt-1 text-sm text-slate-600">
          This acts as a lightweight calendar view of occupied slots per hall.
        </p>
        <div className="mt-4">
          <HallAvailabilityCalendar halls={availability} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {upcomingApproved.map((hall) => (
            <div key={hall.id} className="rounded-md border border-slate-200 p-3">
              <h3 className="font-medium">{hall.name}</h3>
              {hall.bookings.length === 0 ? (
                <p className="mt-2 text-sm text-green-700">No approved bookings yet.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {hall.bookings.map((slot) => (
                    <li key={slot.id} className="rounded bg-slate-50 p-2">
                      <div>{formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}</div>
                      <div className="text-slate-600">{slot.purpose ?? "No purpose provided"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
