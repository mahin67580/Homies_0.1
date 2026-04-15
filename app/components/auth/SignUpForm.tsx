'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { AuthError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('1. Starting signup process...');
      
      // Sign up with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            full_name: fullName,
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      console.log('2. Auth successful:', authData.user?.id);

      if (!authData.user) {
        console.error('No user returned from auth');
        toast.error('Failed to create user account');
        setLoading(false);
        return;
      }

      // Wait a moment for the user to be fully created
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('3. Waiting complete, attempting profile creation...');

      // Try to create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            username: username,
            full_name: fullName,
          }
        ])
        .select();

      if (profileError) {
        console.error('Profile creation error DETAILS:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // Show detailed error to help debug
        toast.error(`Profile creation failed: ${profileError.message}`);
        
        // Clean up - delete the auth user since profile creation failed
        await supabase.auth.admin.deleteUser(authData.user.id);
        setLoading(false);
        return;
      }

      console.log('4. Profile created successfully:', profileData);
      toast.success('Account created successfully! Please sign in.');
      router.push('/login');
      
    } catch (error: unknown) {
      console.error('Unexpected error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center">Sign Up</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-2 border rounded text-black"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded text-black"
          required
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>

      <p className="text-center text-sm">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-blue-500 hover:underline"
        >
          Login
        </button>
      </p>
    </form>
  );
}