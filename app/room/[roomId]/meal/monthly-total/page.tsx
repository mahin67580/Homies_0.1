
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { ensureDailyMealsExist } from '@/app/lib/mealUtils';
import { getLocalToday, formatLocalDate } from '@/app/lib/dateUtils';
import React from 'react';

interface DailyRow {
  date: string;
  members: { userId: string; lunch: number; dinner: number }[];
}

interface MemberInfo {
  id: string;
  name: string;
  joinDate: string;
}

export default function MonthlyTotalPage() {
  const { roomId } = useParams();
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [membersList, setMembersList] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [roomId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await ensureDailyMealsExist(roomId as string);

      const today = getLocalToday();
      const [year, month] = today.split('-');
      const startDate = `${year}-${month}-01`;

      // Get active members with join dates
const { data: members, error: membersError } = await supabase
  .from('room_members')
  .select('user_id, approved_at, joined_at')
  .eq('room_id', roomId)
  .eq('status', 'active');

if (membersError || !members?.length) {
  setMembersList([]);
  setDailyData([]);
  setLoading(false);
  return;
}



// 2. Fetch profile names separately
const userIds = members.map(m => m.user_id);
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name')
  .in('id', userIds);

const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

const memberList: MemberInfo[] = members.map(m => ({
  id: m.user_id,
  name: profileMap.get(m.user_id) || 'Unknown',
  joinDate: (m.approved_at || m.joined_at)?.split('T')[0] || getLocalToday(),
}));
setMembersList(memberList);




      // Get all meals for the month (up to today)
      const { data: meals } = await supabase
        .from('daily_meals')
        .select('user_id, meal_date, lunch, dinner')
        .eq('room_id', roomId)
        .gte('meal_date', startDate)
        .lte('meal_date', today)
        .order('meal_date', { ascending: true });

      const dateMap = new Map<string, Map<string, { lunch: number; dinner: number }>>();
      meals?.forEach(meal => {
        if (!dateMap.has(meal.meal_date)) dateMap.set(meal.meal_date, new Map());
        const userMap = dateMap.get(meal.meal_date)!;
        userMap.set(meal.user_id, { lunch: meal.lunch, dinner: meal.dinner });
      });

      // Generate rows from startDate to today (inclusive)
      const rows: DailyRow[] = [];
      let current = new Date(startDate);
      const end = new Date(today);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const userMap = dateMap.get(dateStr) || new Map();
        const membersRow = memberList.map(m => ({
          userId: m.id,
          lunch: dateStr < m.joinDate ? 0 : (userMap.get(m.id)?.lunch ?? 0),
          dinner: dateStr < m.joinDate ? 0 : (userMap.get(m.id)?.dinner ?? 0),
        }));
        rows.push({ date: dateStr, members: membersRow });
        current.setDate(current.getDate() + 1);
      }
      setDailyData(rows);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading daily meals...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4">
          ← Back to Meal Menu
        </button>
        <h1 className="text-3xl font-bold mb-2">
          Total Meal Count of {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h1>
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2">Date</th>
                {membersList.map(m => (
                  <th key={m.id} colSpan={2} className="border p-2 text-center">{m.name}</th>
                ))}
              </tr>
              <tr>
                <th className="border p-2"></th>
                {membersList.map(m => (
                  <React.Fragment key={m.id}>
                    <th className="border p-2 text-center">L</th>
                    <th className="border p-2 text-center">D</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyData.map(row => (
                <tr key={row.date}>
                  <td className="border p-2">{formatLocalDate(row.date)}</td>
                  {row.members.map(m => (
                    <React.Fragment key={m.userId}>
                      <td className="border p-2 text-center">{m.lunch}</td>
                      <td className="border p-2 text-center">{m.dinner}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="border p-2">Total Meal</td>
                {membersList.map(m => {
                  const totalLunch = dailyData.reduce(
                    (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.lunch || 0),
                    0
                  );
                  const totalDinner = dailyData.reduce(
                    (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.dinner || 0),
                    0
                  );
                  return (
                    <React.Fragment key={m.id}>
                      <td className="border p-2 text-center">{totalLunch}</td>
                      <td className="border p-2 text-center">{totalDinner}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          🍽 Meals are automatically set to 1 lunch + 1 dinner per day from the member's join date.
          Zeros are shown for days before they joined or before the start of the month.
        </p>
      </div>
    </div>
  );
}