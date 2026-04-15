'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import toast from 'react-hot-toast';

export default function MealSettingsPage() {
  const { roomId } = useParams();
  const [lunchCutoff, setLunchCutoff] = useState('14:00');
  const [dinnerCutoff, setDinnerCutoff] = useState('21:00');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetch();
  }, [roomId]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: room } = await supabase
        .from('rooms')
        .select('admin_id')
        .eq('id', roomId)
        .single();

      if (room?.admin_id !== user.id) {
        toast.error('Only admin can access settings');
        router.back();
        return;
      }

      setIsAdmin(true);

      const { data: settings } = await supabase
        .from('meal_settings')
        .select('lunch_cutoff_time, dinner_cutoff_time')
        .eq('room_id', roomId)
        .single();

      if (settings) {
        setLunchCutoff(settings.lunch_cutoff_time);
        setDinnerCutoff(settings.dinner_cutoff_time);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('meal_settings')
      .update({
        lunch_cutoff_time: lunchCutoff,
        dinner_cutoff_time: dinnerCutoff,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId);

    if (error) {
      toast.error('Failed to update settings');
    } else {
      toast.success('Meal cutoff times updated');
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Meal Cutoff Times</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lunch Cutoff Time
              </label>
              <input
                type="time"
                value={lunchCutoff}
                onChange={(e) => setLunchCutoff(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Members cannot edit lunch after this time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dinner Cutoff Time
              </label>
              <input
                type="time"
                value={dinnerCutoff}
                onChange={(e) => setDinnerCutoff(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Members cannot edit dinner after this time
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Save Settings
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
