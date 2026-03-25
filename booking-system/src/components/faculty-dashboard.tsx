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
  const [purposeError, setPurposeError] = useState(false);

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
    if (!form.purpose.trim()) {
      setPurposeError(true);
      return;
    }
    setPurposeError(false);
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
    return <p className="text-sm text-gray-600">Loading dashboard...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <section className="w-full md:w-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">New Booking Request</h2>
        <p className="mt-1 text-sm text-gray-500">
          Requests are saved as pending. Only approved bookings block slots.
        </p>
        <form onSubmit={submitBooking} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm text-gray-700">
            Hall
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-blue-400 focus:outline-none"
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
          <label className="grid gap-1 text-sm text-gray-700">
            Start Time
            <input
              type="datetime-local"
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-blue-400 focus:outline-none"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm text-gray-700">
            End Time
            <input
              type="datetime-local"
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-blue-400 focus:outline-none"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Purpose
            <textarea
              className={`min-h-20 rounded-md border px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 transition-colors ${
                purposeError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-blue-400 focus:ring-blue-400"
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
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-blue-700">{message}</p> : null}
      </section>

      <section className="w-full md:w-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">My Bookings</h2>
        <div className="mt-4 overflow-x-auto w-full">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-gray-700 font-medium">
                <th className="py-2">Hall</th>
                <th className="py-2">Time</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100">
                  <td className="py-2 text-gray-800 font-medium">
                    <span className="truncate block max-w-[120px] md:max-w-none" title={booking.hall.name}>{booking.hall.name}</span>
                  </td>
                  <td className="py-2 text-gray-700 whitespace-nowrap">
                    {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                  </td>
                  <td className="py-2">
                    {booking.status === "APPROVED" && (
                      <span className="rounded bg-green-50 px-2 py-1 text-green-700 font-medium">APPROVED</span>
                    )}
                    {booking.status === "PENDING" && (
                      <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700 font-medium">PENDING</span>
                    )}
                    {booking.status === "REJECTED" && (
                      <span className="rounded bg-red-50 px-2 py-1 text-red-700 font-medium">REJECTED</span>
                    )}
                    {booking.status === "CANCELLED" && (
                      <span className="rounded bg-gray-50 px-2 py-1 text-gray-600 font-medium">CANCELLED</span>
                    )}
                  </td>
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
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Hall Availability (Approved Only)</h2>
        <p className="mt-1 text-sm text-gray-500">
          This acts as a lightweight calendar view of occupied slots per hall.
        </p>
        <div className="mt-4">
          <HallAvailabilityCalendar halls={availability} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {upcomingApproved.map((hall) => (
            <div key={hall.id} className="rounded-md border border-slate-200 p-3">
              <h3 className="font-semibold text-gray-900">{hall.name}</h3>
              {hall.bookings.length === 0 ? (
                <p className="mt-2 text-sm text-green-700">No approved bookings yet.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {hall.bookings.map((slot) => (
                    <li key={slot.id} className="rounded bg-slate-50 p-2">
                      <div>{formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}</div>
                      <div className="text-gray-600">{slot.purpose ?? "No purpose provided"}</div>
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
