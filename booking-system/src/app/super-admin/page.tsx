"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { LogoutButton } from "@/components/logout-button";
import { Search, X, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "FACULTY";
  loginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
};

type SortConfig = {
  key: "name" | "email" | null;
  direction: "asc" | "desc" | null;
};

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<"ADMIN" | "FACULTY">("ADMIN");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addError, setAddError] = useState("");

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Search and Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users?role=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: activeTab }),
      });
      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setIsAdding(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add user");
      }
    } catch (err) {
      setAddError("An error occurred");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert("Failed to delete user");
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const openResetModal = (id: string, name: string) => {
    setResetTargetUser({ id, name });
    setResetPasswordValue("");
    setResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (resetPasswordValue.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`/api/super-admin/users/${resetTargetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (res.ok) {
        alert(`Password for ${resetTargetUser.name} has been reset.`);
        setResetModalOpen(false);
        setResetTargetUser(null);
      } else {
        alert("Failed to reset password");
      }
    } catch (err) {
      alert("Error resetting password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSort = (key: "name" | "email") => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: null, direction: null };
      }
      return { key, direction: "asc" };
    });
  };

  const filteredAndSortedUsers = users
    .filter((u) => {
      const search = searchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (!sortConfig.key || !sortConfig.direction) return 0;
      
      const aValue = a[sortConfig.key].toLowerCase();
      const bValue = b[sortConfig.key].toLowerCase();

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ column }: { column: "name" | "email" }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-slate-900" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-slate-900" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <header className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-between p-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System Identity and Access Management</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Super Admin</span>
          <LogoutButton />
        </div>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-sm font-medium">
          <button
            onClick={() => { setActiveTab("ADMIN"); setIsAdding(false); }}
            className={`flex-1 py-4 text-center transition-colors ${activeTab === "ADMIN" ? "border-b-2 border-slate-900 text-slate-900 bg-slate-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}
          >
            Manage Admins
          </button>
          <button
            onClick={() => { setActiveTab("FACULTY"); setIsAdding(false); }}
            className={`flex-1 py-4 text-center transition-colors ${activeTab === "FACULTY" ? "border-b-2 border-slate-900 text-slate-900 bg-slate-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}
          >
            Manage Faculty
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {activeTab === "ADMIN" ? "Administrators" : "Faculty Members"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                {isAdding ? "Cancel" : `Add ${activeTab === "ADMIN" ? "Admin" : "Faculty"}`}
              </button>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleAddUser} className="mb-8 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Create New Account</h3>
              {addError && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{addError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                    placeholder="John Doe" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input 
                    required 
                    type="email" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                    placeholder="john@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Temporary Password</label>
                  <input 
                    required 
                    type="text" 
                    minLength={6} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                    placeholder="TempPass123" 
                  />
                </div>
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                Save Account
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading users...</div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              {searchTerm ? "No results found." : `No ${activeTab.toLowerCase()} accounts found.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th 
                      className={`px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors ${sortConfig.key === "name" ? "bg-slate-100 text-slate-900" : ""}`}
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name <SortIcon column="name" />
                      </div>
                    </th>
                    <th 
                      className={`px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors ${sortConfig.key === "email" ? "bg-slate-100 text-slate-900" : ""}`}
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Email <SortIcon column="email" />
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAndSortedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">LOCKED</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">ACTIVE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openResetModal(u.id, u.name)}
                          className="text-blue-600 hover:underline mr-4 font-medium text-xs"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="text-red-500 hover:underline font-medium text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {resetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleResetPasswordSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
              <p className="text-xs text-slate-600 mt-0.5">Enter a new temporary password for {resetTargetUser.name}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-900 mb-1.5">New Password</label>
              <input
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                required
                minLength={6}
                placeholder="New password (min 6 chars)"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting || resetPasswordValue.length < 6}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
