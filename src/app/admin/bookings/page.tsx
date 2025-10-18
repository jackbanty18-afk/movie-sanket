"use client";

import { useEffect, useState } from "react";
import { Ticket, Calendar, MapPin, User, DollarSign, Edit, RefreshCw } from "lucide-react";

type BookingData = {
  ticketId: string;
  userId: string;
  userEmail: string;
  userName: string;
  movieTitle: string;
  theatreName: string;
  dateKey: string;
  time: string;
  seats: string;
  total: number;
  status: 'confirmed' | 'cancelled' | 'refunded' | 'pending';
  refundAmount?: number | null;
  refundReason?: string | null;
  refundAt?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  purchasedAt: string;
  updatedAt: string;
};

export default function AdminBookingsPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isEditingSeats, setIsEditingSeats] = useState(false);
  const [newSeats, setNewSeats] = useState('');

  const loadBookings = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/admin/bookings', { 
        headers: { 'x-user-email': email || '' } 
      });
      const d = await r.json();
      setBookings(d.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleBookingAction = async (ticketId: string, action: string, payload?: any) => {
    try {
      const body = { ticketId, action, ...payload };
      
      const r = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-email': email || '' 
        },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Failed to ${action}: ${err?.error || r.statusText}`);
        return;
      }

      await loadBookings();
      const updatedBooking = bookings.find(b => b.ticketId === ticketId);
      if (updatedBooking && selectedBooking?.ticketId === ticketId) {
        setSelectedBooking({...updatedBooking});
      }
    } catch (error) {
      alert(`Failed to ${action} booking`);
    }
  };

  const processRefund = () => {
    if (!selectedBooking) return;
    const amount = prompt(`Enter refund amount (max: ₹${selectedBooking.total}):`);
    const reason = prompt('Enter refund reason:');
    
    if (amount && reason) {
      const refundAmount = parseFloat(amount);
      if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > selectedBooking.total) {
        alert('Invalid refund amount');
        return;
      }
      handleBookingAction(selectedBooking.ticketId, 'refund', { 
        refundAmount, 
        refundReason: reason 
      });
    }
  };

  const cancelBooking = () => {
    if (!selectedBooking) return;
    const reason = prompt('Enter cancellation reason:');
    if (reason) {
      handleBookingAction(selectedBooking.ticketId, 'cancel', { 
        cancellationReason: reason 
      });
    }
  };

  const updateSeats = () => {
    if (!selectedBooking || !newSeats.trim()) return;
    handleBookingAction(selectedBooking.ticketId, 'updateSeats', { 
      newSeats: newSeats.trim() 
    });
    setIsEditingSeats(false);
    setNewSeats('');
  };

  const startEditingSeats = () => {
    if (selectedBooking) {
      setNewSeats(selectedBooking.seats);
      setIsEditingSeats(true);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.movieTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600';
      case 'cancelled': return 'bg-red-600';
      case 'refunded': return 'bg-yellow-600';
      case 'pending': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusTextColor = (status: string) => {
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
          <Ticket className="h-6 w-6" />
          Booking Management
        </h1>
        <a className="text-sm underline" href="/admin">Back to Admin</a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bookings List */}
        <div className="lg:col-span-1">
          <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Bookings ({filteredBookings.length})</h2>
            
            {/* Search and Filter */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Search bookings..."
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
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {loading && <div className="text-center py-4">Loading...</div>}
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBookings.map(booking => (
                <div
                  key={booking.ticketId}
                  onClick={() => setSelectedBooking(booking)}
                  className={`cursor-pointer rounded-md p-3 ring-1 transition-colors ${
                    selectedBooking?.ticketId === booking.ticketId
                      ? 'bg-pink-600/20 ring-pink-500/40'
                      : 'bg-white/5 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-sm">{booking.movieTitle}</div>
                      <div className="text-xs text-white/70">{booking.userName}</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <div className="text-xs text-white/60">₹{booking.total}</div>
                    </div>
                    
                    <div className="text-xs text-white/50">
                      {booking.dateKey} • {booking.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="lg:col-span-2">
          {selectedBooking ? (
            <div className="space-y-6">
              {/* Booking Info */}
              <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedBooking.movieTitle}</h3>
                    <div className="text-sm text-white/70">Ticket ID: {selectedBooking.ticketId}</div>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm text-white ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <div>
                        <div>{selectedBooking.userName}</div>
                        <div className="text-xs text-white/60">{selectedBooking.userEmail}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedBooking.theatreName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{selectedBooking.dateKey} at {selectedBooking.time}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4" />
                      <div>
                        {isEditingSeats ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSeats}
                              onChange={e => setNewSeats(e.target.value)}
                              className="flex-1 rounded bg-white/10 px-2 py-1 text-xs"
                            />
                            <button
                              onClick={updateSeats}
                              className="text-green-400 hover:text-green-300 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingSeats(false);
                                setNewSeats('');
                              }}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>Seats: {selectedBooking.seats}</span>
                            <button
                              onClick={startEditingSeats}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>Total: ₹{selectedBooking.total}</span>
                    </div>
                    
                    <div className="text-sm">
                      <div className="text-white/70">Purchased: {new Date(selectedBooking.purchasedAt).toLocaleString()}</div>
                      <div className="text-white/70">Updated: {new Date(selectedBooking.updatedAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Refund/Cancellation Info */}
                {selectedBooking.refundAmount && (
                  <div className="mt-4 p-3 bg-yellow-600/20 rounded-md border border-yellow-600/30">
                    <div className="text-sm">
                      <div className="font-medium text-yellow-400">Refund Details</div>
                      <div className="text-white/80">Amount: ₹{selectedBooking.refundAmount}</div>
                      {selectedBooking.refundReason && (
                        <div className="text-white/80">Reason: {selectedBooking.refundReason}</div>
                      )}
                      {selectedBooking.refundAt && (
                        <div className="text-white/60">Refunded: {new Date(selectedBooking.refundAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedBooking.cancelledReason && (
                  <div className="mt-4 p-3 bg-red-600/20 rounded-md border border-red-600/30">
                    <div className="text-sm">
                      <div className="font-medium text-red-400">Cancellation Details</div>
                      <div className="text-white/80">Reason: {selectedBooking.cancelledReason}</div>
                      {selectedBooking.cancelledAt && (
                        <div className="text-white/60">Cancelled: {new Date(selectedBooking.cancelledAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={cancelBooking}
                        className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-500"
                      >
                        Cancel Booking
                      </button>
                      <button
                        onClick={processRefund}
                        className="px-3 py-1 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-500"
                      >
                        Process Refund
                      </button>
                    </>
                  )}
                  
                  {selectedBooking.status === 'pending' && (
                    <button
                      onClick={() => handleBookingAction(selectedBooking.ticketId, 'confirm')}
                      className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-500"
                    >
                      Confirm Booking
                    </button>
                  )}

                  {(selectedBooking.status === 'cancelled' || selectedBooking.status === 'refunded') && (
                    <button
                      onClick={() => handleBookingAction(selectedBooking.ticketId, 'reactivate')}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-500"
                    >
                      Reactivate Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-white/5 p-8 ring-1 ring-white/10 text-center text-white/70">
              Select a booking to view details
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}