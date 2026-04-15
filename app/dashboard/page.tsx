'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import CreateRoomForm from '@/app/components/room/CreateRoomForm';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Room {
  id: string;
  room_id: string;
  room_name: string;
}

interface PendingRequest {
  id: string;
  user_id: string;
  room_id: string;
  profiles: {
    username: string;
    full_name: string;
  };
  rooms: {
    room_name: string;
  };
}

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ErrorWithMessage).message === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return 'An unexpected error occurred';
}

export default function Dashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      await fetchRooms();
      await fetchPendingRequests();
    };
    init();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, get all active room IDs for the user
      const { data: memberships, error } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      if (memberships && memberships.length > 0) {
        // Then get the room details for each room ID
        const roomIds = memberships.map((m: { room_id: string }) => m.room_id);
        
        const { data: roomDetails, error: roomsError } = await supabase
          .from('rooms')
          .select('id, room_id, room_name')
          .in('id', roomIds);

        if (roomsError) {
          console.error('Error fetching room details:', roomsError);
          return;
        }

        if (roomDetails) {
          setRooms(roomDetails as Room[]);
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get rooms where user is admin
      const { data: adminRooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('admin_id', user.id);

      if (adminRooms && adminRooms.length > 0) {
        const { data: requests, error } = await supabase
          .from('room_members')
          .select(`
            id,
            user_id,
            room_id,
            profiles!inner (
              username,
              full_name
            ),
            rooms!inner (
              room_name
            )
          `)
          .eq('status', 'pending')
          .in('room_id', adminRooms.map(r => r.id));

        if (error) {
          console.error('Error fetching requests:', error);
          return;
        }

        if (requests && requests.length > 0) {
          // Transform the data to match PendingRequest interface
          const transformedRequests: PendingRequest[] = requests.map((req: any) => ({
            id: req.id,
            user_id: req.user_id,
            room_id: req.room_id,
            profiles: req.profiles, // profiles is already an object when using !inner
            rooms: req.rooms // rooms is already an object when using !inner
          }));
          setPendingRequests(transformedRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Find room by room_id
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, room_name, password')
        .eq('room_id', joinRoomId)
        .single();

      if (roomError) throw new Error('Room not found');
      
      if (room.password !== joinPassword) throw new Error('Invalid password');

      // Check if already a member
      const { data: existing } = await supabase
        .from('room_members')
        .select('status')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        throw new Error('Already a member or pending request');
      }

      // Add join request
      const { error: joinError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          status: 'pending',
        });

      if (joinError) throw joinError;

      toast.success('Join request sent! Waiting for admin approval.');
      setShowJoinForm(false);
      setJoinRoomId('');
      setJoinPassword('');
      
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

//   const handleApprove = async (requestId: string) => {
//     const { error } = await supabase
//       .from('room_members')
//       .update({ 
//         status: 'active',
//         approved_at: new Date().toISOString()
//       })
//       .eq('id', requestId);

//     if (error) {
//       toast.error('Failed to approve');
//     } else {
//       toast.success('Member approved');
//       await fetchPendingRequests();
//       await fetchRooms(); // Refresh rooms list
//     }
//   };




const handleApprove = async (requestId: string) => {
  const { error } = await supabase
    .from('room_members')
    .update({ 
      status: 'active',
      approved_at: new Date().toISOString()  // CRITICAL: Set this!
    })
    .eq('id', requestId);

  if (error) {
    toast.error('Failed to approve');
  } else {
    toast.success('Member approved');
    fetchPendingRequests();
    fetchRooms(); // Refresh the data
  }
};



  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mess Manager</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {!showCreateForm && !showJoinForm ? (
          <div className="text-center space-y-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg w-48"
            >
              + Create Room
            </button>
            <br />
            <button
              onClick={() => setShowJoinForm(true)}
              className="bg-green-500 text-white px-6 py-3 rounded-lg text-lg w-48"
            >
              Join Room
            </button>

            {rooms.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Your Rooms</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {rooms.map((room) => (
                    <Link
                      key={room.id}
                      href={`/room/${room.id}`}
                      className="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
                    >
                      <h3 className="text-xl font-semibold">{room.room_name}</h3>
                      <p className="text-gray-600">Room ID: {room.room_id}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-yellow-50 p-4 rounded flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{req.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">@{req.profiles?.username || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">Room: {req.rooms?.room_name || 'Unknown'}</p>
                      </div>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : showCreateForm ? (
          <div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-blue-500 hover:underline mb-4"
            >
              ← Back
            </button>
            <CreateRoomForm />
          </div>
        ) : (
          <div>
            <button
              onClick={() => setShowJoinForm(false)}
              className="text-blue-500 hover:underline mb-4"
            >
              ← Back
            </button>
            <form onSubmit={handleJoinRoom} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-xl font-bold mb-4">Join Room</h2>
              
              <div>
                <label className="block mb-1">Room ID</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="w-full p-2 border rounded text-black"
                  placeholder="Enter room ID"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Room Password</label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full p-2 border rounded text-black"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  {loading ? 'Sending...' : 'Join Room'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}