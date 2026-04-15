'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentMonthYear } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface MemberDeposit {
  user_id: string;
  full_name: string;
  username: string;
  amount: number;
  originalAmount: number; // to track unsaved changes
}

export default function DepositPage() {
  const { roomId } = useParams();
  const [members, setMembers] = useState<MemberDeposit[]>([]);
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

      // Get deposits for current month
      const { data: deposits } = await supabase
        .from('deposits')
        .select('user_id, amount')
        .eq('room_id', roomId)
        .eq('month_year', currentMonth);

      const depositMap = new Map();
      deposits?.forEach(d => depositMap.set(d.user_id, d.amount));

      const memberData = membersList.map((member: any) => ({
        user_id: member.user_id,
        full_name: member.profiles.full_name,
        username: member.profiles.username,
        amount: depositMap.get(member.user_id) || 0,
        originalAmount: depositMap.get(member.user_id) || 0,
      }));

      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Failed to load deposit data');
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

  const saveDeposit = async (userId: string) => {
    if (!isAdmin) return;
    
    const member = members.find(m => m.user_id === userId);
    if (!member) return;
    
    if (member.amount < 0) {
      toast.error('Deposit amount cannot be negative');
      return;
    }

    // If amount hasn't changed, don't save
    if (member.amount === member.originalAmount) {
      toast('No changes to save');
      return;
    }

    setSaving(userId);
    const currentMonth = getCurrentMonthYear();

    try {
      const { error } = await supabase
        .from('deposits')
        .upsert({
          room_id: roomId,
          user_id: userId,
          month_year: currentMonth,
          amount: member.amount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'room_id,user_id,month_year'
        });

      if (error) throw error;

      toast.success(`Deposit updated for ${member.full_name}`);
      // Update original amount to match saved amount
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { ...m, originalAmount: member.amount } : m
      ));
    } catch (error: any) {
      console.error('Error updating deposit:', error);
      toast.error(error.message || 'Failed to update deposit');
    } finally {
      setSaving(null);
    }
  };

  const totalDeposit = members.reduce((sum, m) => sum + m.amount, 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">Loading deposit data...</div>
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

        <h1 className="text-3xl font-bold mb-6">Deposit Management</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposit Amount (৳)
                  </th>
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
    let raw = e.target.value.replace(/[^0-9]/g, ''); // only digits
    let num = parseInt(raw, 10);
    if (isNaN(num)) num = 0;
    handleAmountChange(member.user_id, num);
  }}
  className="w-36 text-right border rounded p-1 focus:ring-2 focus:ring-blue-500"
/>
                      ) : (
                        <span className="text-gray-900 font-medium">
                          ৳{member.amount.toLocaleString()}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => saveDeposit(member.user_id)}
                          disabled={saving === member.user_id || member.amount === member.originalAmount}
                          className={`px-3 py-1 rounded text-sm ${
                            member.amount === member.originalAmount
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
                  <td className="px-6 py-4 text-right">Total Deposit:</td>
                  <td className="px-6 py-4 text-right">৳{totalDeposit.toLocaleString()}</td>
                  {isAdmin && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            💡 Deposits can only be updated by the room admin. Contact admin for any changes.
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            👑 Admin: Edit deposit amounts, then click the <strong>Save</strong> button for each member. Only changed amounts will be saved.
          </div>
        )}
      </div>
    </div>
  );
}