// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import toast from 'react-hot-toast';

// interface MemberMonthlyMeal {
//   user_id: string;
//   full_name: string;
//   total_lunch: number;
//   total_dinner: number;
//   total_meals: number;
// }





// export default function MonthlyTotalPage() {
//   const { roomId } = useParams();
//   const [members, setMembers] = useState<MemberMonthlyMeal[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentMonth, setCurrentMonth] = useState('');
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     fetchMonthlyData();
//   }, [roomId]);

//   const fetchMonthlyData = async () => {
//     try {
//       // Get current date
//       const now = new Date();
//       const year = now.getFullYear();
//       const month = now.getMonth() + 1; // JavaScript months are 0-indexed
      
//       // Calculate first day of current month
//       const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
//       // Calculate last day of current month
//       const lastDay = new Date(year, month, 0).getDate();
//       const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      
//       setCurrentMonth(`${year}-${String(month).padStart(2, '0')}`);
      
//       console.log('Date range:', startDate, 'to', endDate); // Debug log

//       // Get active members
//       const { data: membersList, error: membersError } = await supabase
//         .from('room_members')
//         .select(`
//           user_id,
//           profiles!inner (full_name)
//         `)
//         .eq('room_id', roomId)
//         .eq('status', 'active');

//       if (membersError) {
//         console.error('Error fetching members:', membersError);
//         return;
//       }

//       if (!membersList || membersList.length === 0) {
//         console.log('No active members found');
//         return;
//       }

//       // Get meal data for each member for current month only
//       const monthlyData = await Promise.all(
//         membersList.map(async (member) => {
//           const { data: meals, error: mealsError } = await supabase
//             .from('daily_meals')
//             .select('lunch, dinner, meal_date')
//             .eq('room_id', roomId)
//             .eq('user_id', member.user_id)
//             .gte('meal_date', startDate)
//             .lte('meal_date', endDate);

//           if (mealsError) {
//             console.error(`Error fetching meals for ${member.user_id}:`, mealsError);
//             return {
//               user_id: member.user_id,
//               full_name: member.profiles.full_name,
//               total_lunch: 0,
//               total_dinner: 0,
//               total_meals: 0,
//             };
//           }

//           const totalLunch = meals?.reduce((sum, m) => sum + (m.lunch || 0), 0) || 0;
//           const totalDinner = meals?.reduce((sum, m) => sum + (m.dinner || 0), 0) || 0;

//           console.log(`${member.profiles.full_name}: Lunch=${totalLunch}, Dinner=${totalDinner}`); // Debug log

//           return {
//             user_id: member.user_id,
//             full_name: member.profiles.full_name,
//             total_lunch: totalLunch,
//             total_dinner: totalDinner,
//             total_meals: totalLunch + totalDinner,
//           };
//         })
//       );

//       setMembers(monthlyData);
//     } catch (error) {
//       console.error('Error in fetchMonthlyData:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const totalLunch = members.reduce((sum, m) => sum + m.total_lunch, 0);
//   const totalDinner = members.reduce((sum, m) => sum + m.total_dinner, 0);
//   const totalMeals = members.reduce((sum, m) => sum + m.total_meals, 0);

//   if (loading) return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="text-center">
//         <div className="text-xl">Loading monthly data...</div>
//       </div>
//     </div>
//   );


  

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-4xl mx-auto">
//         <button
//           onClick={() => router.back()}
//           className="text-blue-500 hover:underline mb-4"
//         >
//           ← Back to Meal Menu
//         </button>

//         <h1 className="text-3xl font-bold mb-2">Monthly Meal Summary</h1>
//         <p className="text-gray-600 mb-6">
//           Showing data for: <span className="font-semibold">{currentMonth}</span>
//         </p>

//         {members.length === 0 ? (
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
//             <p className="text-yellow-800">No meal data found for this month.</p>
//           </div>
//         ) : (
//           <div className="bg-white rounded-lg shadow overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Member
//                     </th>
//                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Lunch
//                     </th>
//                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Dinner
//                     </th>
//                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Total
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {members.map((member, idx) => (
//                     <tr key={member.user_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                       <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
//                         {member.full_name}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
//                         {member.total_lunch}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
//                         {member.total_dinner}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-gray-900">
//                         {member.total_meals}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//                 <tfoot className="bg-gray-100 font-semibold">
//                   <tr>
//                     <td className="px-6 py-4 text-right">Total:</td>
//                     <td className="px-6 py-4 text-center">{totalLunch}</td>
//                     <td className="px-6 py-4 text-center">{totalDinner}</td>
//                     <td className="px-6 py-4 text-center">{totalMeals}</td>
//                   </tr>
//                 </tfoot>
//               </table>
//             </div>
//           </div>
//         )}

//         <div className="mt-4 text-sm text-gray-500">
//           <p>💡 Tip: Meals are automatically set to 1 lunch and 1 dinner per day for each member.</p>
//           <p>📅 Only meals from {currentMonth} are shown here.</p>
//         </div>
//       </div>
//     </div>
//   );
// }


// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import { ensureDailyMealsExist } from '@/app/lib/mealUtils';

// interface DailyRow {
//   date: string;
//   members: { userId: string; lunch: number; dinner: number }[];
// }

// export default function MonthlyTotalPage() {
//   const { roomId } = useParams();
//   const [dailyData, setDailyData] = useState<DailyRow[]>([]);
//   const [membersList, setMembersList] = useState<{ id: string; name: string }[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     fetchData();
//   }, [roomId]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       // Auto-create missing meals from month start to today
//       await ensureDailyMealsExist(roomId as string);

//       const now = new Date();
//       const year = now.getFullYear();
//       const month = now.getMonth() + 1;
//       const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
//       const today = now.toISOString().split('T')[0];

//       // 1. Get active members with names
//       const { data: members } = await supabase
//         .from('room_members')
//         .select('user_id, profiles(full_name)')
//         .eq('room_id', roomId)
//         .eq('status', 'active');
//       const memberList = members?.map(m => ({ id: m.user_id, name: m.profiles.full_name })) || [];
//       setMembersList(memberList);
//       if (memberList.length === 0) {
//         setDailyData([]);
//         setLoading(false);
//         return;
//       }

//       // 2. Get all daily meals for the month
//       const { data: meals } = await supabase
//         .from('daily_meals')
//         .select('user_id, meal_date, lunch, dinner')
//         .eq('room_id', roomId)
//         .gte('meal_date', startDate)
//         .lte('meal_date', today)
//         .order('meal_date', { ascending: true });

//       // 3. Build map: date -> userId -> { lunch, dinner }
//       const dateMap = new Map<string, Map<string, { lunch: number; dinner: number }>>();
//       meals?.forEach(meal => {
//         if (!dateMap.has(meal.meal_date)) dateMap.set(meal.meal_date, new Map());
//         const userMap = dateMap.get(meal.meal_date)!;
//         userMap.set(meal.user_id, { lunch: meal.lunch, dinner: meal.dinner });
//       });

//       // 4. Build rows for each date
//       const rows: DailyRow[] = [];
//       let current = new Date(startDate);
//       while (current <= now) {
//         const dateStr = current.toISOString().split('T')[0];
//         const userMap = dateMap.get(dateStr) || new Map();
//         const membersRow = memberList.map(m => ({
//           userId: m.id,
//           lunch: userMap.get(m.id)?.lunch ?? 0,
//           dinner: userMap.get(m.id)?.dinner ?? 0,
//         }));
//         rows.push({ date: dateStr, members: membersRow });
//         current.setDate(current.getDate() + 1);
//       }
//       setDailyData(rows);
//     } catch (error) {
//       console.error('Error fetching daily breakdown:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
//   };

//   if (loading) return <div className="text-center py-10">Loading daily meals...</div>;

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-6xl mx-auto">
//         <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4">
//           ← Back to Meal Menu
//         </button>
//         <h1 className="text-3xl font-bold mb-2">Total Meal Count of {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h1>

//         <div className="overflow-x-auto bg-white rounded shadow">
//           <table className="min-w-full border-collapse">
//             <thead>
//               <tr>
//                 <th className="border p-2">Date</th>
//                 {membersList.map(m => (
//                   <th key={m.id} colSpan={2} className="border p-2 text-center">
//                     {m.name}
//                   </th>
//                 ))}
//               </tr>
//               <tr>
//                 <th className="border p-2"></th>
//                 {membersList.map(m => (
//                   <React.Fragment key={m.id}>
//                     <th className="border p-2 text-center">L</th>
//                     <th className="border p-2 text-center">D</th>
//                   </React.Fragment>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dailyData.map(row => (
//                 <tr key={row.date}>
//                   <td className="border p-2">{formatDate(new Date(row.date))}</td>
//                   {row.members.map(m => (
//                     <React.Fragment key={m.userId}>
//                       <td className="border p-2 text-center">{m.lunch}</td>
//                       <td className="border p-2 text-center">{m.dinner}</td>
//                     </React.Fragment>
//                   ))}
//                 </tr>
//               ))}
//               {/* Totals row */}
//               <tr className="bg-gray-100 font-bold">
//                 <td className="border p-2">Total Meal</td>
//                 {membersList.map(m => {
//                   const totalLunch = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.lunch || 0),
//                     0
//                   );
//                   const totalDinner = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.dinner || 0),
//                     0
//                   );
//                   return (
//                     <React.Fragment key={m.id}>
//                       <td className="border p-2 text-center">{totalLunch}</td>
//                       <td className="border p-2 text-center">{totalDinner}</td>
//                     </React.Fragment>
//                   );
//                 })}
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }


// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import { ensureDailyMealsExist } from '@/app/lib/mealUtils';
// import React from 'react';

// interface DailyRow {
//   date: string;
//   members: { userId: string; lunch: number; dinner: number }[];
// }

// interface MemberInfo {
//   id: string;
//   name: string;
//   joinDate: string;
// }

// export default function MonthlyTotalPage() {
//   const { roomId } = useParams();
//   const [dailyData, setDailyData] = useState<DailyRow[]>([]);
//   const [membersList, setMembersList] = useState<MemberInfo[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     fetchData();
//   }, [roomId]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       // Ensure all meals exist from each member's join date to today
//       await ensureDailyMealsExist(roomId as string);

//       const now = new Date();
//       const year = now.getFullYear();
//       const month = now.getMonth() + 1;
//       const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
//       const today = now.toISOString().split('T')[0];

//       // Get active members with their join dates
//       const { data: members } = await supabase
//         .from('room_members')
//         .select('user_id, approved_at, joined_at, profiles(full_name)')
//         .eq('room_id', roomId)
//         .eq('status', 'active');

//       if (!members || members.length === 0) {
//         setMembersList([]);
//         setDailyData([]);
//         setLoading(false);
//         return;
//       }

//       const memberList: MemberInfo[] = members.map(m => ({
//         id: m.user_id,
//         name: m.profiles.full_name,
//         joinDate: (m.approved_at || m.joined_at)?.split('T')[0] || today,
//       }));
//       setMembersList(memberList);

//       // Get all daily meals for the month
//       const { data: meals } = await supabase
//         .from('daily_meals')
//         .select('user_id, meal_date, lunch, dinner')
//         .eq('room_id', roomId)
//         .gte('meal_date', startDate)
//         .lte('meal_date', today)
//         .order('meal_date', { ascending: true });

//       // Build map: date -> userId -> { lunch, dinner }
//       const dateMap = new Map<string, Map<string, { lunch: number; dinner: number }>>();
//       meals?.forEach(meal => {
//         if (!dateMap.has(meal.meal_date)) dateMap.set(meal.meal_date, new Map());
//         const userMap = dateMap.get(meal.meal_date)!;
//         userMap.set(meal.user_id, { lunch: meal.lunch, dinner: meal.dinner });
//       });

//       // Generate rows for each day from startDate to today
//       const rows: DailyRow[] = [];
//       let current = new Date(startDate);
//       while (current <= now) {
//         const dateStr = current.toISOString().split('T')[0];
//         const userMap = dateMap.get(dateStr) || new Map();
//         const membersRow = memberList.map(m => {
//           const isBeforeJoin = dateStr < m.joinDate;
//           return {
//             userId: m.id,
//             lunch: isBeforeJoin ? 0 : (userMap.get(m.id)?.lunch ?? 0),
//             dinner: isBeforeJoin ? 0 : (userMap.get(m.id)?.dinner ?? 0),
//           };
//         });
//         rows.push({ date: dateStr, members: membersRow });
//         current.setDate(current.getDate() + 1);
//       }
//       setDailyData(rows);
//     } catch (error) {
//       console.error('Error fetching daily breakdown:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
//   };

//   if (loading) return <div className="text-center py-10">Loading daily meals...</div>;

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-7xl mx-auto">
//         <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4">
//           ← Back to Meal Menu
//         </button>
//         <h1 className="text-3xl font-bold mb-2">
//           Total Meal Count of {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
//         </h1>

//         <div className="overflow-x-auto bg-white rounded shadow">
//           <table className="min-w-full border-collapse">
//             <thead>
//               <tr>
//                 <th className="border p-2">Date</th>
//                 {membersList.map(m => (
//                   <th key={m.id} colSpan={2} className="border p-2 text-center">
//                     {m.name}
//                   </th>
//                 ))}
//               </tr>
//               <tr>
//                 <th className="border p-2"></th>
//                 {membersList.map(m => (
//                   <React.Fragment key={m.id}>
//                     <th className="border p-2 text-center">L</th>
//                     <th className="border p-2 text-center">D</th>
//                   </React.Fragment>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dailyData.map(row => (
//                 <tr key={row.date}>
//                   <td className="border p-2">{formatDate(new Date(row.date))}</td>
//                   {row.members.map(m => (
//                     <React.Fragment key={m.userId}>
//                       <td className="border p-2 text-center">{m.lunch}</td>
//                       <td className="border p-2 text-center">{m.dinner}</td>
//                     </React.Fragment>
//                   ))}
//                 </tr>
//               ))}
//               {/* Totals row */}
//               <tr className="bg-gray-100 font-bold">
//                 <td className="border p-2">Total Meal</td>
//                 {membersList.map(m => {
//                   const totalLunch = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.lunch || 0),
//                     0
//                   );
//                   const totalDinner = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.dinner || 0),
//                     0
//                   );
//                   return (
//                     <React.Fragment key={m.id}>
//                       <td className="border p-2 text-center">{totalLunch}</td>
//                       <td className="border p-2 text-center">{totalDinner}</td>
//                     </React.Fragment>
//                   );
//                 })}
//               </tr>
//             </tbody>
//           </table>
//         </div>
//         <p className="text-sm text-gray-500 mt-4">
//           💡 Meals are automatically set to 1 lunch + 1 dinner per day from the member's join date.
//           Zeros are shown for days before they joined.
//         </p>
//       </div>
//     </div>
//   );
// }

// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import { ensureDailyMealsExist } from '@/app/lib/mealUtils';
// import React from 'react';

// interface DailyRow {
//   date: string;
//   members: { userId: string; lunch: number; dinner: number }[];
// }

// interface MemberInfo {
//   id: string;
//   name: string;
//   joinDate: string;
// }

// export default function MonthlyTotalPage() {
//   const { roomId } = useParams();
//   const [dailyData, setDailyData] = useState<DailyRow[]>([]);
//   const [membersList, setMembersList] = useState<MemberInfo[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     fetchData();
//   }, [roomId]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       // 1. Auto‑create missing meals (including today)
//       await ensureDailyMealsExist(roomId as string);

//       const now = new Date();
//       const year = now.getFullYear();
//       const month = now.getMonth() + 1;
//       const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
//       const today = now.toISOString().split('T')[0];

//       // 2. Get active members with join dates
//       const { data: members } = await supabase
//         .from('room_members')
//         .select('user_id, approved_at, joined_at, profiles(full_name)')
//         .eq('room_id', roomId)
//         .eq('status', 'active');

//       if (!members || members.length === 0) {
//         setMembersList([]);
//         setDailyData([]);
//         setLoading(false);
//         return;
//       }

//       const memberList: MemberInfo[] = members.map(m => ({
//         id: m.user_id,
//         name: m.profiles.full_name,
//         joinDate: (m.approved_at || m.joined_at)?.split('T')[0] || today,
//       }));
//       setMembersList(memberList);

//       // 3. Get all meals for the month
//       const { data: meals } = await supabase
//         .from('daily_meals')
//         .select('user_id, meal_date, lunch, dinner')
//         .eq('room_id', roomId)
//         .gte('meal_date', startDate)
//         .lte('meal_date', today)
//         .order('meal_date', { ascending: true });

//       // 4. Build map: date -> userId -> { lunch, dinner }
//       const dateMap = new Map<string, Map<string, { lunch: number; dinner: number }>>();
//       meals?.forEach(meal => {
//         if (!dateMap.has(meal.meal_date)) dateMap.set(meal.meal_date, new Map());
//         const userMap = dateMap.get(meal.meal_date)!;
//         userMap.set(meal.user_id, { lunch: meal.lunch, dinner: meal.dinner });
//       });

//       // 5. Generate rows from startDate to today (INCLUSIVE)
//       const rows: DailyRow[] = [];
//       let current = new Date(startDate);
//       while (current <= now) {
//         const dateStr = current.toISOString().split('T')[0];
//         const userMap = dateMap.get(dateStr) || new Map();
//         const membersRow = memberList.map(m => {
//           const isBeforeJoin = dateStr < m.joinDate;
//           return {
//             userId: m.id,
//             lunch: isBeforeJoin ? 0 : (userMap.get(m.id)?.lunch ?? 0),
//             dinner: isBeforeJoin ? 0 : (userMap.get(m.id)?.dinner ?? 0),
//           };
//         });
//         rows.push({ date: dateStr, members: membersRow });
//         current.setDate(current.getDate() + 1);
//       }
//       setDailyData(rows);
//     } catch (error) {
//       console.error('Error fetching daily breakdown:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
//   };

//   if (loading) return <div className="text-center py-10">Loading daily meals...</div>;

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-7xl mx-auto">
//         <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4">
//           ← Back to Meal Menu
//         </button>
//         <h1 className="text-3xl font-bold mb-2">
//           Total Meal Count of {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
//         </h1>

//         <div className="overflow-x-auto bg-white rounded shadow">
//           <table className="min-w-full border-collapse">
//             <thead>
//               <tr>
//                 <th className="border p-2">Date</th>
//                 {membersList.map(m => (
//                   <th key={m.id} colSpan={2} className="border p-2 text-center">
//                     {m.name}
//                   </th>
//                 ))}
//               </tr>
//               <tr>
//                 <th className="border p-2"></th>
//                 {membersList.map(m => (
//                   <React.Fragment key={m.id}>
//                     <th className="border p-2 text-center">L</th>
//                     <th className="border p-2 text-center">D</th>
//                   </React.Fragment>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dailyData.map(row => (
//                 <tr key={row.date}>
//                   <td className="border p-2">{formatDate(new Date(row.date))}</td>
//                   {row.members.map(m => (
//                     <React.Fragment key={m.userId}>
//                       <td className="border p-2 text-center">{m.lunch}</td>
//                       <td className="border p-2 text-center">{m.dinner}</td>
//                     </React.Fragment>
//                   ))}
//                 </tr>
//               ))}
//               {/* Totals row */}
//               <tr className="bg-gray-100 font-bold">
//                 <td className="border p-2">Total Meal</td>
//                 {membersList.map(m => {
//                   const totalLunch = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.lunch || 0),
//                     0
//                   );
//                   const totalDinner = dailyData.reduce(
//                     (sum, day) => sum + (day.members.find(x => x.userId === m.id)?.dinner || 0),
//                     0
//                   );
//                   return (
//                     <React.Fragment key={m.id}>
//                       <td className="border p-2 text-center">{totalLunch}</td>
//                       <td className="border p-2 text-center">{totalDinner}</td>
//                     </React.Fragment>
//                   );
//                 })}
//               </tr>
//             </tbody>
//           </table>
//         </div>
//         <p className="text-sm text-gray-500 mt-4">
//           🍽 Meals are automatically set to 1 lunch + 1 dinner per day from the member's join date.
//           Zeros are shown for days before they joined.
//         </p>
//       </div>
//     </div>
//   );
// }

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
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id, approved_at, joined_at, profiles(full_name)')
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (!members || members.length === 0) {
        setMembersList([]);
        setDailyData([]);
        setLoading(false);
        return;
      }

      const memberList: MemberInfo[] = members.map(m => ({
        id: m.user_id,
        name: m.profiles.full_name,
        joinDate: (m.approved_at || m.joined_at)?.split('T')[0] || today,
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