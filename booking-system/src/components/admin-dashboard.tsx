"use client";
import { useEffect, useState } from "react";

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loginThrottles, setLoginThrottles] = useState<LoginThrottle[]>([]);
  const [throttleAudits, setThrottleAudits] = useState<LoginThrottleAudit[]>([]);
  const [throttleSearch, setThrottleSearch] = useState("");
  const [throttlePage, setThrottlePage] = useState(1);
  const [throttlePageSize] = useState(10);
  const [throttleTotal, setThrottleTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [hallForm, setHallForm] = useState({ name: "", capacity: "" });
  const [editHallId, setEditHallId] = useState<string | null>(null);
  const [editHallForm, setEditHallForm] = useState({ name: "", capacity: "" });

  async function loadData(
    filter: BookingStatus | "ALL" = statusFilter,
    throttleQuery = throttleSearch,
    throttlePageArg = throttlePage,
    auditPageArg = auditPage
  ) {
    setLoading(true);
    const bookingsUrl =
      filter === "ALL" ? "/api/admin/bookings" : `/api/admin/bookings?status=${filter}`;
    const throttleUrl =
      `/api/admin/security/login-throttle?q=${encodeURIComponent(
        throttleQuery
      )}&page=${throttlePageArg}&pageSize=${throttlePageSize}`;
    const throttleAuditUrl =
      `/api/admin/security/login-throttle/audit?page=${auditPageArg}&pageSize=${auditPageSize}`;
    const [bookingsRes, hallsRes, throttlesRes, throttleAuditsRes] = await Promise.all([
      fetch(bookingsUrl),
      fetch("/api/halls"),
      fetch(throttleUrl),
      fetch(throttleAuditUrl),
    ]);
    const bookingsData = await bookingsRes.json();
    const hallsData = await hallsRes.json();
    const throttlesData: PaginatedResponse<LoginThrottle> = await throttlesRes.json();
    const throttleAuditsData: PaginatedResponse<LoginThrottleAudit> =
      await throttleAuditsRes.json();
    setBookings(bookingsData);
    setHalls(hallsData);
    setLoginThrottles(throttlesData.items);
    setThrottleAudits(throttleAuditsData.items);
    setThrottleTotal(throttlesData.total);
    setAuditTotal(throttleAuditsData.total);
    setThrottlePage(throttlesData.page);
    setAuditPage(throttleAuditsData.page);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyDecision(id: string, action: "APPROVE" | "REJECT") {
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
    await loadData(statusFilter, throttleSearch, throttlePage, auditPage);
  }

  async function createHall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    await loadData();
  }

  async function deleteHall(id: string) {
    const response = await fetch(`/api/halls/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to delete hall");
      return;
    }
    setMessage("Hall deleted.");
    await loadData();
  }

  async function updateHall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editHallId) return;
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
    await loadData();
  }

  async function unblockLoginKey(key: string) {
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
    await loadData();
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

  if (loading) return <p className="text-sm text-slate-600">Loading admin dashboard...</p>;

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">All Bookings</h2>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              placeholder="Search faculty/hall/purpose"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value as BookingStatus | "ALL";
                setStatusFilter(next);
                void loadData(next);
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
              <tr className="border-b border-slate-200 text-left">
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
                  <td className="py-2">{booking.user.name}</td>
                  <td className="py-2">{booking.hall.name}</td>
                  <td className="py-2">
                    {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                  </td>
                  <td className="py-2">{booking.status}</td>
                  <td className="py-2">
                    {booking.hasConflict ? (
                      <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                        Yes ({booking.conflictCount})
                      </span>
                    ) : (
                      <span className="text-green-700">No</span>
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
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBookings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No bookings match your filters.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Hall Management</h2>
        <form onSubmit={createHall} className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            placeholder="Hall name"
            value={hallForm.name}
            onChange={(e) => setHallForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Capacity"
            value={hallForm.capacity}
            onChange={(e) => setHallForm((prev) => ({ ...prev, capacity: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              <span>{hall.name} {hall.capacity ? `(${hall.capacity})` : ""}</span>
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
                  className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
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
          <form onSubmit={updateHall} className="mt-4 grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-3">
            <input
              placeholder="Hall name"
              value={editHallForm.name}
              onChange={(e) => setEditHallForm((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Capacity"
              value={editHallForm.capacity}
              onChange={(e) =>
                setEditHallForm((prev) => ({ ...prev, capacity: e.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Security: Login Throttle Audit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Shows currently blocked login keys by email + IP. Use unblock only for verified users.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
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
              className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void loadData(statusFilter, throttleSearch, 1, auditPage)}
              className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Search
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={throttlePage <= 1}
              onClick={() =>
                void loadData(statusFilter, throttleSearch, Math.max(1, throttlePage - 1), auditPage)
              }
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">
              Page {throttlePage} / {Math.max(1, Math.ceil(throttleTotal / throttlePageSize))}
            </span>
            <button
              type="button"
              disabled={throttlePage * throttlePageSize >= throttleTotal}
              onClick={() =>
                void loadData(statusFilter, throttleSearch, throttlePage + 1, auditPage)
              }
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
          {loginThrottles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No blocked login keys currently.</p>
          ) : null}
        </div>
        <h3 className="mt-6 text-base font-semibold">Unblock Audit Trail</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
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
                  <td className="py-2 font-mono text-xs">{row.throttleKey ?? "-"}</td>
                  <td className="py-2">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={auditPage <= 1}
              onClick={() =>
                void loadData(statusFilter, throttleSearch, throttlePage, Math.max(1, auditPage - 1))
              }
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">
              Page {auditPage} / {Math.max(1, Math.ceil(auditTotal / auditPageSize))}
            </span>
            <button
              type="button"
              disabled={auditPage * auditPageSize >= auditTotal}
              onClick={() =>
                void loadData(statusFilter, throttleSearch, throttlePage, auditPage + 1)
              }
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
          {throttleAudits.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No unblock audit records yet.</p>
          ) : null}
        </div>
      </section>
      {message ? <p className="text-sm text-blue-700">{message}</p> : null}
    </div>
  );
}
