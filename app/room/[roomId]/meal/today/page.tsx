// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/app/lib/supabase/client';
// import toast from 'react-hot-toast';

// interface MemberMeal {
//   user_id: string;
//   full_name: string;
//   lunch: number;
//   dinner: number;
// }

// interface MemberRecord {
//   user_id: string;
//   profiles: Array<{ full_name: string }>;
// }

// interface ErrorWithMessage {
//   message: string;
// }

// function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
//   return (
//     typeof error === 'object' &&
//     error !== null &&
//     'message' in error &&
//     typeof (error as ErrorWithMessage).message === 'string'
//   );
// }

// function getErrorMessage(error: unknown): string {
//   if (isErrorWithMessage(error)) return error.message;
//   return 'An unexpected error occurred';
// }

// export default function TodayMealPage() {
//   const { roomId } = useParams();
//   const [members, setMembers] = useState<MemberMeal[]>([]);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [currentUserId, setCurrentUserId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [mealSettings, setMealSettings] = useState<{ lunch_cutoff_time: string; dinner_cutoff_time: string } | null>(null);
//   const [canEditLunch, setCanEditLunch] = useState(true);
//   const [canEditDinner, setCanEditDinner] = useState(true);
//   const router = useRouter();
//   const supabase = createClient();

//   useEffect(() => {
//     fetchData();
//   }, [roomId]);

//   const checkMealEditability = async () => {
//     try {
//       // Get meal settings for this room
//       const { data: settings } = await supabase
//         .from('meal_settings')
//         .select('lunch_cutoff_time, dinner_cutoff_time')
//         .eq('room_id', roomId)
//         .single();

//       if (settings) {
//         setMealSettings(settings);
        
//         const now = new Date();
//         const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
//         // Check if current time is before cutoff times
//         const lunchEditable = currentTime <= settings.lunch_cutoff_time;
//         const dinnerEditable = currentTime <= settings.dinner_cutoff_time;
        
//         setCanEditLunch(lunchEditable);
//         setCanEditDinner(dinnerEditable);
        
//         console.log('Meal editability:', { lunchEditable, dinnerEditable, currentTime, settings });
//       }
//     } catch (error) {
//       console.error('Error fetching meal settings:', error);
//     }
//   };

//   const fetchData = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
      
//       setCurrentUserId(user.id);

//       // Check if admin
//       const { data: room } = await supabase
//         .from('rooms')
//         .select('admin_id')
//         .eq('id', roomId)
//         .single();
      
//       const adminStatus = room?.admin_id === user.id;
//       setIsAdmin(adminStatus);

//       // Get meal editability settings
//       await checkMealEditability();

//       // Get active members with their profiles
//       const { data: membersList, error: membersError } = await supabase
//         .from('room_members')
//         .select(`
//           user_id,
//           profiles!inner (full_name)
//         `)
//         .eq('room_id', roomId)
//         .eq('status', 'active');

//       if (membersError) throw membersError;
//       if (!membersList || membersList.length === 0) return;

//       const today = new Date().toISOString().split('T')[0];
      
//       // Get today's meals or create defaults
//       const mealData = await Promise.all(
//         (membersList as MemberRecord[]).map(async (member) => {
//           // Extract full_name from the profiles array
//           const fullName = member.profiles.full_name || 'Unknown';

//           let { data: meal } = await supabase
//             .from('daily_meals')
//             .select('lunch, dinner')
//             .eq('room_id', roomId)
//             .eq('user_id', member.user_id)
//             .eq('meal_date', today)
//             .single();

//           // If no meal record exists, create default (1 lunch, 1 dinner)
//           if (!meal) {
//             const { data: newMeal, error: insertError } = await supabase
//               .from('daily_meals')
//               .insert({
//                 room_id: roomId,
//                 user_id: member.user_id,
//                 meal_date: today,
//                 lunch: 1,
//                 dinner: 1,
//               })
//               .select()
//               .single();

//             if (insertError) throw insertError;
//             meal = newMeal;
//           }

//           return {
//             user_id: member.user_id,
//             full_name: fullName,
//             lunch: meal?.lunch ?? 1,
//             dinner: meal?.dinner ?? 1,
//           };
//         })
//       );

//       setMembers(mealData);
//     } catch (error) {
//       console.error('Error:', error);
//       toast.error(getErrorMessage(error));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const canEditMemberMeal = (memberUserId: string, mealType: 'lunch' | 'dinner'): boolean => {
//     // Admin can edit anyone's meals
//     if (isAdmin) return true;
    
//     // Member can only edit their own meals
//     if (memberUserId !== currentUserId) return false;
    
//     // Check time restrictions for non-admin members
//     if (mealType === 'lunch') return canEditLunch;
//     if (mealType === 'dinner') return canEditDinner;
    
//     return false;
//   };

//   const getEditPermissionMessage = (memberUserId: string): string | null => {
//     if (isAdmin) return null;
//     if (memberUserId !== currentUserId) return "You can only edit your own meals";
//     if (!canEditLunch && !canEditDinner) return "Meal editing time has passed. Contact admin for changes.";
//     if (!canEditLunch) return "Lunch editing time has passed. You can still edit dinner.";
//     if (!canEditDinner) return "Dinner editing time has passed. You can still edit lunch.";
//     return null;
//   };

//   const updateMeal = async (userId: string, type: 'lunch' | 'dinner', value: number) => {
//     // Check permission
//     if (!canEditMemberMeal(userId, type)) {
//       if (!isAdmin && userId !== currentUserId) {
//         toast.error('You can only edit your own meals');
//       } else if (!isAdmin && type === 'lunch' && !canEditLunch) {
//         toast.error(`Lunch editing time has passed (cutoff: ${mealSettings?.lunch_cutoff_time})`);
//       } else if (!isAdmin && type === 'dinner' && !canEditDinner) {
//         toast.error(`Dinner editing time has passed (cutoff: ${mealSettings?.dinner_cutoff_time})`);
//       } else {
//         toast.error('You do not have permission to edit this meal');
//       }
//       return;
//     }

//     // Validate value range
//     if (value < 0 || value > 3) {
//       toast.error('Meal count must be between 0 and 3');
//       return;
//     }

//     const today = new Date().toISOString().split('T')[0];
    
//     const { error } = await supabase
//       .from('daily_meals')
//       .update({ [type]: value })
//       .eq('room_id', roomId)
//       .eq('user_id', userId)
//       .eq('meal_date', today);

//     if (error) {
//       toast.error('Failed to update meal');
//       console.error('Update error:', error);
//     } else {
//       toast.success(`${type === 'lunch' ? 'Lunch' : 'Dinner'} updated successfully`);
//       setMembers(prevMembers =>
//         prevMembers.map(m =>
//           m.user_id === userId ? { ...m, [type]: value } : m
//         )
//       );
//     }
//   };

//   const totalLunch = members.reduce((sum, m) => sum + m.lunch, 0);
//   const totalDinner = members.reduce((sum, m) => sum + m.dinner, 0);

//   if (loading) return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="text-center">
//         <div className="text-xl">Loading...</div>
//       </div>
//     </div>
//   );

// // Add this helper function at the top of your component (before the return statement)
// const formatTimeTo12Hour = (time24: string): string => {
//   if (!time24) return '';
  
//   const [hours, minutes] = time24.split(':');
//   const hour = parseInt(hours, 10);
//   const ampm = hour >= 12 ? 'PM' : 'AM';
//   const hour12 = hour % 12 || 12;
  
//   return `${hour12}:${minutes} ${ampm}`;
// };



//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-4xl mx-auto">
//         <button
//           onClick={() => router.back()}
//           className="text-blue-500 hover:underline mb-4"
//         >
//           ← Back to Meal Menu
//         </button>

//         <h1 className="text-3xl font-bold mb-6">Today's Meals</h1>

//         {/* Time Info Banner */}
//        {!isAdmin && (
//   <div className={`mb-4 p-3 rounded-lg ${(!canEditLunch || !canEditDinner) ? 'bg-yellow-100 border border-yellow-300' : 'bg-green-100 border border-green-300'}`}>
//     <p className="text-sm">
//       {(!canEditLunch || !canEditDinner) ? (
//         <>
//           ⏰ <span className="font-semibold">Editing Restrictions:</span>
//           {!canEditLunch && ` Lunch cutoff: ${formatTimeTo12Hour(mealSettings?.lunch_cutoff_time || '')}`}
//           {!canEditLunch && !canEditDinner && ' | '}
//           {!canEditDinner && ` Dinner cutoff: ${formatTimeTo12Hour(mealSettings?.dinner_cutoff_time || '')}`}
//           {(!canEditLunch || !canEditDinner) && ' - Contact admin for changes after cutoff'}
//         </>
//       ) : (
//         <>
//           ✅ You can edit your meals until {formatTimeTo12Hour(mealSettings?.lunch_cutoff_time || '')} (lunch) and {formatTimeTo12Hour(mealSettings?.dinner_cutoff_time || '')} (dinner)
//         </>
//       )}
//     </p>
//   </div>
// )}

//         {/* Today's Total */}
//         <div className="bg-white rounded-lg shadow p-4 mb-6">
//           <h2 className="text-lg font-semibold mb-2">Today's Total Meals</h2>
//           <div className="flex gap-4">
//             <div className="flex-1 text-center p-3 bg-blue-50 rounded">
//               <p className="text-gray-600">Lunch</p>
//               <p className="text-2xl font-bold text-blue-600">{totalLunch}</p>
//             </div>
//             <div className="flex-1 text-center p-3 bg-orange-50 rounded">
//               <p className="text-gray-600">Dinner</p>
//               <p className="text-2xl font-bold text-orange-600">{totalDinner}</p>
//             </div>
//           </div>
//         </div>

//         {/* Members Table */}
//         <div className="bg-white rounded-lg shadow overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Member
//                   </th>
//                   <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Lunch
//                   </th>
//                   <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Dinner
//                   </th>
//                   {!isAdmin && (
//                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Status
//                     </th>
//                   )}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {members.map((member) => {
//                   const canEditLunchForMember = canEditMemberMeal(member.user_id, 'lunch');
//                   const canEditDinnerForMember = canEditMemberMeal(member.user_id, 'dinner');
//                   const permissionMessage = getEditPermissionMessage(member.user_id);
//                   const isOwnRecord = member.user_id === currentUserId;
                  
//                   return (
//                     <tr key={member.user_id} className={isOwnRecord && !isAdmin ? 'bg-blue-50' : ''}>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="font-medium text-gray-900">{member.full_name}</div>
//                         {isOwnRecord && !isAdmin && (
//                           <div className="text-xs text-blue-600">(You)</div>
//                         )}
//                         {isAdmin && member.user_id === currentUserId && (
//                           <div className="text-xs text-green-600">(Admin - You)</div>
//                         )}
//                       </td>
                      
//                       <td className="px-6 py-4 whitespace-nowrap text-center">
//                         {canEditLunchForMember ? (
//                           <input
//                             type="number"
//                             min="0"
//                             max="3"
//                             value={member.lunch}
//                             onChange={(e) => updateMeal(member.user_id, 'lunch', parseInt(e.target.value, 10))}
//                             className="w-20 text-center border rounded p-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             title={!isAdmin && !canEditLunchForMember ? "Lunch editing time has passed" : "Edit lunch count"}
//                           />
//                         ) : (
//                           <span className="text-gray-900">{member.lunch}</span>
//                         )}
//                         {!canEditLunchForMember && !isAdmin && member.user_id === currentUserId && (
//                           <div className="text-xs text-red-500 mt-1">Locked</div>
//                         )}
//                       </td>
                      
//                       <td className="px-6 py-4 whitespace-nowrap text-center">
//                         {canEditDinnerForMember ? (
//                           <input
//                             type="number"
//                             min="0"
//                             max="3"
//                             value={member.dinner}
//                             onChange={(e) => updateMeal(member.user_id, 'dinner', parseInt(e.target.value, 10))}
//                             className="w-20 text-center border rounded p-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             title={!isAdmin && !canEditDinnerForMember ? "Dinner editing time has passed" : "Edit dinner count"}
//                           />
//                         ) : (
//                           <span className="text-gray-900">{member.dinner}</span>
//                         )}
//                         {!canEditDinnerForMember && !isAdmin && member.user_id === currentUserId && (
//                           <div className="text-xs text-red-500 mt-1">Locked</div>
//                         )}
//                       </td>
                      
//                       {!isAdmin && (
//                         <td className="px-6 py-4 whitespace-nowrap text-center">
//                           {member.user_id === currentUserId ? (
//                             <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
//                               ✓ Editable
//                             </span>
//                           ) : (
//                             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
//                               View Only
//                             </span>
//                           )}
//                         </td>
//                       )}
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Info Messages */}
//         <div className="mt-6 space-y-2">
//        {!isAdmin && (
//   <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
//     <p>📝 <span className="font-semibold">How it works:</span></p>
//     <ul className="list-disc list-inside mt-1 space-y-1">
//       <li>You can only edit <span className="font-semibold">your own</span> meals</li>
//       <li>Default meal count is 1 lunch + 1 dinner per day</li>
//       <li>Meal count range: 0-3 per meal</li>
//       {mealSettings && (
//         <>
//           <li>⏰ Lunch cutoff time: <span className="font-mono">{formatTimeTo12Hour(mealSettings.lunch_cutoff_time)}</span></li>
//           <li>⏰ Dinner cutoff time: <span className="font-mono">{formatTimeTo12Hour(mealSettings.dinner_cutoff_time)}</span></li>
//         </>
//       )}
//     </ul>
//   </div>
// )}
          
//           {isAdmin && (
//             <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
//               <p>👑 <span className="font-semibold">Admin Access:</span> You can edit all members' meals.</p>
//               <p className="mt-1">💡 Tip: Click on any number field to update meal counts for any member.</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { ensureDailyMealsExist } from '@/app/lib/mealUtils';
import toast from 'react-hot-toast';

interface MemberMeal {
  user_id: string;
  full_name: string;
  lunch: number;
  dinner: number;
}

interface MemberRecord {
  user_id: string;
  profiles: Array<{ full_name: string }>;
  approved_at?: string;
  joined_at?: string;
}

// Helper to get current local date in YYYY-MM-DD format
function getLocalToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function TodayMealPage() {
  const { roomId } = useParams();
  const [members, setMembers] = useState<MemberMeal[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mealSettings, setMealSettings] = useState<{ lunch_cutoff_time: string; dinner_cutoff_time: string } | null>(null);
  const [canEditLunch, setCanEditLunch] = useState(true);
  const [canEditDinner, setCanEditDinner] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [roomId]);

  const checkMealEditability = async () => {
    try {
      const { data: settings } = await supabase
        .from('meal_settings')
        .select('lunch_cutoff_time, dinner_cutoff_time')
        .eq('room_id', roomId)
        .single();

      if (settings) {
        setMealSettings(settings);
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setCanEditLunch(currentTime <= settings.lunch_cutoff_time);
        setCanEditDinner(currentTime <= settings.dinner_cutoff_time);
      }
    } catch (error) {
      console.error('Error fetching meal settings:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Check admin status
      const { data: room } = await supabase
        .from('rooms')
        .select('admin_id')
        .eq('id', roomId)
        .single();
      const adminStatus = room?.admin_id === user.id;
      setIsAdmin(adminStatus);

      // --- Ensure all daily meals exist up to today (local date) ---
      await ensureDailyMealsExist(roomId as string);

      // Fetch meal editability settings
      await checkMealEditability();

      // Get active members with their join dates
      const { data: membersList, error: membersError } = await supabase
        .from('room_members')
        .select(`
          user_id,
          approved_at,
          joined_at,
          profiles!inner (full_name)
        `)
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (membersError) throw membersError;
      if (!membersList || membersList.length === 0) return;

      const today = getLocalToday();

      // Filter members who joined on or before today
      const eligibleMembers = (membersList as MemberRecord[]).filter(member => {
        const joinDate = (member.approved_at || member.joined_at)?.split('T')[0];
        return !joinDate || joinDate <= today;
      });

      // Get today's meals (they are guaranteed to exist after ensureDailyMealsExist)
      const mealData = await Promise.all(
        eligibleMembers.map(async (member) => {
          const fullName = member.profiles.full_name || 'Unknown';
          const { data: meal } = await supabase
            .from('daily_meals')
            .select('lunch, dinner')
            .eq('room_id', roomId)
            .eq('user_id', member.user_id)
            .eq('meal_date', today)
            .single();

          return {
            user_id: member.user_id,
            full_name: fullName,
            lunch: meal?.lunch ?? 1,
            dinner: meal?.dinner ?? 1,
          };
        })
      );

      // Non‑admin sees only their own row
      let displayMembers = mealData;
      if (!adminStatus && currentUserId) {
        displayMembers = mealData.filter(m => m.user_id === currentUserId);
      }
      setMembers(displayMembers);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load today\'s meals');
    } finally {
      setLoading(false);
    }
  };

  const canEditMemberMeal = (memberUserId: string, mealType: 'lunch' | 'dinner'): boolean => {
    if (isAdmin) return true;
    if (memberUserId !== currentUserId) return false;
    if (mealType === 'lunch') return canEditLunch;
    if (mealType === 'dinner') return canEditDinner;
    return false;
  };

  const updateMeal = async (userId: string, type: 'lunch' | 'dinner', value: number) => {
    if (!canEditMemberMeal(userId, type)) {
      if (!isAdmin && userId !== currentUserId) {
        toast.error('You can only edit your own meals');
      } else if (!isAdmin && type === 'lunch' && !canEditLunch) {
        toast.error(`Lunch editing time has passed (cutoff: ${formatTimeTo12Hour(mealSettings?.lunch_cutoff_time || '')})`);
      } else if (!isAdmin && type === 'dinner' && !canEditDinner) {
        toast.error(`Dinner editing time has passed (cutoff: ${formatTimeTo12Hour(mealSettings?.dinner_cutoff_time || '')})`);
      } else {
        toast.error('You do not have permission to edit this meal');
      }
      return;
    }

    if (value < 0 || value > 3) {
      toast.error('Meal count must be between 0 and 3');
      return;
    }

    const today = getLocalToday();
    const { error } = await supabase
      .from('daily_meals')
      .update({ [type]: value })
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('meal_date', today);

    if (error) {
      toast.error('Failed to update meal');
      console.error('Update error:', error);
    } else {
      toast.success(`${type === 'lunch' ? 'Lunch' : 'Dinner'} updated`);
      setMembers(prev =>
        prev.map(m => (m.user_id === userId ? { ...m, [type]: value } : m))
      );
    }
  };

  const totalLunch = members.reduce((sum, m) => sum + m.lunch, 0);
  const totalDinner = members.reduce((sum, m) => sum + m.dinner, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">Loading today's meals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back to Meal Menu
        </button>

        <h1 className="text-3xl font-bold mb-6">Today's Meals</h1>

        {/* Time restriction banner for non-admin */}
        {!isAdmin && (
          <div className={`mb-4 p-3 rounded-lg ${(!canEditLunch || !canEditDinner) ? 'bg-yellow-100 border border-yellow-300' : 'bg-green-100 border border-green-300'}`}>
            <p className="text-sm">
              {(!canEditLunch || !canEditDinner) ? (
                <>
                  ⏰ <span className="font-semibold">Editing Restrictions:</span>
                  {!canEditLunch && ` Lunch cutoff: ${formatTimeTo12Hour(mealSettings?.lunch_cutoff_time || '')}`}
                  {!canEditLunch && !canEditDinner && ' | '}
                  {!canEditDinner && ` Dinner cutoff: ${formatTimeTo12Hour(mealSettings?.dinner_cutoff_time || '')}`}
                  {' - Contact admin for changes after cutoff'}
                </>
              ) : (
                <>
                  ✅ You can edit your meals until {formatTimeTo12Hour(mealSettings?.lunch_cutoff_time || '')} (lunch) and {formatTimeTo12Hour(mealSettings?.dinner_cutoff_time || '')} (dinner)
                </>
              )}
            </p>
          </div>
        )}

        {/* Today's totals */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Today's Total Meals</h2>
          <div className="flex gap-4">
            <div className="flex-1 text-center p-3 bg-blue-50 rounded">
              <p className="text-gray-600">Lunch</p>
              <p className="text-2xl font-bold text-blue-600">{totalLunch}</p>
            </div>
            <div className="flex-1 text-center p-3 bg-orange-50 rounded">
              <p className="text-gray-600">Dinner</p>
              <p className="text-2xl font-bold text-orange-600">{totalDinner}</p>
            </div>
          </div>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lunch
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dinner
                  </th>
                  {!isAdmin && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => {
                  const canEditLunchForMember = canEditMemberMeal(member.user_id, 'lunch');
                  const canEditDinnerForMember = canEditMemberMeal(member.user_id, 'dinner');
                  const isOwnRecord = member.user_id === currentUserId;
                  return (
                    <tr key={member.user_id} className={isOwnRecord && !isAdmin ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{member.full_name}</div>
                        {isOwnRecord && !isAdmin && <div className="text-xs text-blue-600">(You)</div>}
                        {isAdmin && member.user_id === currentUserId && (
                          <div className="text-xs text-green-600">(Admin - You)</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {canEditLunchForMember ? (
                          <input
                            type="number"
                            min="0"
                            max="3"
                            value={member.lunch}
                            onChange={(e) => updateMeal(member.user_id, 'lunch', parseInt(e.target.value, 10))}
                            className="w-20 text-center border rounded p-1 focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-900">{member.lunch}</span>
                        )}
                        {!canEditLunchForMember && !isAdmin && isOwnRecord && (
                          <div className="text-xs text-red-500 mt-1">Locked</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {canEditDinnerForMember ? (
                          <input
                            type="number"
                            min="0"
                            max="3"
                            value={member.dinner}
                            onChange={(e) => updateMeal(member.user_id, 'dinner', parseInt(e.target.value, 10))}
                            className="w-20 text-center border rounded p-1 focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-900">{member.dinner}</span>
                        )}
                        {!canEditDinnerForMember && !isAdmin && isOwnRecord && (
                          <div className="text-xs text-red-500 mt-1">Locked</div>
                        )}
                      </td>
                      {!isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isOwnRecord ? (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">✓ Editable</span>
                          ) : (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">View Only</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info messages */}
        <div className="mt-6 space-y-2">
          {!isAdmin && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p>📝 <span className="font-semibold">How it works:</span></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>You can only edit <span className="font-semibold">your own</span> meals</li>
                <li>Default meal count is 1 lunch + 1 dinner per day</li>
                <li>Meal count range: 0-3 per meal</li>
                {mealSettings && (
                  <>
                    <li>⏰ Lunch cutoff time: <span className="font-mono">{formatTimeTo12Hour(mealSettings.lunch_cutoff_time)}</span></li>
                    <li>⏰ Dinner cutoff time: <span className="font-mono">{formatTimeTo12Hour(mealSettings.dinner_cutoff_time)}</span></li>
                  </>
                )}
              </ul>
            </div>
          )}
          {isAdmin && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p>👑 <span className="font-semibold">Admin Access:</span> You can edit all members' meals.</p>
              <p className="mt-1">💡 Tip: Click on any number field to update meal counts for any member.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}