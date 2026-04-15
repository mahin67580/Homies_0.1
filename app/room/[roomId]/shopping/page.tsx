'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentMonthYear } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface MemberShopping {
  user_id: string;
  full_name: string;
  username: string;
  amount: number;
  description: string;
  originalAmount: number;
  originalDescription: string;
}

export default function ShoppingPage() {
  const { roomId } = useParams();
  const [members, setMembers] = useState<MemberShopping[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [roomId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin status
      const { data: room } = await supabase
        .from('rooms')
        .select('admin_id')
        .eq('id', roomId)
        .single();
      
      setIsAdmin(room?.admin_id === user.id);

      const currentMonth = getCurrentMonthYear();

      // Get active members
      const { data: membersList, error: membersError } = await supabase
        .from('room_members')
        .select(`
          user_id,
          profiles!inner (username, full_name)
        `)
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (membersError) throw membersError;
      if (!membersList) return;

      // Get shopping data for current month
      const { data: shoppingData } = await supabase
        .from('shopping')
        .select('user_id, amount, description')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      const shoppingMap = new Map();
      shoppingData?.forEach(s => shoppingMap.set(s.user_id, { amount: s.amount, description: s.description || '' }));

      const memberData = membersList.map((member: any) => {
        const existing = shoppingMap.get(member.user_id) || { amount: 0, description: '' };
        return {
          user_id: member.user_id,
          full_name: member.profiles.full_name,
          username: member.profiles.username,
          amount: existing.amount,
          description: existing.description,
          originalAmount: existing.amount,
          originalDescription: existing.description,
        };
      });

      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching shopping data:', error);
      toast.error('Failed to load shopping data');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (userId: string, newAmount: number) => {
    if (!isAdmin) return;
    setMembers(prev => prev.map(m =>
      m.user_id === userId ? { ...m, amount: newAmount } : m
    ));
  };

  const handleDescriptionChange = (userId: string, newDescription: string) => {
    if (!isAdmin) return;
    setMembers(prev => prev.map(m =>
      m.user_id === userId ? { ...m, description: newDescription } : m
    ));
  };

  const saveShopping = async (userId: string) => {
    if (!isAdmin) return;
    
    const member = members.find(m => m.user_id === userId);
    if (!member) return;
    
    if (member.amount < 0) {
      toast.error('Shopping amount cannot be negative');
      return;
    }

    // Check if any changes
    const amountChanged = member.amount !== member.originalAmount;
    const descChanged = member.description !== member.originalDescription;
    
    if (!amountChanged && !descChanged) {
     toast('No changes to save');
      return;
    }

    setSaving(userId);
    const currentMonth = getCurrentMonthYear();

    try {
      const { error } = await supabase
        .from('shopping')
        .upsert({
          room_id: roomId,
          user_id: userId,
          month_year: currentMonth,
          amount: member.amount,
          description: member.description,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'room_id,user_id,month_year'
        });

      if (error) throw error;

      toast.success(`Shopping updated for ${member.full_name}`);
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { 
          ...m, 
          originalAmount: member.amount, 
          originalDescription: member.description 
        } : m
      ));
    } catch (error: any) {
      console.error('Error updating shopping:', error);
      toast.error(error.message || 'Failed to update shopping');
    } finally {
      setSaving(null);
    }
  };

  const totalShopping = members.reduce((sum, m) => sum + m.amount, 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">Loading shopping data...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back to Room
        </button>

        <h1 className="text-3xl font-bold mb-6">Shopping Expenses</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (৳)
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  )}
                  {isAdmin && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{member.full_name}</div>
                      <div className="text-sm text-gray-500">@{member.username}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isAdmin ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={member.amount}
                          onChange={(e) => {
                            let raw = e.target.value.replace(/[^0-9]/g, '');
                            let num = parseInt(raw, 10);
                            if (isNaN(num)) num = 0;
                            handleAmountChange(member.user_id, num);
                          }}
                          className="w-32 text-right border rounded p-1 focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-900 font-medium">
                          ৳{member.amount.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="e.g., Rice, Vegetables, Chicken..."
                          value={member.description}
                          onChange={(e) => handleDescriptionChange(member.user_id, e.target.value)}
                          className="w-64 text-left border rounded p-1 focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </td>
                    )}

                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => saveShopping(member.user_id)}
                          disabled={saving === member.user_id || (member.amount === member.originalAmount && member.description === member.originalDescription)}
                          className={`px-3 py-1 rounded text-sm ${
                            member.amount === member.originalAmount && member.description === member.originalDescription
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {saving === member.user_id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-6 py-4 text-right">Total Shopping:</td>
                  <td className="px-6 py-4 text-right">৳{totalShopping.toLocaleString()}</td>
                  {isAdmin && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            🛒 Shopping expenses can only be updated by the room admin. Contact admin for any changes.
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            👑 Admin: Edit shopping amounts and descriptions, then click <strong>Save</strong> for each member. 
            Only changed values will be saved. Description is optional but helpful for tracking.
          </div>
        )}
      </div>
    </div>
  );
}