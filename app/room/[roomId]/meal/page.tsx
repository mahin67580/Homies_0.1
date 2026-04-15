'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MealPage() {
  const { roomId } = useParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back to Room
        </button>

        <h1 className="text-3xl font-bold mb-6">Meal Management</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href={`/room/${roomId}/meal/today`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-2">🍽️</div>
            <h2 className="text-xl font-semibold">Today's Meal</h2>
            <p className="text-gray-600 mt-2">Update today's lunch and dinner counts</p>
          </Link>

          <Link
            href={`/room/${roomId}/meal/monthly-total`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-2">📅</div>
            <h2 className="text-xl font-semibold">Monthly Total</h2>
            <p className="text-gray-600 mt-2">View all members' meal counts</p>
          </Link>
        </div>
      </div>
    </div>
  );
}