'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { generateRoomId } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface FormData {
  roomName: string;
  address: string;
  mealsPerDay: number;
  password: string;
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

export default function CreateRoomForm() {
  const [formData, setFormData] = useState<FormData>({
    roomName: '',
    address: '',
    mealsPerDay: 2,
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const uniqueRoomId = generateRoomId();
      
      // First, ensure user has a profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            full_name: user.email?.split('@')[0] || 'User',
          });
        
        if (profileError) throw profileError;
      }
      
      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_id: uniqueRoomId,
          room_name: formData.roomName,
          address: formData.address,
          meals_per_day: formData.mealsPerDay,
          password: formData.password,
          admin_id: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add admin as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          status: 'active',
          approved_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Create default meal settings
      const { error: settingsError } = await supabase
        .from('meal_settings')
        .insert({
          room_id: room.id,
        });

      if (settingsError) throw settingsError;

      toast.success(`Room created! Room ID: ${uniqueRoomId}`);
      router.push(`/room/${room.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Create New Room</h2>
      
      <div>
        <label className="block mb-1">Room Name</label>
        <input
          type="text"
          value={formData.roomName}
          onChange={(e) => setFormData({...formData, roomName: e.target.value})}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full p-2 border rounded text-black"
          rows={3}
          placeholder="House No, Road No, Block, Area"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Meals Per Day</label>
        <select
          value={formData.mealsPerDay}
          onChange={(e) => setFormData({...formData, mealsPerDay: Number(e.target.value)})}
          className="w-full p-2 border rounded text-black"
        >
          <option value={1}>1 Meal (Lunch only)</option>
          <option value={2}>2 Meals (Lunch & Dinner)</option>
          <option value={3}>3 Meals (Breakfast, Lunch & Dinner)</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Room Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}