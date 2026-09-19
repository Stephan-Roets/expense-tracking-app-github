'use client';

import { useState, useEffect } from 'react';
import { getActiveRecurringExpensesByVehicle, deleteRecurringExpense } from '@/lib/api/client';

interface RecurringExpense {
  id: string;
  category: string;
  description: string;
  amountZar: number;
  recurrenceDays?: string;
  recurrenceDaysOfMonth?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}

interface RecurringExpensesListProps {
  vehicleId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FUEL_LOG: 'Fuel',
  MECHANIC_SERVICE: 'Mechanic Service',
  MAINTENANCE_TOPUP: 'Maintenance Top-up',
  TIRES: 'Tires',
  CAR_WASH: 'Car Wash',
  INSURANCE_PREMIUM: 'Insurance',
  VEHICLE_TRACKING: 'Vehicle Tracking',
  ETOLL_SANRAL: 'e-Toll',
  LICENSE_RENEWAL: 'License Renewal',
  PERSONAL_LICENSE: 'Personal License',
  ROADWORTHY: 'Roadworthy',
  OTHER_FIXED: 'Other Fixed',
  PARKING: 'Parking',
};

export default function RecurringExpensesList({ vehicleId }: RecurringExpensesListProps) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [vehicleId]);

  const fetchExpenses = async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getActiveRecurringExpensesByVehicle(vehicleId);
      setExpenses(response.data || []);
    } catch (err) {
      console.error('Failed to fetch recurring expenses:', err);
      setError('Failed to load recurring expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this recurring expense?')) {
      await deleteRecurringExpense(id);
      fetchExpenses();
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category] || category;
  };

  if (loading) return <div className="mt-8 text-sm text-muted-foreground">Loading...</div>;
  if (error) return <div className="mt-8 text-sm text-red-600">{error}</div>;
  if (expenses.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-4">Recurring Expenses</h3>
      <div className="space-y-2">
        {expenses.map(expense => (
          <div key={expense.id} className="bg-muted p-3 rounded flex justify-between dark:bg-muted/50">
            <div>
              <p className="font-medium">{getCategoryLabel(expense.category)} - {expense.description}</p>
              <p className="text-sm text-muted-foreground">
                Amount: R{expense.amountZar.toFixed(2)} | Days: {expense.recurrenceDays || 'N/A'}
              </p>
            </div>
            <button
              onClick={() => handleDelete(expense.id)}
              className="text-red-600 text-sm dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
