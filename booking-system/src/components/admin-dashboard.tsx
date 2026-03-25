"use client";
import { useEffect, useState, useRef, useCallback } from "react";

import { formatDateTime } from "@/lib/format";

type Hall = { id: string; name: string; capacity: number | null };
type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type Booking = {
  id: string;
  hallId: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  purpose: string | null;
  hasConflict: boolean;
  conflictCount: number;
  hall: Hall;
  user: { id: string; name: string; email: string; role: "ADMIN" | "FACULTY" };
};
type LoginThrottle = {
  key: string;
  attempts: number;
  windowStart: string;
  blockedUntil: string | null;
};
type LoginThrottleAudit = {
  id: string;
  throttleKey: string | null;
  action: string;
  note: string | null;
  createdAt: string;
  adminUser: { id: string; name: string; email: string };
};
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

const STATUS_OPTIONS: Array<BookingStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");

  // Bookings State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize] = useState(10);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const bookingsAbortRef = useRef<AbortController | null>(null);

  // Halls State
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallsLoading, setHallsLoading] = useState(true);
  const [hallsError, setHallsError] = useState<string | null>(null);
  const [hallForm, setHallForm] = useState({ name: "", capacity: "" });
  const [editHallId, setEditHallId] = useState<string | null>(null);
  const [editHallForm, setEditHallForm] = useState({ name: "", capacity: "" });
  const hallsAbortRef = useRef<AbortController | null>(null);

  // Throttle State
  const [loginThrottles, setLoginThrottles] = useState<LoginThrottle[]>([]);
  const [throttleSearch, setThrottleSearch] = useState("");
  const [throttlePage, setThrottlePage] = useState(1);
  const [throttlePageSize] = useState(10);
  const [throttleTotal, setThrottleTotal] = useState(0);
  const [throttleLoading, setThrottleLoading] = useState(true);
  const [throttleError, setThrottleError] = useState<string | null>(null);
  const throttleAbortRef = useRef<AbortController | null>(null);

  // Audit State
  const [throttleAudits, setThrottleAudits] = useState<LoginThrottleAudit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const auditAbortRef = useRef<AbortController | null>(null);

  // FETCHERS
  const loadBookings = useCallback(async (filter = statusFilter, page = bookingPage) => {
    bookingsAbortRef.current?.abort();
    const controller = new AbortController();
    bookingsAbortRef.current = controller;

    setBookingLoading(true);
    setBookingError(null);
    try {
      const url =
        filter === "ALL"
          ? `/api/admin/bookings?page=${page}&pageSize=${bookingPageSize}`
          : `/api/admin/bookings?status=${filter}&page=${page}&pageSize=${bookingPageSize}`;
      const res = await fetch(url, { signal: controller.signal });
      const data: PaginatedResponse<Booking> = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load bookings");
      setBookings(data.items);
      setBookingTotal(data.total);
      setBookingPage(data.page);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setBookingError(err.message);
      setMessage(err.message);
    } finally {
      if (!controller.signal.aborted) setBookingLoading(false);
    }
  }, [statusFilter, bookingPage, bookingPageSize]);

  const loadHalls = useCallback(async () => {
    hallsAbortRef.current?.abort();
    const controller = new AbortController();
    hallsAbortRef.current = controller;

    setHallsLoading(true);
    setHallsError(null);
    try {
      const res = await fetch("/api/halls", { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load halls");
      setHalls(data);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setHallsError(err.message);
      setMessage(err.message);
    } finally {
      if (!controller.signal.aborted) setHallsLoading(false);
    }
  }, []);

  const loadThrottle = useCallback(async (query = throttleSearch, page = throttlePage) => {
    throttleAbortRef.current?.abort();
    const controller = new AbortController();
    throttleAbortRef.current = controller;

    setThrottleLoading(true);
    setThrottleError(null);
    try {
      const url = `/api/admin/security/login-throttle?q=${encodeURIComponent(
        query
      )}&page=${page}&pageSize=${throttlePageSize}`;
      const res = await fetch(url, { signal: controller.signal });
      const data: PaginatedResponse<LoginThrottle> = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load throttle data");
      setLoginThrottles(data.items);
      setThrottleTotal(data.total);
      setThrottlePage(data.page);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setThrottleError(err.message);
      setMessage(err.message);
    } finally {
      if (!controller.signal.aborted) setThrottleLoading(false);
    }
  }, [throttleSearch, throttlePage, throttlePageSize]);

  const loadAudit = useCallback(async (page = auditPage) => {
    auditAbortRef.current?.abort();
    const controller = new AbortController();
    auditAbortRef.current = controller;

    setAuditLoading(true);
    setAuditError(null);
    try {
      const url = `/api/admin/security/login-throttle/audit?page=${page}&pageSize=${auditPageSize}`;
      const res = await fetch(url, { signal: controller.signal });
      const data: PaginatedResponse<LoginThrottleAudit> = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load audit logs");
      setThrottleAudits(data.items);
      setAuditTotal(data.total);
      setAuditPage(data.page);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setAuditError(err.message);
      setMessage(err.message);
    } finally {
      if (!controller.signal.aborted) setAuditLoading(false);
    }
  }, [auditPage, auditPageSize]);

  // INITIAL LOADS
  useEffect(() => {
    loadBookings();
    loadHalls();
    loadThrottle();
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyDecision(id: string, action: "APPROVE" | "REJECT") {
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Action failed");
        return;
      }
      setMessage(`Booking ${action === "APPROVE" ? "approved" : "rejected"} successfully.`);
      void loadBookings();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function createHall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = {
        name: hallForm.name,
        capacity: hallForm.capacity ? Number(hallForm.capacity) : null,
      };
      const response = await fetch("/api/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to create hall");
        return;
      }
      setHallForm({ name: "", capacity: "" });
      setMessage("Hall created.");
      void loadHalls();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function deleteHall(id: string) {
    try {
      const response = await fetch(`/api/halls/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to delete hall");
        return;
      }
      setMessage("Hall deleted.");
      void loadHalls();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function updateHall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editHallId) return;
    try {
      const payload = {
        name: editHallForm.name.trim(),
        capacity: editHallForm.capacity ? Number(editHallForm.capacity) : null,
      };
      const response = await fetch(`/api/halls/${editHallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to update hall");
        return;
      }
      setEditHallId(null);
      setEditHallForm({ name: "", capacity: "" });
      setMessage("Hall updated.");
      void loadHalls();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function unblockLoginKey(key: string) {
    try {
      const response = await fetch(
        `/api/admin/security/login-throttle/${encodeURIComponent(key)}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to unblock login key");
        return;
      }
      setMessage("Login key unblocked.");
      void loadThrottle();
      void loadAudit();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      booking.user.name.toLowerCase().includes(query) ||
      booking.user.email.toLowerCase().includes(query) ||
      booking.hall.name.toLowerCase().includes(query) ||
      (booking.purpose ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm relative">
        {bookingLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Bookings</h2>
          {bookingError && (
            <p className="text-sm text-red-600 font-medium">Error: {bookingError}</p>
          )}
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              placeholder="Search faculty/hall/purpose"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            />
            <select
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value as BookingStatus | "ALL";
                setStatusFilter(next);
                void loadBookings(next, 1);
              }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-gray-700 font-medium">
                <th className="py-2">Faculty</th>
                <th className="py-2">Hall</th>
                <th className="py-2">Time</th>
                <th className="py-2">Status</th>
                <th className="py-2">Conflict</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100">
                  <td className="py-2 text-gray-800 font-medium">{booking.user.name}</td>
                  <td className="py-2 text-gray-800">{booking.hall.name}</td>
                  <td className="py-2 text-gray-700">
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
                    {booking.hasConflict ? (
                      <span className="rounded bg-red-50 px-2 py-1 text-red-600 font-medium">
                        Yes ({booking.conflictCount})
                      </span>
                    ) : (
                      <span className="font-medium text-green-600">No</span>
                    )}
                  </td>
                  <td className="py-2">
                    {booking.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void applyDecision(booking.id, "APPROVE")}
                          className="rounded bg-green-600 px-2 py-1 text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void applyDecision(booking.id, "REJECT")}
                          className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filteredBookings.length === 0 ? "No bookings match your filters." : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={bookingPage <= 1}
                onClick={() => void loadBookings(statusFilter, bookingPage - 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
                Page {bookingPage} / {Math.max(1, Math.ceil(bookingTotal / bookingPageSize))}
              </span>
              <button
                type="button"
                disabled={bookingPage * bookingPageSize >= bookingTotal}
                onClick={() => void loadBookings(statusFilter, bookingPage + 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm relative">
        {hallsLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-900">Hall Management</h2>
        {hallsError && (
          <p className="text-sm text-red-600 font-medium">Error: {hallsError}</p>
        )}
        <form onSubmit={createHall} className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            placeholder="Hall name"
            value={hallForm.name}
            onChange={(e) => setHallForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            required
          />
          <input
            placeholder="Capacity"
            value={hallForm.capacity}
            onChange={(e) => setHallForm((prev) => ({ ...prev, capacity: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            type="number"
            min={1}
          />
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
            Add Hall
          </button>
        </form>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {halls.map((hall) => (
            <li
              key={hall.id}
              className="flex items-center justify-between rounded-md border border-slate-200 p-3"
            >
              <span className="text-gray-800 font-medium">
                {hall.name} {hall.capacity ? `(${hall.capacity})` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditHallId(hall.id);
                    setEditHallForm({
                      name: hall.name,
                      capacity: hall.capacity ? String(hall.capacity) : "",
                    });
                  }}
                  className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteHall(hall.id)}
                  className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {editHallId ? (
          <form
            onSubmit={updateHall}
            className="mt-4 grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-3"
          >
            <input
              placeholder="Hall name"
              value={editHallForm.name}
              onChange={(e) => setEditHallForm((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              required
            />
            <input
              placeholder="Capacity"
              value={editHallForm.capacity}
              onChange={(e) => setEditHallForm((prev) => ({ ...prev, capacity: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              type="number"
              min={1}
            />
            <div className="flex gap-2">
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditHallId(null);
                  setEditHallForm({ name: "", capacity: "" });
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm relative">
        {throttleLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-900">Security: Login Throttle Audit</h2>
        {throttleError && (
          <p className="text-sm text-red-600 font-medium mb-2">Error: {throttleError}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Shows currently blocked login keys by email + IP. Use unblock only for verified users.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-gray-700 font-medium">
                <th className="py-2">Key (email::ip)</th>
                <th className="py-2">Attempts</th>
                <th className="py-2">Blocked Until</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loginThrottles.map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="py-2 font-mono text-xs">{row.key}</td>
                  <td className="py-2">{row.attempts}</td>
                  <td className="py-2">
                    {row.blockedUntil ? formatDateTime(row.blockedUntil) : "-"}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => void unblockLoginKey(row.key)}
                      className="rounded border border-amber-300 px-2 py-1 text-amber-700 hover:bg-amber-50"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-2">
            <input
              placeholder="Search key (email or IP)"
              value={throttleSearch}
              onChange={(e) => setThrottleSearch(e.target.value)}
              className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => void loadThrottle(throttleSearch, 1)}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Search
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {loginThrottles.length === 0 ? "No blocked login keys currently." : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={throttlePage <= 1}
                onClick={() => void loadThrottle(throttleSearch, throttlePage - 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
                Page {throttlePage} / {Math.max(1, Math.ceil(throttleTotal / throttlePageSize))}
              </span>
              <button
                type="button"
                disabled={throttlePage * throttlePageSize >= throttleTotal}
                onClick={() => void loadThrottle(throttleSearch, throttlePage + 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <h3 className="mt-8 text-base font-semibold text-gray-900">Unblock Audit Trail</h3>
        {auditError && (
          <p className="text-sm text-red-600 font-medium mb-2">Error: {auditError}</p>
        )}
        <div className="mt-2 overflow-x-auto relative">
          {auditLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-gray-700 font-medium">
                <th className="py-2">When</th>
                <th className="py-2">Admin</th>
                <th className="py-2">Key</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {throttleAudits.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2">{formatDateTime(row.createdAt)}</td>
                  <td className="py-2">{row.adminUser.name}</td>
                  <td className="py-2 font-mono text-xs">{row.throttleKey}</td>
                  <td className="py-2">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {throttleAudits.length === 0 ? "No unblock audit records yet." : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={auditPage <= 1}
                onClick={() => void loadAudit(auditPage - 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
                Page {auditPage} / {Math.max(1, Math.ceil(auditTotal / auditPageSize))}
              </span>
              <button
                type="button"
                disabled={auditPage * auditPageSize >= auditTotal}
                onClick={() => void loadAudit(auditPage + 1)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
      {message ? <p className="fixed bottom-4 right-4 bg-white border border-slate-200 p-4 shadow-lg rounded-lg text-sm text-blue-700 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">{message}</p> : null}
    </div>
  );
}
