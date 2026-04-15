'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentMonthYear } from '@/app/lib/utils';

interface Room {
  id: string;
  room_id: string;
  room_name: string;
  address: string;
  admin_id: string;
}

interface FeatureCard {
  title: string;
  icon: string;
  href: string;
  color: string;
  description: string;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalBalance, setGlobalBalance] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);
      setIsAdmin(roomData.admin_id === user.id);

      // Calculate global balance
      const currentMonth = getCurrentMonthYear();
      
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      const { data: shopping } = await supabase
        .from('shopping')
        .select('amount')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      const totalDeposit = deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalShopping = shopping?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      setGlobalBalance(totalDeposit - totalShopping);

    } catch (error) {
      console.error('Error fetching room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const features: FeatureCard[] = [
    {
      title: 'Meal',
      icon: '🍽️',
      href: `meal`,
      color: 'bg-blue-500',
      description: 'Manage daily meals and view monthly totals'
    },
    {
      title: 'Deposit',
      icon: '💰',
      href: `deposit`,
      color: 'bg-green-500',
      description: 'Track member deposits and payments'
    },
    {
      title: 'Shopping',
      icon: '🛒',
      href: `shopping`,
      color: 'bg-purple-500',
      description: 'Manage shopping expenses'
    },
    {
      title: 'Total This Month',
      icon: '📊',
      href: `total`,
      color: 'bg-orange-500',
      description: 'View monthly summary and meal rate'
    },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl">Loading...</div>
      </div>
    </div>
  );
  
  if (!room) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl text-red-600">Room not found</div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-blue-500 hover:underline"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{room.room_name}</h1>
              <p className="text-gray-600 mt-1">{room.address}</p>
              <p className="text-sm text-gray-500 mt-2">Room ID: {room.room_id}</p>
              {isAdmin && (
                <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Admin Access
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
            >
              Dashboard
            </button>

            
          </div>
          
          {/* Global Balance */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Global Current Balance</p>
            <p className={`text-2xl font-bold ${globalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ৳{globalBalance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total Deposit - Total Shopping
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={`/room/${roomId}/${feature.href}`}
              className={`${feature.color} text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer`}
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="text-sm opacity-90 mt-2">{feature.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Members</p>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Today's Meals</p>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Monthly Meals</p>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}