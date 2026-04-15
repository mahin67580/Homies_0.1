// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import { getCurrentMonthYear } from '@/app/lib/utils';
// import toast from 'react-hot-toast';

// interface MemberSummary {
//   user_id: string;
//   full_name: string;
//   username: string;
//   deposit: number;
//   shopping: number;
//   total_meals: number;
//   bill_amount: number;
//   refund_due: number;
//   isDue: boolean;
// }

// export default function TotalPage() {
//   const { roomId } = useParams();
//   const [members, setMembers] = useState<MemberSummary[]>([]);
//   const [totalDeposit, setTotalDeposit] = useState(0);
//   const [totalShopping, setTotalShopping] = useState(0);
//   const [totalMeals, setTotalMeals] = useState(0);
//   const [mealRate, setMealRate] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [resetting, setResetting] = useState(false);
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     checkAdminStatus();
//     fetchSummary();
//   }, [roomId]);

//   const checkAdminStatus = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
//       const { data: room } = await supabase
//         .from('rooms')
//         .select('admin_id')
//         .eq('id', roomId)
//         .single();
//       setIsAdmin(room?.admin_id === user.id);
//     } catch (error) {
//       console.error('Error checking admin status:', error);
//     }
//   };

//   const fetchSummary = async () => {
//     try {
//       const currentMonth = getCurrentMonthYear(); // YYYY-MM-01
//       const year = currentMonth.slice(0, 4);
//       const month = currentMonth.slice(5, 7);
//       const startDate = `${year}-${month}-01`;
//       const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
//       const endDate = `${year}-${month}-${lastDay}`;

//       // Get active members
//       const { data: membersList, error: membersError } = await supabase
//         .from('room_members')
//         .select(`
//           user_id,
//           profiles!inner (username, full_name)
//         `)
//         .eq('room_id', roomId)
//         .eq('status', 'active');

//       if (membersError) throw membersError;
//       if (!membersList || membersList.length === 0) {
//         setMembers([]);
//         setLoading(false);
//         return;
//       }

//       // Get deposits for current month
//       const { data: deposits } = await supabase
//         .from('deposits')
//         .select('user_id, amount')
//         .eq('room_id', roomId)
//         .eq('month_year', currentMonth);

//       // Get shopping for current month
//       const { data: shopping } = await supabase
//         .from('shopping')
//         .select('user_id, amount')
//         .eq('room_id', roomId)
//         .eq('month_year', currentMonth);

//       // Get daily meals for current month
//       const { data: meals } = await supabase
//         .from('daily_meals')
//         .select('user_id, lunch, dinner')
//         .eq('room_id', roomId)
//         .gte('meal_date', startDate)
//         .lte('meal_date', endDate);

//       const depositMap = new Map(deposits?.map(d => [d.user_id, d.amount]) || []);
//       const shoppingMap = new Map(shopping?.map(s => [s.user_id, s.amount]) || []);

//       // Calculate total meals per member
//       const mealCountMap = new Map();
//       meals?.forEach(meal => {
//         const current = mealCountMap.get(meal.user_id) || 0;
//         mealCountMap.set(meal.user_id, current + (meal.lunch + meal.dinner));
//       });

//       const totalDepositAmount = deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
//       const totalShoppingAmount = shopping?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
//       const totalMealCount = Array.from(mealCountMap.values()).reduce((sum, m) => sum + m, 0);

//       setTotalDeposit(totalDepositAmount);
//       setTotalShopping(totalShoppingAmount);
//       setTotalMeals(totalMealCount);

//       const rate = totalMealCount > 0 ? totalShoppingAmount / totalMealCount : 0;
//       setMealRate(rate);

//       // Build member summaries
//       const summaries: MemberSummary[] = membersList.map((member: any) => {
//         const deposit = depositMap.get(member.user_id) || 0;
//         const memberMeals = mealCountMap.get(member.user_id) || 0;
//         const billAmount = memberMeals * rate;
//         const refundDue = deposit - billAmount;

//         return {
//           user_id: member.user_id,
//           full_name: member.profiles.full_name,
//           username: member.profiles.username,
//           deposit,
//           shopping: shoppingMap.get(member.user_id) || 0,
//           total_meals: memberMeals,
//           bill_amount: billAmount,
//           refund_due: refundDue,
//           isDue: refundDue < 0,
//         };
//       });

//       setMembers(summaries);
//     } catch (error) {
//       console.error('Error fetching summary:', error);
//       toast.error('Failed to load summary');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleResetMonth = async () => {
//     if (!isAdmin) return;
//     const isLastDay = new Date().getDate() === new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
//     if (!isLastDay) {
//       toast.error('Reset can only be done on the last day of the month');
//       return;
//     }
//     if (!confirm('⚠️ WARNING: This will close the current month, calculate all balances, and start a new month. This action cannot be undone. Continue?')) return;

//     setResetting(true);
//     try {
//       // Call a database function or perform the reset logic
//       // For now, we'll implement a simple version that archives data and resets tables.
//       // A more robust solution would use a database function, but we'll keep it in code for clarity.
      
//       const currentMonth = getCurrentMonthYear();
//       const nextMonth = new Date();
//       nextMonth.setMonth(nextMonth.getMonth() + 1);
//       const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

//       // 1. Archive closing data (store in monthly_closures table)
//       const closingData = members.map(m => ({
//         user_id: m.user_id,
//         deposit: m.deposit,
//         total_meals: m.total_meals,
//         bill: m.bill_amount,
//         refund_due: m.refund_due,
//       }));
//       const { error: archiveError } = await supabase
//         .from('monthly_closures')
//         .insert({
//           room_id: roomId,
//           closed_month: new Date().toISOString().split('T')[0],
//           closing_data: closingData,
//         });
//       if (archiveError) throw archiveError;

//       // 2. For each member, carry forward refund (positive) as opening deposit for next month
//       for (const m of members) {
//         if (m.refund_due > 0) {
//           const { error: depositError } = await supabase
//             .from('deposits')
//             .upsert({
//               room_id: roomId,
//               user_id: m.user_id,
//               month_year: nextMonthStr,
//               amount: m.refund_due,
//             }, { onConflict: 'room_id,user_id,month_year' });
//           if (depositError) throw depositError;
//         }
//       }

//       // 3. Clear shopping for current month (they will be recreated for next month as needed)
//       await supabase
//         .from('shopping')
//         .delete()
//         .eq('room_id', roomId)
//         .eq('month_year', currentMonth);

//       // 4. Clear daily meals for current month
//       const startDate = currentMonth;
//       const endDate = new Date(parseInt(currentMonth.slice(0,4)), parseInt(currentMonth.slice(5,7)), 0).toISOString().split('T')[0];
//       await supabase
//         .from('daily_meals')
//         .delete()
//         .eq('room_id', roomId)
//         .gte('meal_date', startDate)
//         .lte('meal_date', endDate);

//       toast.success('Month closed successfully! New month started.');
//       // Refresh the page to show new month data
//       window.location.reload();
//     } catch (error) {
//       console.error('Error resetting month:', error);
//       toast.error('Failed to reset month');
//     } finally {
//       setResetting(false);
//     }
//   };

//   if (loading) return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="text-center">Loading monthly summary...</div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-6xl mx-auto">
//         <button
//           onClick={() => router.back()}
//           className="text-blue-500 hover:underline mb-4"
//         >
//           ← Back to Room
//         </button>

//         <h1 className="text-3xl font-bold mb-6">Monthly Summary</h1>

//         {/* Summary Cards */}
//         <div className="grid gap-4 md:grid-cols-3 mb-8">
//           <div className="bg-white rounded-lg shadow p-4">
//             <p className="text-gray-600 text-sm">Total Deposit</p>
//             <p className="text-2xl font-bold text-green-600">৳{totalDeposit.toLocaleString()}</p>
//           </div>
//           <div className="bg-white rounded-lg shadow p-4">
//             <p className="text-gray-600 text-sm">Total Shopping</p>
//             <p className="text-2xl font-bold text-red-600">৳{totalShopping.toLocaleString()}</p>
//           </div>
//           <div className="bg-white rounded-lg shadow p-4">
//             <p className="text-gray-600 text-sm">Total Meals</p>
//             <p className="text-2xl font-bold text-blue-600">{totalMeals}</p>
//           </div>
//         </div>

//         {/* Meal Rate Card */}
//         <div className="bg-white rounded-lg shadow p-6 mb-8 text-black">
//           <p className="text-sm opacity-90">Meal Rate (BDT)</p>
//           <p className="text-4xl font-bold">৳{mealRate.toFixed(2)}</p>
//           <p className="text-xs opacity-75 mt-2">
//             {totalShopping.toLocaleString()} / {totalMeals} = {mealRate.toFixed(2)}
//           </p>
//         </div>

//         {/* Member Cards */}
//         {members.length === 0 ? (
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
//             <p className="text-yellow-800">No members found in this room.</p>
//           </div>
//         ) : (
//           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//             {members.map((member) => (
//               <div key={member.user_id} className="bg-white rounded-lg shadow overflow-hidden">
//                 <div className={`p-4 ${member.isDue ? 'bg-red-50' : 'bg-green-50'}`}>
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h3 className="text-lg font-semibold">{member.full_name}</h3>
//                       <p className="text-sm text-gray-600">@{member.username}</p>
//                     </div>
//                     <span className="text-3xl">
//                       {member.isDue ? '😢' : '😊'}
//                     </span>
//                   </div>
//                 </div>
//                 <div className="p-4 space-y-2">
//                   <div className="flex justify-between">
//                     <span className="text-gray-600">Your Deposit:</span>
//                     <span className="font-semibold">৳{member.deposit.toLocaleString()}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span className="text-gray-600">Your Meals:</span>
//                     <span className="font-semibold">{member.total_meals} times</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span className="text-gray-600">Your Bill:</span>
//                     <span className="font-semibold">৳{member.bill_amount.toLocaleString()}</span>
//                   </div>
//                   <div className="border-t pt-2 mt-2">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">{member.isDue ? 'Due Amount:' : 'Refund Amount:'}</span>
//                       <span className={`font-bold ${member.isDue ? 'text-red-600' : 'text-green-600'}`}>
//                         ৳{Math.abs(member.refund_due).toLocaleString()}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Admin Reset Button */}
//         {isAdmin && (
//           <div className="mt-8">
//             <button
//               onClick={handleResetMonth}
//               disabled={resetting}
//               className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
//             >
//               {resetting ? 'Resetting...' : 'Close & Reset Month'}
//             </button>
//             <p className="text-sm text-gray-500 mt-2">
//               ⚠️ Only click this on the last day of the month. It will archive current data and carry over refunds to the next month.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentMonthYear } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface MemberSummary {
  user_id: string;
  full_name: string;
  username: string;
  deposit: number;
  shopping: number;
  total_meals: number;
  bill_amount: number;
  refund_due: number;
  isDue: boolean;
}

export default function TotalPage() {
  const { roomId } = useParams();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalShopping, setTotalShopping] = useState(0);
  const [totalMeals, setTotalMeals] = useState(0);
  const [mealRate, setMealRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminStatus();
    fetchSummary();
  }, [roomId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: room } = await supabase
        .from('rooms')
        .select('admin_id')
        .eq('id', roomId)
        .single();
      setIsAdmin(room?.admin_id === user.id);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const currentMonth = getCurrentMonthYear(); // YYYY-MM-01
      const year = currentMonth.slice(0, 4);
      const month = currentMonth.slice(5, 7);
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      // Get active members with their join dates
      const { data: membersList, error: membersError } = await supabase
        .from('room_members')
        .select(`
          user_id,
          approved_at,
          joined_at,
          profiles!inner (username, full_name)
        `)
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (membersError) throw membersError;
      if (!membersList || membersList.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Prepare member data with effective start date (join date or month start)
      const membersWithJoin = membersList.map((m: any) => {
        let joinDate = m.approved_at || m.joined_at;
        if (!joinDate) joinDate = new Date().toISOString();
        const joinDateStr = new Date(joinDate).toISOString().split('T')[0];
        const effectiveStartDate = joinDateStr > startDate ? joinDateStr : startDate;
        return {
          user_id: m.user_id,
          full_name: m.profiles.full_name,
          username: m.profiles.username,
          effectiveStartDate,
        };
      });

      // Get deposits for current month
      const { data: deposits } = await supabase
        .from('deposits')
        .select('user_id, amount')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      // Get shopping for current month
      const { data: shopping } = await supabase
        .from('shopping')
        .select('user_id, amount')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      // Get all daily meals for the month
      const { data: meals } = await supabase
        .from('daily_meals')
        .select('user_id, meal_date, lunch, dinner')
        .eq('room_id', roomId)
        .gte('meal_date', startDate)
        .lte('meal_date', endDate);

      const depositMap = new Map(deposits?.map(d => [d.user_id, d.amount]) || []);
      const shoppingMap = new Map(shopping?.map(s => [s.user_id, s.amount]) || []);

      // Calculate total meals per member, only counting from effective start date
      const mealCountMap = new Map();
      meals?.forEach(meal => {
        const member = membersWithJoin.find(m => m.user_id === meal.user_id);
        if (!member) return;
        if (meal.meal_date >= member.effectiveStartDate) {
          const current = mealCountMap.get(meal.user_id) || 0;
          mealCountMap.set(meal.user_id, current + (meal.lunch + meal.dinner));
        }
      });

      const totalDepositAmount = deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalShoppingAmount = shopping?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const totalMealCount = Array.from(mealCountMap.values()).reduce((sum, m) => sum + m, 0);

      setTotalDeposit(totalDepositAmount);
      setTotalShopping(totalShoppingAmount);
      setTotalMeals(totalMealCount);

      const rate = totalMealCount > 0 ? totalShoppingAmount / totalMealCount : 0;
      setMealRate(rate);

      // Build member summaries
      const summaries: MemberSummary[] = membersWithJoin.map(member => {
        const deposit = depositMap.get(member.user_id) || 0;
        const memberMeals = mealCountMap.get(member.user_id) || 0;
        const billAmount = memberMeals * rate;
        const refundDue = deposit - billAmount;

        return {
          user_id: member.user_id,
          full_name: member.full_name,
          username: member.username,
          deposit,
          shopping: shoppingMap.get(member.user_id) || 0,
          total_meals: memberMeals,
          bill_amount: billAmount,
          refund_due: refundDue,
          isDue: refundDue < 0,
        };
      });

      setMembers(summaries);
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMonth = async () => {
    if (!isAdmin) return;
    const isLastDay = new Date().getDate() === new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if (!isLastDay) {
      toast.error('Reset can only be done on the last day of the month');
      return;
    }
    if (!confirm('⚠️ WARNING: This will close the current month, calculate all balances, and start a new month. This action cannot be undone. Continue?')) return;

    setResetting(true);
    try {
      const currentMonth = getCurrentMonthYear();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      // 1. Archive closing data
      const closingData = members.map(m => ({
        user_id: m.user_id,
        deposit: m.deposit,
        total_meals: m.total_meals,
        bill: m.bill_amount,
        refund_due: m.refund_due,
      }));
      const { error: archiveError } = await supabase
        .from('monthly_closures')
        .insert({
          room_id: roomId,
          closed_month: new Date().toISOString().split('T')[0],
          closing_data: closingData,
        });
      if (archiveError) throw archiveError;

      // 2. Carry forward positive refunds as opening deposits
      for (const m of members) {
        if (m.refund_due > 0) {
          const { error: depositError } = await supabase
            .from('deposits')
            .upsert({
              room_id: roomId,
              user_id: m.user_id,
              month_year: nextMonthStr,
              amount: m.refund_due,
            }, { onConflict: 'room_id,user_id,month_year' });
          if (depositError) throw depositError;
        }
      }

      // 3. Clear shopping for current month
      await supabase
        .from('shopping')
        .delete()
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      // 4. Clear daily meals for current month
      const startDate = currentMonth;
      const endDate = new Date(parseInt(currentMonth.slice(0,4)), parseInt(currentMonth.slice(5,7)), 0).toISOString().split('T')[0];
      await supabase
        .from('daily_meals')
        .delete()
        .eq('room_id', roomId)
        .gte('meal_date', startDate)
        .lte('meal_date', endDate);

      toast.success('Month closed successfully! New month started.');
      window.location.reload();
    } catch (error) {
      console.error('Error resetting month:', error);
      toast.error('Failed to reset month');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">Loading monthly summary...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back to Room
        </button>

        <h1 className="text-3xl font-bold mb-6">Monthly Summary</h1>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Deposit</p>
            <p className="text-2xl font-bold text-green-600">৳{totalDeposit.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Shopping</p>
            <p className="text-2xl font-bold text-red-600">৳{totalShopping.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Meals</p>
            <p className="text-2xl font-bold text-blue-600">{totalMeals}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8 text-black">
          <p className="text-sm opacity-90">Meal Rate (BDT)</p>
          <p className="text-4xl font-bold">৳{mealRate.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">
            {totalShopping.toLocaleString()} / {totalMeals} = {mealRate.toFixed(2)}
          </p>
        </div>

        {members.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No members found in this room.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div key={member.user_id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className={`p-4 ${member.isDue ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{member.full_name}</h3>
                      <p className="text-sm text-gray-600">@{member.username}</p>
                    </div>
                    <span className="text-3xl">
                      {member.isDue ? '😢' : '😊'}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Deposit:</span>
                    <span className="font-semibold">৳{member.deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Meals:</span>
                    <span className="font-semibold">{member.total_meals} times</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Bill:</span>
                    <span className="font-semibold">৳{member.bill_amount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{member.isDue ? 'Due Amount:' : 'Refund Amount:'}</span>
                      <span className={`font-bold ${member.isDue ? 'text-red-600' : 'text-green-600'}`}>
                        ৳{Math.abs(member.refund_due).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            <button
              onClick={handleResetMonth}
              disabled={resetting}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            >
              {resetting ? 'Resetting...' : 'Close & Reset Month'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              ⚠️ Only click this on the last day of the month. It will archive current data and carry over refunds to the next month.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}