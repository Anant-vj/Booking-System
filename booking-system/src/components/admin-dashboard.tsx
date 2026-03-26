"use client";
import { useEffect, useState, useRef, useCallback } from "react";

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

type TabId = "bookings" | "calendar" | "reports" | "security";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "bookings", label: "Bookings", icon: "📋" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "security", label: "Security", icon: "🔐" },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("bookings");
  const [loading, setLoading] = useState(true);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allHallsWithBookings, setAllHallsWithBookings] = useState<any[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [throttleAudits, setThrottleAudits] = useState<ThrottleAudit[]>([]);

  // Pagination & Filtering
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const ITEMS_PER_PAGE = 8;

  // Reports Preview
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month">("week");
  const [printing, setPrinting] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<ReportPeriod>("week");
  const [printData, setPrintData] = useState<Booking[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, availabilityRes, reportsRes, auditRes] = await Promise.all([
        fetch("/api/admin/bookings"),
        fetch("/api/halls/availability"),
        fetch(`/api/admin/reports?period=${reportPeriod}`),
        fetch("/api/admin/throttle-audits"),
      ]);

      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (availabilityRes.ok) setAllHallsWithBookings(await availabilityRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (auditRes.ok) setThrottleAudits(await auditRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [reportPeriod]);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  // Bookings Derived State
  const filteredBookings = bookings.filter((b) => bookingFilter === "ALL" || b.status === bookingFilter);
  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));
  const paginatedBookings = filteredBookings.slice(
    (bookingPage - 1) * ITEMS_PER_PAGE,
    bookingPage * ITEMS_PER_PAGE
  );

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) void loadData();
    else alert("Failed to update booking status.");
  }

  async function handlePrintRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrinting(true);
    try {
      const res = await fetch(`/api/admin/reports?period=${printPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setPrintData(data.previewBookings || []);
        // Allow state to render the print table, then trigger print
        setTimeout(() => {
          window.print();
          setPrinting(false);
        }, 500);
      }
    } catch {
      alert("Failed to fetch print data");
      setPrinting(false);
    }
  }

  if (loading && !bookings.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500 font-medium">Loading command center…</span>
      </div>
    );
  }

  return (
    <>
      {/* 
        This div wraps the normal application UI. It gets hidden via
        print:hidden when the user prints the report.
      */}
      <div className="print:hidden space-y-6 mt-6">

        {/* Desktop & Mobile Tab Navigation */}
        <nav className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 📋 BOOKINGS SECTION */}
        {activeTab === "bookings" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 p-5 sm:p-6 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Bookings</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and act upon faculty hall requests. Order: Latest first.
                  </p>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setBookingFilter(filter);
                        setBookingPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors ${
                        bookingFilter === filter
                          ? filter === "PENDING" ? "bg-amber-100 text-amber-700 shadow-sm"
                            : filter === "APPROVED" ? "bg-green-100 text-green-700 shadow-sm"
                            : filter === "REJECTED" ? "bg-red-100 text-red-700 shadow-sm"
                            : "bg-white text-blue-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-slate-200/50"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Submission</th>
                    <th className="px-6 py-4">Faculty</th>
                    <th className="px-6 py-4">Hall & Pax</th>
                    <th className="px-6 py-4">Required Time</th>
                    <th className="px-6 py-4">Purpose</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDateTime(b.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{b.user.name || "Unknown"}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{b.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{b.hall.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">Pax: {b.numberOfParticipants || 1}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{formatDateTime(b.startTime)}</div>
                        <div className="text-gray-500 text-xs mt-0.5">to {formatDateTime(b.endTime)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={b.purpose || ""}>
                        {b.purpose || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {b.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void updateStatus(b.id, "APPROVED")}
                              className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => void updateStatus(b.id, "REJECTED")}
                              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <div className="text-lg mb-1">📭</div>
                        No bookings found matching the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalBookingPages > 1 && (
              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <Pagination page={bookingPage} totalPages={totalBookingPages} onPageChange={setBookingPage} />
              </div>
            )}
          </section>
        )}

        {/* 📅 CALENDAR SECTION */}
        {activeTab === "calendar" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 overflow-x-auto w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Global Calendar</h2>
            <p className="text-sm text-gray-500 mb-6">
              Visualizes all approved bookings across all halls.
            </p>
            <div className="min-w-[700px]">
              <HallAvailabilityCalendar halls={allHallsWithBookings} />
            </div>
          </section>
        )}

        {/* 📊 REPORTS SECTION */}
        {activeTab === "reports" && reports && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 p-5 sm:p-6 bg-slate-50/50">
              <div className="flex flex-col md:flex-row justify-between gap-6 md:items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Analytics & Reports</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Booking overview and detailed data export.
                  </p>
                </div>
                
                {/* Print Control Form */}
                <form onSubmit={handlePrintRequest} className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase px-2">Print Export</span>
                  <select 
                    value={printPeriod}
                    onChange={(e) => setPrintPeriod(e.target.value as ReportPeriod)}
                    className="text-sm border-gray-300 rounded-md focus:ring-blue-500 py-1.5 focus:border-blue-500"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                  <button 
                    disabled={printing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {printing ? "Preparing..." : "🖨️ Print"}
                  </button>
                </form>
              </div>

              {/* Stats Period Toggle */}
              <div className="mt-8 flex gap-2">
                {(["today", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      reportPeriod === p 
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-gray-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                  </button>
                ))}
              </div>

              {/* Stats Cards */}
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Requests" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].total} color="blue" />
                <StatCard title="Approved" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].APPROVED} color="green" />
                <StatCard title="Pending" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].PENDING} color="amber" />
                <StatCard title="Rejected" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].REJECTED} color="red" />
                <StatCard title="Cancelled" count={reports[reportPeriod === "today" ? "today" : reportPeriod === "week" ? "thisWeek" : "thisMonth"].CANCELLED} color="slate" />
              </div>
            </div>

            {/* Detailed Preview Table */}
            <div className="p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Detailed Log <span className="text-gray-400 font-normal">({reportPeriod === "today" ? "Today" : reportPeriod === "week" ? "This Week" : "This Month"})</span>
              </h3>
              <div className="overflow-x-auto w-full border border-slate-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold text-gray-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">Faculty</th>
                      <th className="px-4 py-3">Hall</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
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
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 overflow-x-auto w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Security Audit Log</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tracks rate-limiting interventions and system actions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-gray-500 uppercase">
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
                        {a.adminUser.name || a.adminUser.email}
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
          </section>
        )}
      </div>

      {/* 
        🖨️ PRINT VIEW 
        Only visible when browser prints. Hidden on screen.
      */}
      <div className="hidden print:block font-sans text-black">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-3xl font-bold">Hall Booking System - Report</h1>
          <p className="text-sm mt-1 text-slate-600">
            Exported on: {new Date().toLocaleString()} | Period: {printPeriod.toUpperCase()}
          </p>
        </div>
        
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-400">
              <th className="py-2 pr-4">Faculty Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Hall & Pax</th>
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
                  <div className="text-xs text-slate-500 mt-0.5">Pax: {b.numberOfParticipants}</div>
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
    <div className={`rounded-xl border p-4 shadow-sm flex flex-col items-center justify-center ${bgClasses[color]}`}>
      <div className={`text-3xl font-black tracking-tight ${textClasses[color]}`}>{count}</div>
      <div className="text-xs font-semibold text-gray-500 uppercase mt-1 tracking-widest">{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<BookingStatus, string> = {
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    CANCELLED: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border ${styles[status]}`}>
      {status}
    </span>
  );
}
