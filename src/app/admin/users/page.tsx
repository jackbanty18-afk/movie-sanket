"use client";

import { useEffect, useState } from "react";
import { User, Shield, Ban, Clock, DollarSign, Ticket, AlertTriangle } from "lucide-react";

type UserData = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'banned' | 'suspended';
  bannedAt?: string | null;
  bannedReason?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  totalBookings: number;
  totalSpent: number;
};

type BookingData = {
  ticketId: string;
  movieTitle: string;
  theatreName: string;
  dateKey: string;
  time: string;
  seats: string;
  total: number;
  status: 'confirmed' | 'cancelled' | 'refunded' | 'pending';
  purchasedAt: string;
};

export default function AdminUsersPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userBookings, setUserBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading users with email:', email);
      
      const r = await fetch('/api/admin/users', { 
        headers: { 'x-user-email': email || '' } 
      });
      
      console.log('Response status:', r.status);
      
      const d = await r.json();
      console.log('Response data:', d);
      
      if (!r.ok) {
        setError(`Failed to load users: ${d.error || r.statusText}`);
        return;
      }
      
      setUsers(d.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBookings = async (userId: string) => {
    try {
      const r = await fetch(`/api/admin/bookings?userId=${userId}`, { 
        headers: { 'x-user-email': email || '' } 
      });
      const d = await r.json();
      setUserBookings(d.bookings || []);
    } catch (error) {
      console.error('Failed to load user bookings:', error);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleUserAction = async (userId: string, action: string, reason?: string, role?: string) => {
    try {
      const payload: any = { userId, action };
      if (reason) payload.reason = reason;
      if (role) payload.role = role;

      const r = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-email': email || '' 
        },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Failed to ${action}: ${err?.error || r.statusText}`);
        return;
      }

      await loadUsers();
      if (selectedUser?.id === userId) {
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (error) {
      alert(`Failed to ${action} user`);
    }
  };

  const banUser = () => {
    if (!selectedUser) return;
    const reason = prompt('Enter ban reason:');
    if (reason) {
      handleUserAction(selectedUser.id, 'ban', reason);
    }
  };

  const assignRole = () => {
    if (!selectedUser) return;
    const role = prompt('Enter role name (e.g., admin, moderator):');
    if (role) {
      handleUserAction(selectedUser.id, 'assignRole', undefined, role);
    }
  };

  const selectUser = (user: UserData) => {
    setSelectedUser(user);
    loadUserBookings(user.id);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'banned': return 'bg-red-600';
      case 'suspended': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'refunded': return 'text-yellow-400';
      case 'pending': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            User Management
          </h1>
          <a className="text-sm underline" href="/admin">Back to Admin</a>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-600/20 p-4 ring-1 ring-red-500/30">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
        {/* Users List */}
        <div className="lg:col-span-1">
          <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Users ({filteredUsers.length})</h2>
            
            {/* Search and Filter */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              
              <select
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {loading && <div className="text-center py-4">Loading...</div>}
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className={`cursor-pointer rounded-md p-3 ring-1 transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-pink-600/20 ring-pink-500/40'
                      : 'bg-white/5 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.fullName}</div>
                      <div className="text-sm text-white/70 truncate">{user.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                        {user.roles.length > 0 && (
                          <span className="text-xs text-blue-400">
                            {user.roles.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                    <span>{user.totalBookings} bookings</span>
                    <span>₹{user.totalSpent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedUser.fullName}
                    </h3>
                    <div className="text-sm text-white/70">{selectedUser.email}</div>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm text-white ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-white/70">Joined: </span>
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                    {selectedUser.lastLoginAt && (
                      <div className="text-sm">
                        <span className="text-white/70">Last Login: </span>
                        {new Date(selectedUser.lastLoginAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedUser.bannedAt && (
                      <div className="text-sm text-red-400">
                        <span>Banned: </span>
                        {new Date(selectedUser.bannedAt).toLocaleDateString()}
                        {selectedUser.bannedReason && (
                          <div className="text-xs mt-1">Reason: {selectedUser.bannedReason}</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4" />
                      <span>{selectedUser.totalBookings} bookings</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>₹{selectedUser.totalSpent} spent</span>
                    </div>
                    {selectedUser.roles.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4" />
                        <span>{selectedUser.roles.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
                  {selectedUser.status === 'banned' ? (
                    <button
                      onClick={() => handleUserAction(selectedUser.id, 'unban')}
                      className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-500"
                    >
                      Unban User
                    </button>
                  ) : (
                    <button
                      onClick={banUser}
                      className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-500"
                    >
                      Ban User
                    </button>
                  )}
                  
                  {selectedUser.status === 'suspended' ? (
                    <button
                      onClick={() => handleUserAction(selectedUser.id, 'activate')}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-500"
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                      className="px-3 py-1 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-500"
                    >
                      Suspend
                    </button>
                  )}
                  
                  <button
                    onClick={assignRole}
                    className="px-3 py-1 rounded bg-purple-600 text-white text-sm hover:bg-purple-500"
                  >
                    Assign Role
                  </button>
                </div>
              </div>

              {/* User Bookings */}
              <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Booking History ({userBookings.length})
                </h3>
                
                {userBookings.length === 0 ? (
                  <div className="text-white/70 text-sm">No bookings found.</div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {userBookings.map(booking => (
                      <div key={booking.ticketId} className="bg-white/5 rounded-md p-4 ring-1 ring-white/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{booking.movieTitle}</div>
                            <div className="text-sm text-white/70">
                              {booking.theatreName} • {booking.dateKey} {booking.time}
                            </div>
                            <div className="text-sm text-white/60">
                              Seats: {booking.seats} • ₹{booking.total}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              {new Date(booking.purchasedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className={`text-sm font-medium ${getBookingStatusColor(booking.status)}`}>
                            {booking.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-white/5 p-8 ring-1 ring-white/10 text-center text-white/70">
              Select a user to view details
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
