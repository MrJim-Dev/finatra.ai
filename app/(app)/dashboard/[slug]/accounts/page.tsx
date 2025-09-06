'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { NewAccountButton } from '@/components/new-account-button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccountGroupsByPortfolioAuthenticated,
  deleteAccountAuthenticated,
  deleteAccountGroupAuthenticated,
} from '@/lib/api/auth-proxy';

// Update types to match the database schema
type Account = {
  account_id: string;
  name: string;
  balance: number;
  description?: string;
  in_total: boolean;
  hidden: boolean;
  created_at: string;
};

type AccountGroup = {
  group_id: string;
  group_name: string;
  accounts: Account[];
};

export default function Page({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountGroups = async () => {
      try {
        setLoading(true);
        const res = await getAccountGroupsByPortfolioAuthenticated(params.slug);
        setAccountGroups((res as any)?.data || []);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch account groups:', error);
        setError('Failed to load account groups');
        setAccountGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountGroups();
  }, [params.slug]);

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteAccountAuthenticated(accountId);
      // Refresh the data
      const res = await getAccountGroupsByPortfolioAuthenticated(params.slug);
      setAccountGroups((res as any)?.data || []);
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteAccountGroupAuthenticated(parseInt(groupId));
      // Refresh the data
      const res = await getAccountGroupsByPortfolioAuthenticated(params.slug);
      setAccountGroups((res as any)?.data || []);
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  // Calculate summary totals from the actual data
  const accountTotal =
    accountGroups?.reduce((sum: number, group: any) => {
      return (
        sum +
        (group.accounts || []).reduce((accSum: number, acc: any) => {
          return acc.in_total && acc.balance > 0
            ? accSum + acc.balance
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  const liabilitiesTotal =
    accountGroups?.reduce((sum: number, group: any) => {
      return (
        sum +
        (group.accounts || []).reduce((accSum: number, acc: any) => {
          return acc.in_total && acc.balance < 0
            ? accSum + Math.abs(acc.balance)
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Accounts</h1>
        </div>
        <div className="text-center py-8">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Accounts</h1>
        </div>
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Accounts</h1>
        <div className="flex gap-2">
          <NewAccountButton />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Assets
          </h3>
          <p className="text-2xl font-bold">${accountTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Liabilities
          </h3>
          <p className="text-2xl font-bold">${liabilitiesTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Net Worth
          </h3>
          <p className="text-2xl font-bold">
            ${(accountTotal - liabilitiesTotal).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {accountGroups?.map((group: any) => (
          <div key={group.group_id} className="rounded-lg group">
            <div className="rounded-t-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {group.group_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ${' '}
                    {(group.accounts || [])
                      .reduce(
                        (sum: number, account: any) =>
                          sum + (account.in_total ? account.balance : 0),
                        0
                      )
                      .toFixed(2)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => console.log('Edit group:', group.group_id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteGroup(group.group_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border bg-card">
              {(group.accounts || [])
                .filter((account: any) => !account.hidden)
                .map((account: any) => (
                  <div
                    key={account.account_id}
                    className="px-4 py-2.5 group/account hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{account.name}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${account.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}
                        >
                          $ {Math.abs(account.balance).toFixed(2)}
                        </span>
                        <div className="opacity-0 group-hover/account:opacity-100 transition-opacity flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() =>
                              console.log('Edit account:', account.account_id)
                            }
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                            onClick={() =>
                              handleDeleteAccount(account.account_id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
