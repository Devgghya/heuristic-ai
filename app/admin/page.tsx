"use client";

"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Shield, Zap, User, ArrowUpDown, Rocket, Coffee } from "lucide-react";

interface AdminUser {
    user_id: string;
    plan: string;
    audits_used: number;
    token_limit: number;
    last_active: string;
    total_scans: number;
    first_name: string;
    last_name: string;
    email: string;
    image_url: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminUser; direction: 'asc' | 'desc' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetch("/api/admin/users")
            .then((res) => res.json())
            .then((data) => {
                if (data.users) setUsers(data.users);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filteredUsers = users.filter((u) =>
        u.user_id.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof AdminUser) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDowngrade = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user's subscription? They will be downgraded to the Free plan immediately.")) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/manage-user", {
                method: "POST",
                body: JSON.stringify({ userId, action: "downgrade" }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                // Update local state
                setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan: "free" } : u));
                if (selectedUser) setSelectedUser({ ...selectedUser, plan: "free" });
                alert("User downgraded to Free plan.");
            } else {
                alert("Failed to update user.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating user.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                    <p className="text-slate-400">Overview of all registered users and their usage.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search User ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-[#121214] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-64 text-white"
                    />
                </div>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left bg-transparent">
                    <thead>

                        <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('first_name')}>User</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('plan')}>Plan</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('audits_used')}>Monthly Usage</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('total_scans')}>Lifetime Scans</th>
                            <th className="px-6 py-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort('last_active')}>Last Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedUsers.map((user) => (
                            <tr
                                key={user.user_id}
                                className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                                onClick={() => setSelectedUser(user)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden">
                                            {user.image_url ? <img src={user.image_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{user.first_name} {user.last_name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                            <p className="font-mono text-[10px] text-slate-600 truncate w-32" title={user.user_id}>
                                                {user.user_id}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.plan === "pro" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                                            <SparklesIcon className="w-3 h-3" /> Pro
                                        </span>
                                    ) : user.plan === "plus" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                                            <Rocket className="w-3 h-3" /> Plus
                                        </span>
                                    ) : user.plan === "lite" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                                            <Coffee className="w-3 h-3" /> Lite
                                        </span>
                                    ) : user.plan === "agency" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                                            <Shield className="w-3 h-3" /> Agency
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-bold">
                                            Free
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 w-32">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{user.audits_used}</span>
                                            <span>{user.plan === 'free' ? '2' : user.plan === 'lite' ? '5' : user.plan === 'plus' ? '12' : '∞'}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${user.plan === 'pro' ? 'bg-indigo-500' : 'bg-slate-500'}`}
                                                style={{ width: `${Math.min((user.audits_used / (user.plan === 'free' ? 2 : user.plan === 'lite' ? 5 : user.plan === 'plus' ? 12 : 100)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        {user.total_scans}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-slate-500 font-mono">
                                    {user.last_active ? new Date(user.last_active).toLocaleDateString() : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        No users found matching your search.
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#202023]">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden border-2 border-white/10">
                                    {selectedUser.image_url ? <img src={selectedUser.image_url} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedUser.first_name} {selectedUser.last_name}</h2>
                                    <p className="text-slate-400">{selectedUser.email}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-slate-400">{selectedUser.user_id}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Usage Plan</h3>
                                <div className="text-xl font-bold capitalize text-white">{selectedUser.plan} Tier</div>
                                <div className="text-sm text-slate-400 mt-1">Audit Limit: {selectedUser.plan === 'free' ? '2' : selectedUser.plan === 'lite' ? '5' : selectedUser.plan === 'plus' ? '12' : 'Unlimited'}</div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Activity</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-400 text-sm">Monthly Audits</span>
                                    <span className="text-white font-bold">{selectedUser.audits_used}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Total Lifetime</span>
                                    <span className="text-amber-500 font-bold">{selectedUser.total_scans}</span>
                                </div>
                            </div>
                        </div>

                        {selectedUser.plan !== "free" && (
                            <div className="px-6 pb-6">
                                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-red-400">Manage Subscription</h3>
                                        <p className="text-xs text-red-500/70 mt-1">Remove Pro/Agency status and revert to Free limits.</p>
                                    </div>
                                    <button
                                        onClick={() => handleDowngrade(selectedUser.user_id)}
                                        disabled={actionLoading}
                                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {actionLoading ? "Processing..." : "Revoke Plan"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="px-6 pb-6 pt-0">
                            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4">Raw Data</h3>
                            <pre className="bg-black text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-40 border border-white/10">
                                {JSON.stringify(selectedUser, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
