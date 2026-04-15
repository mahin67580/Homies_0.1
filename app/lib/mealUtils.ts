// import { createClient } from '@/app/lib/supabase/client';

// /**
//  * For a given room, ensures every active member has a daily_meals record
//  * for every date from the start of the current month up to today.
//  * Missing records are inserted with lunch=1, dinner=1.
//  */
// export async function ensureDailyMealsExist(roomId: string) {
//   const supabase = createClient();
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = now.getMonth() + 1;
//   const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
//   const today = now.toISOString().split('T')[0];

//   // 1. Get all active members of the room
//   const { data: members, error: membersError } = await supabase
//     .from('room_members')
//     .select('user_id')
//     .eq('room_id', roomId)
//     .eq('status', 'active');
//   if (membersError || !members?.length) return;

//   // 2. For each member, find which dates in [startDate, today] are missing
//   for (const member of members) {
//     const { data: existing } = await supabase
//       .from('daily_meals')
//       .select('meal_date')
//       .eq('room_id', roomId)
//       .eq('user_id', member.user_id)
//       .gte('meal_date', startDate)
//       .lte('meal_date', today);
    
//     const existingDates = new Set(existing?.map(r => r.meal_date) || []);
//     const missingDates: string[] = [];
//     let current = new Date(startDate);
//     while (current <= now) {
//       const dateStr = current.toISOString().split('T')[0];
//       if (!existingDates.has(dateStr)) missingDates.push(dateStr);
//       current.setDate(current.getDate() + 1);
//     }
//     if (missingDates.length === 0) continue;

//     // 3. Insert missing dates with default lunch=1, dinner=1
//     const toInsert = missingDates.map(date => ({
//       room_id: roomId,
//       user_id: member.user_id,
//       meal_date: date,
//       lunch: 1,
//       dinner: 1,
//     }));
//     await supabase.from('daily_meals').upsert(toInsert, { onConflict: 'room_id,user_id,meal_date' });
//   }
// }



// import { createClient } from '@/app/lib/supabase/client';

// /**
//  * For a given room, ensures every active member has daily_meals records
//  * from their own join date (approved_at or joined_at) up to today.
//  * Missing records are inserted with lunch=1, dinner=1.
//  */
// export async function ensureDailyMealsExist(roomId: string) {
//   const supabase = createClient();
//   const today = new Date().toISOString().split('T')[0];

//   // Get all active members with their approval/join date
//   const { data: members, error: membersError } = await supabase
//     .from('room_members')
//     .select('user_id, approved_at, joined_at')
//     .eq('room_id', roomId)
//     .eq('status', 'active');

//   if (membersError || !members?.length) return;

//   for (const member of members) {
//     // Determine the date from which meals should exist
//     let joinDate = member.approved_at || member.joined_at;
//     if (!joinDate) joinDate = new Date().toISOString();
//     const startDate = new Date(joinDate).toISOString().split('T')[0];

//     if (startDate > today) continue; // not yet joined

//     // Get existing meal dates for this member
//     const { data: existing } = await supabase
//       .from('daily_meals')
//       .select('meal_date')
//       .eq('room_id', roomId)
//       .eq('user_id', member.user_id)
//       .gte('meal_date', startDate)
//       .lte('meal_date', today);

//     const existingDates = new Set(existing?.map(r => r.meal_date) || []);
//     const missingDates: string[] = [];
//     let current = new Date(startDate);
//     while (current <= new Date(today)) {
//       const dateStr = current.toISOString().split('T')[0];
//       if (!existingDates.has(dateStr)) missingDates.push(dateStr);
//       current.setDate(current.getDate() + 1);
//     }

//     if (missingDates.length === 0) continue;

//     const toInsert = missingDates.map(date => ({
//       room_id: roomId,
//       user_id: member.user_id,
//       meal_date: date,
//       lunch: 1,
//       dinner: 1,
//     }));
//     await supabase.from('daily_meals').upsert(toInsert, { onConflict: 'room_id,user_id,meal_date' });
//   }
// }

// import { createClient } from '@/app/lib/supabase/client';

// export async function ensureDailyMealsExist(roomId: string) {
//   const supabase = createClient();
//   const today = new Date().toISOString().split('T')[0];

//   const { data: members, error } = await supabase
//     .from('room_members')
//     .select('user_id, approved_at, joined_at')
//     .eq('room_id', roomId)
//     .eq('status', 'active');

//   if (error || !members?.length) return;

//   for (const member of members) {
//     let joinDate = member.approved_at || member.joined_at;
//     if (!joinDate) joinDate = new Date().toISOString();
//     const startDate = new Date(joinDate).toISOString().split('T')[0];
//     if (startDate > today) continue;

//     // Get existing meal dates for this member
//     const { data: existing } = await supabase
//       .from('daily_meals')
//       .select('meal_date')
//       .eq('room_id', roomId)
//       .eq('user_id', member.user_id)
//       .gte('meal_date', startDate)
//       .lte('meal_date', today);

//     const existingDates = new Set(existing?.map(r => r.meal_date) || []);
//     const missingDates: string[] = [];
//     let current = new Date(startDate);
//     while (current <= new Date(today)) {
//       const dateStr = current.toISOString().split('T')[0];
//       if (!existingDates.has(dateStr)) missingDates.push(dateStr);
//       current.setDate(current.getDate() + 1);
//     }

//     if (missingDates.length === 0) continue;

//     const toInsert = missingDates.map(date => ({
//       room_id: roomId,
//       user_id: member.user_id,
//       meal_date: date,
//       lunch: 1,
//       dinner: 1,
//     }));
//     await supabase.from('daily_meals').upsert(toInsert, { onConflict: 'room_id,user_id,meal_date' });
//   }
// }

import { createClient } from '@/app/lib/supabase/client';
import { getLocalToday } from '@/app/lib/dateUtils';

export async function ensureDailyMealsExist(roomId: string) {
  const supabase = createClient();
  const today = getLocalToday(); // ← use local date

  const { data: members, error } = await supabase
    .from('room_members')
    .select('user_id, approved_at, joined_at')
    .eq('room_id', roomId)
    .eq('status', 'active');

  if (error || !members?.length) return;

  for (const member of members) {
    let joinDate = member.approved_at || member.joined_at;
    if (!joinDate) joinDate = new Date().toISOString();
    const startDate = new Date(joinDate).toISOString().split('T')[0];
    if (startDate > today) continue;

    // Get existing meal dates for this member (using local date range)
    const { data: existing } = await supabase
      .from('daily_meals')
      .select('meal_date')
      .eq('room_id', roomId)
      .eq('user_id', member.user_id)
      .gte('meal_date', startDate)
      .lte('meal_date', today);

    const existingDates = new Set(existing?.map(r => r.meal_date) || []);
    const missingDates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(today);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) missingDates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    if (missingDates.length === 0) continue;

    const toInsert = missingDates.map(date => ({
      room_id: roomId,
      user_id: member.user_id,
      meal_date: date,
      lunch: 1,
      dinner: 1,
    }));
    await supabase.from('daily_meals').upsert(toInsert, { onConflict: 'room_id,user_id,meal_date' });
  }
}