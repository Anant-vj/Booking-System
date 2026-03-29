"use client";
import { useEffect, useState, useCallback } from "react";

import { formatDateTime } from "@/lib/format";
import { Pagination } from "@/components/pagination";
import { HallAvailabilityCalendar } from "@/components/hall-availability-calendar";

type User = { id: string; name: string | null; email: string | null };
type Hall = { id: string; name: string; capacity: number | null };
type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type Booking = {
  id: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  purpose: string | null;
  numberOfParticipants: number;
  createdAt: string;
  user: User;
  hall: Hall;
  hasConflict?: boolean;
  conflictCount?: number;
};
type ThrottleAudit = {
  id: string;
  throttleKey: string;
  action: string;
  note: string | null;
  createdAt: string;
  adminUser: { name: string | null; email: string | null };
};

type ReportPeriod = "today" | "week" | "month" | "year" | "all";
type ReportStats = { total: number; PENDING: number; APPROVED: number; REJECTED: number; CANCELLED: number };
type ReportsData = {
  today: ReportStats;
  thisWeek: ReportStats;
  thisMonth: ReportStats;
  previewBookings?: Booking[];
};

type TabId = "bookings" | "calendar" | "halls" | "reports" | "security";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "bookings", label: "Bookings", icon: "📋" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "halls", label: "Halls", icon: "🏛️" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "security", label: "Security", icon: "🔐" },
];

const ITEMS_PER_PAGE = 8;

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("bookings");
  const [initialLoading, setInitialLoading] = useState(true);

  // --- Data States ---
  
  // Bookings State (Server Paginated)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [bookingLoading, setBookingLoading] = useState(true);

  // Misc Dashboard State
  const [allHallsWithBookings, setAllHallsWithBookings] = useState<any[]>([]);
  const [throttleAudits, setThrottleAudits] = useState<ThrottleAudit[]>([]);

  // Halls Management State
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallsLoading, setHallsLoading] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState<string>("");
  const [hallSaving, setHallSaving] = useState(false);
  const [deletingHallId, setDeletingHallId] = useState<string | null>(null);

  const [isAddingHall, setIsAddingHall] = useState(false);
  const [newHallName, setNewHallName] = useState("");
  const [newHallCapacity, setNewHallCapacity] = useState("");
  const [hallAdding, setHallAdding] = useState(false);

  // Reports State
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month">("week");
  const [reports, setReports] = useState<ReportsData | null>(null);
  
  // Print State
  const [printing, setPrinting] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<ReportPeriod>("week");
  const [printData, setPrintData] = useState<Booking[]>([]);

  // --- Data Fetching Methods ---

  const loadBookings = useCallback(async () => {
    setBookingLoading(true);
    try {
      const statusQuery = bookingFilter !== "ALL" ? `&status=${bookingFilter}` : "";
      const res = await fetch(`/api/admin/bookings?page=${bookingPage}&pageSize=${ITEMS_PER_PAGE}${statusQuery}`);
      if (res.ok) {
        const data = await res.json();
        // Server returns { items, total, page, pageSize }
        setBookings(data.items || []);
        setTotalBookings(data.total || 0);
      } else {
        setBookings([]);
        setTotalBookings(0);
      }
    } catch (e) {
      console.error("Failed to load bookings", e);
      setBookings([]);
      setTotalBookings(0);
    }
    setBookingLoading(false);
  }, [bookingPage, bookingFilter]);

  const loadHalls = useCallback(async () => {
    setHallsLoading(true);
    try {
      const res = await fetch("/api/halls");
      if (res.ok) {
        setHalls(await res.json());
      }
    } catch (e) {
      console.error("Failed to load halls", e);
    }
    setHallsLoading(false);
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reports?period=${reportPeriod}`);
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error("Failed to load reports", e);
    }
  }, [reportPeriod]);

  const loadMiscData = useCallback(async () => {
    try {
      const [availabilityRes, auditRes] = await Promise.all([
        fetch("/api/halls/availability"),
        fetch("/api/admin/throttle-audits"),
      ]);
      if (availabilityRes.ok) setAllHallsWithBookings(await availabilityRes.json());
      if (auditRes.ok) setThrottleAudits(await auditRes.json());
    } catch (e) {
      console.error("Failed to load misc data", e);
    }
    setInitialLoading(false);
  }, []);

  // --- Lifecycle Initializers ---

  // Trigger bookings fetch when pagination or filters change
  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  // Trigger reports fetch when the report tab filter changes
  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Trigger once on mount for static datasets
  useEffect(() => {
    void loadMiscData();
    void loadHalls();
  }, [loadMiscData, loadHalls]);


  // --- Event Handlers ---

  async function updateStatus(id: string, action: "APPROVE" | "REJECT" | "WITHDRAW", hasConflict?: boolean) {
    if (action === "APPROVE" && hasConflict) {
      const confirmed = window.confirm(
        "⚠️ This booking conflicts with an already approved booking in the same hall/time slot.\n\nAre you sure you want to approve it?"
      );
      if (!confirmed) return;
    }
    if (action === "WITHDRAW") {
      const confirmed = window.confirm("Are you sure you want to withdraw this approval?");
      if (!confirmed) return;
    }
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        // Refresh grids and calendars to surface state change globally
        if (action === "WITHDRAW") {
          alert("Approval withdrawn successfully");
        }
        void loadBookings();
        void loadMiscData();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to update booking status.");
      }
    } catch (e) {
      console.error("Update status error:", e);
      alert("A network error occurred.");
    }
  }

  async function handleHallEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHall) return;
    setHallSaving(true);
    try {
      const res = await fetch(`/api/admin/halls/${editingHall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          capacity: editCapacity ? parseInt(editCapacity, 10) : null,
        }),
      });
      if (res.ok) {
        setEditingHall(null);
        void loadHalls();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to update hall.");
      }
    } catch {
      alert("A network error occurred.");
    }
    setHallSaving(false);
  }

  async function handleHallDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this hall?")) return;
    setDeletingHallId(id);
    try {
      const res = await fetch(`/api/admin/halls/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Hall deleted successfully");
        void loadHalls();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to delete hall");
      }
    } catch {
      alert("A network error occurred.");
    }
    setDeletingHallId(null);
  }

  async function handleAddHall(e: React.FormEvent) {
    e.preventDefault();
    setHallAdding(true);
    try {
      const res = await fetch("/api/admin/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHallName.trim(),
          capacity: newHallCapacity ? parseInt(newHallCapacity, 10) : null,
        }),
      });
      if (res.ok) {
        setIsAddingHall(false);
        setNewHallName("");
        setNewHallCapacity("");
        void loadHalls();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to add hall.");
      }
    } catch {
      alert("A network error occurred.");
    }
    setHallAdding(false);
  }

  async function handlePrintRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrinting(true);
    try {
      const res = await fetch(`/api/admin/reports?period=${printPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setPrintData(data.previewBookings || []);
        setTimeout(() => {
          window.print();
          setPrinting(false);
        }, 500);
      } else {
        throw new Error("API Failure");
      }
    } catch {
      alert("Failed to fetch print data");
      setPrinting(false);
    }
  }

  // --- Calculations ---
  const totalBookingPages = Math.max(1, Math.ceil(totalBookings / ITEMS_PER_PAGE));


  // --- Render Fallbacks ---
  if (initialLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500 font-medium">Loading command center…</span>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden space-y-6 mt-6">

        {/* Desktop & Mobile Tab Navigation */}
        <nav className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm overflow-x-auto w-full">
          {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 📋 BOOKINGS SECTION */}
        {activeTab === "bookings" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col w-full">
            <div className="border-b border-slate-200 p-4 sm:p-6 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Bookings</h2>
                  <p className="mt-1 text-sm text-slate-700 font-medium">
                    Review and act upon faculty hall requests. Order: Latest first.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg shrink-0">
                  {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setBookingFilter(filter);
                        setBookingPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wide transition-all ${
                        bookingFilter === filter
                          ? filter === "PENDING" ? "bg-amber-100 text-amber-950 shadow-md ring-2 ring-amber-500/20"
                            : filter === "APPROVED" ? "bg-green-600 text-white shadow-md shadow-green-600/20"
                            : filter === "REJECTED" ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                            : "bg-white text-blue-900 shadow-md ring-2 ring-slate-200"
                          : "text-slate-800 hover:text-slate-900 hover:bg-slate-300"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <div className="min-w-[800px] w-full">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-300 text-left text-xs font-black text-slate-900 uppercase tracking-wider">
                      <th className="px-5 py-4 w-1/6">Submission</th>
                      <th className="px-5 py-4 w-1/5">Faculty</th>
                      <th className="px-5 py-4 w-1/6">Hall & People</th>
                      <th className="px-5 py-4 w-1/6">Required Time</th>
                      <th className="px-5 py-4 w-1/5">Purpose</th>
                      <th className="px-5 py-4 w-1/12">Status</th>
                      <th className="px-5 py-4 w-1/12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bookingLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                          <div className="mx-auto w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3" />
                          Fetching records...
                        </td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <div className="text-lg mb-1">📭</div>
                          No bookings found matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap text-slate-800 font-medium align-top">
                            {formatDateTime(b.createdAt)}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-bold text-gray-900 truncate">{b.user.name || "Unknown"}</div>
                            <div className="text-slate-800 text-xs font-semibold mt-0.5 truncate">{b.user.email}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            <div className="font-bold text-gray-900">{b.hall.name}</div>
                            <div className="text-slate-800 text-xs font-bold mt-0.5">People: {b.numberOfParticipants || 1}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            <div className="font-bold text-gray-900">{formatDateTime(b.startTime)}</div>
                            <div className="text-slate-700 text-xs font-bold mt-0.5">to {formatDateTime(b.endTime)}</div>
                          </td>
                          <td className="px-5 py-4 text-gray-700 max-w-[200px] break-words align-top" title={b.purpose || ""}>
                            {b.purpose || "—"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={b.status} />
                              {b.hasConflict && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 border border-red-300 shadow-sm" title={`Conflicts with ${b.conflictCount} approved booking(s)`}>
                                  ⚠ Conflict
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            {b.status === "PENDING" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => void updateStatus(b.id, "APPROVE", b.hasConflict)}
                                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-black text-white hover:bg-green-700 shadow-md shadow-green-600/20 active:scale-95 transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => void updateStatus(b.id, "REJECT")}
                                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-700 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : b.status === "APPROVED" ? (
                              <button
                                onClick={() => void updateStatus(b.id, "WITHDRAW")}
                                className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-300 border border-slate-300 shadow-sm active:scale-95 transition-all whitespace-nowrap"
                              >
                                Withdraw Approval
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs font-bold pl-2 uppercase tracking-tight">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalBookingPages > 1 && !bookingLoading && (
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-800 font-bold hidden sm:block">
                  Showing page {bookingPage} of {totalBookingPages} ({totalBookings} total)
                </div>
                <Pagination page={bookingPage} totalPages={totalBookingPages} onPageChange={setBookingPage} />
              </div>
            )}
          </section>
        )}

        {/* 📅 CALENDAR SECTION */}
        {activeTab === "calendar" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 overflow-hidden w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Global Calendar</h2>
            <p className="text-sm text-slate-700 font-medium mb-6">
              Visualizes all approved bookings across all halls.
            </p>
            <div className="overflow-x-auto w-full pb-2">
              <div className="min-w-[700px]">
                <HallAvailabilityCalendar halls={allHallsWithBookings} />
              </div>
            </div>
          </section>
        )}

        {/* 🏛️ HALLS MANAGEMENT SECTION */}
        {activeTab === "halls" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col w-full">
            <div className="border-b border-slate-200 p-4 sm:p-6 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage Halls</h2>
                <p className="mt-1 text-sm text-slate-700 font-medium">
                  View and edit hall details. Capacity and name can be updated.
                </p>
              </div>
              <button
                onClick={() => setIsAddingHall(true)}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                + Add Hall
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <div className="min-w-[500px] w-full">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-300 text-left text-xs font-black text-slate-900 uppercase tracking-wider">
                      <th className="px-5 py-4">Hall Name</th>
                      <th className="px-5 py-4">Capacity</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {hallsLoading ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-16 text-center text-gray-500">
                          <div className="mx-auto w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3" />
                          Loading halls...
                        </td>
                      </tr>
                    ) : halls.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                          <div className="text-lg mb-1">🏛️</div>
                          No halls found.
                        </td>
                      </tr>
                    ) : (
                      halls.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 font-bold text-gray-900">{h.name}</td>
                          <td className="px-5 py-4 text-slate-800 font-medium">
                            {h.capacity != null ? h.capacity : <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingHall(h);
                                  setEditName(h.name);
                                  setEditCapacity(h.capacity != null ? String(h.capacity) : "");
                                }}
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => void handleHallDelete(h.id)}
                                disabled={deletingHallId === h.id}
                                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-700 shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {deletingHallId === h.id ? "Deleting..." : "🗑️ Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Hall Modal */}
            {editingHall && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <form
                  onSubmit={handleHallEdit}
                  className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h3 className="text-lg font-bold text-gray-900">Edit Hall</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Update hall name and capacity</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1.5">Hall Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1.5">Capacity <span className="text-slate-400 font-normal">(optional)</span></label>
                      <input
                        type="number"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        min={1}
                        placeholder="e.g. 200"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingHall(null)}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={hallSaving || !editName.trim()}
                      className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {hallSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Add Hall Modal */}
            {isAddingHall && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <form
                  onSubmit={handleAddHall}
                  className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h3 className="text-lg font-bold text-gray-900">Add New Hall</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Enter details for the new hall</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1.5">Hall Name</label>
                      <input
                        type="text"
                        value={newHallName}
                        onChange={(e) => setNewHallName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1.5">Capacity <span className="text-slate-400 font-normal">(optional)</span></label>
                      <input
                        type="number"
                        value={newHallCapacity}
                        onChange={(e) => setNewHallCapacity(e.target.value)}
                        min={1}
                        placeholder="e.g. 200"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingHall(false)}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={hallAdding || !newHallName.trim()}
                      className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {hallAdding ? "Adding..." : "Add Hall"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}

        {/* 📊 REPORTS SECTION */}
        {activeTab === "reports" && reports && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col w-full">
            <div className="border-b border-slate-200 p-4 sm:p-6 bg-slate-50/50">
              <div className="flex flex-col md:flex-row justify-between gap-4 md:items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Analytics & Reports</h2>
                  <p className="mt-1 text-sm text-gray-600 font-medium">
                    Booking overview and detailed data export.
                  </p>
                </div>
                
                {/* Print Control Form */}
                <form onSubmit={handlePrintRequest} className="flex flex-wrap lg:flex-nowrap gap-3 bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm items-center w-full md:w-auto">
                  <span className="text-[10px] font-black text-gray-900 uppercase px-1 shrink-0 bg-slate-100 py-1 rounded-md tracking-widest">
                    Print Scope
                  </span>
                  
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 shrink-0 overflow-x-auto max-w-full">
                    {(["week", "month", "year", "all"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPrintPeriod(p)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-md transition-all whitespace-nowrap ${
                          printPeriod === p 
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/30"
                            : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        {p === "all" ? "All Time" : `This ${p}`}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={printing}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-4 focus:ring-blue-300 text-white shadow-md shadow-blue-500/30 px-4 py-1.5 rounded-md text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                  >
                    {printing ? "Preparing..." : "🖨️ Print"}
                  </button>
                </form>
              </div>

              {/* Stats Period Toggle */}
              <div className="mt-6 sm:mt-8 flex flex-wrap gap-2">
                {(["today", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                      reportPeriod === p 
                        ? "bg-slate-900 text-white shadow-lg ring-2 ring-slate-900/10"
                        : "bg-white text-gray-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                  </button>
                ))}
              </div>

              {/* Stats Cards */}
              <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <StatCard title="Total Requests" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].total} color="blue" />
                <StatCard title="Approved" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].APPROVED} color="green" />
                <StatCard title="Pending" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].PENDING} color="amber" />
                <StatCard title="Rejected" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].REJECTED} color="red" />
                <StatCard title="Cancelled" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].CANCELLED} color="slate" />
              </div>
            </div>

            {/* Detailed Preview Table */}
            <div className="p-4 sm:p-6 overflow-x-auto w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Detailed Log <span className="text-gray-400 font-normal">({reportPeriod === "today" ? "Today" : reportPeriod === "week" ? "This Week" : "This Month"})</span>
              </h3>
              <div className="border border-slate-200 rounded-lg min-w-[700px] w-full bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-200 text-left text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Faculty</th>
                      <th className="px-4 py-3.5">Hall</th>
                      <th className="px-4 py-3.5">Date & Time</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.previewBookings?.length ? reports.previewBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{b.user.name}</div>
                          <div className="text-gray-500 text-xs">{b.user.email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{b.hall.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                          {formatDateTime(b.startTime)}
                          <br/><span className="text-gray-400 text-xs">till</span> {formatDateTime(b.endTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDateTime(b.createdAt)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">No records found for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 🔐 SECURITY SECTION */}
        {activeTab === "security" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 overflow-hidden w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Security Audit Log</h2>
                <p className="text-sm text-slate-700 font-medium mt-1">
                  Tracks rate-limiting interventions and system actions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <div className="border border-slate-200 rounded-lg min-w-[700px] w-full">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-200 text-left text-xs font-bold text-slate-900 uppercase">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Target Key</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {throttleAudits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {formatDateTime(a.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                          {a.adminUser ? (a.adminUser.name || a.adminUser.email) : "System"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                            {a.throttleKey}
                          </code>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            a.action === 'THROTTLE_RESET' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {a.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={a.note || ""}>
                          {a.note || "—"}
                        </td>
                      </tr>
                    ))}
                    {throttleAudits.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No security audit logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 
        🖨️ PRINT VIEW 
        Only visible when browser prints. Hidden on screen.
      */}
      <div className="hidden print:block font-sans text-black">
        <div className="border-b-4 border-slate-900 pb-4 mb-6">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Hall Booking System - Report</h1>
          <p className="text-sm mt-2 font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded inline-block">
            Exported on: {new Date().toLocaleString()} | Period: {printPeriod.toUpperCase()}
          </p>
        </div>
        
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-400">
              <th className="py-2 pr-4">Faculty Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Hall & People</th>
              <th className="py-2 pr-4">Booking Slot</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {printData.map((b) => (
              <tr key={b.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-4 align-top">{b.user.name}</td>
                <td className="py-2.5 pr-4 align-top">{b.user.email}</td>
                <td className="py-2.5 pr-4 align-top">
                  <div>{b.hall.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">People: {b.numberOfParticipants}</div>
                </td>
                <td className="py-2.5 pr-4 align-top">
                  <div>{formatDateTime(b.startTime)}</div>
                  <div className="text-slate-500">to {formatDateTime(b.endTime)}</div>
                </td>
                <td className="py-2.5 pr-4 align-top font-medium">{b.status}</td>
                <td className="py-2.5 align-top text-slate-600 text-xs">{formatDateTime(b.createdAt)}</td>
              </tr>
            ))}
            {printData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center italic text-slate-500">
                  No records found in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="text-center text-xs text-slate-400 mt-12 pt-6 border-t border-slate-200">
          Generated automatically by College Hall Booking System Management
        </div>
      </div>
    </>
  );
}

function StatCard({ title, count, color }: { title: string; count: number; color: "blue"|"green"|"amber"|"red"|"slate" }) {
  const bgClasses = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    amber: "bg-amber-50 border-amber-100",
    red: "bg-red-50 border-red-100",
    slate: "bg-slate-50 border-slate-200",
  };
  const textClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-500",
    slate: "text-slate-700",
  };
  
  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm flex flex-col items-center justify-center ${bgClasses[color]}`}>
      <div className={`text-4xl font-black tracking-tight ${textClasses[color]}`}>{count}</div>
      <div className="text-xs font-bold text-slate-800 uppercase mt-1 tracking-widest">{title}</div>
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${styles[status]}`}>
      {status}
    </span>
  );
}
