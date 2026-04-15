'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import toast from 'react-hot-toast';

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

export default function JoinRoomForm() {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Verify room exists and password is correct
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, room_name, password')
        .eq('room_id', roomId)
        .single();

      if (roomError) throw new Error('Room not found');
      
      if (room.password !== password) throw new Error('Invalid password');

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('status')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          toast.error('You are already a member of this room');
          router.push(`/room/${room.id}`);
          return;
        } else if (existingMember.status === 'pending') {
          toast.error('Your request is pending approval');
          return;
        }
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
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Join Room</h2>
      
      <div>
        <label className="block mb-1">Room ID</label>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full p-2 border rounded text-black"
          placeholder="Enter room ID"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Room Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        {loading ? 'Sending request...' : 'Join Room'}
      </button>
    </form>
  );
}