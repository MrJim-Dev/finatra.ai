import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';
import { NewGroupForm } from '@/components/new-group-form';
import { NewAccountButton } from '@/components/new-account-button';
import { createClient } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';

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

// Make the component async
export default async function Page({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const portfolio = await getPortfolioBySlug(params.slug);

  // Fetch data from Supabase
  const { data: accountGroups, error } = await supabase
    .from('user_accounts_grouped_view')
    .select('*')
    .eq('port_id', portfolio?.port_id);

  if (error) {
    console.error('Error fetching accounts:', error);
    return <div>Error loading accounts</div>;
  }

  // Calculate summary totals from the actual data
  const accountTotal =
    accountGroups?.reduce((sum, group) => {
      return (
        sum +
        group.accounts.reduce((accSum, acc) => {
          return acc.in_total && acc.balance > 0
            ? accSum + acc.balance
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  const liabilitiesTotal =
    accountGroups?.reduce((sum, group) => {
      return (
        sum +
        group.accounts.reduce((accSum, acc) => {
          return acc.in_total && acc.balance < 0
            ? accSum + Math.abs(acc.balance)
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  const totalBalance = accountTotal - liabilitiesTotal;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Accounts</h2>
        <NewAccountButton />
      </div>

      {/* Summary Header */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Account</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-blue-500">
                ${accountTotal.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              Liabilities
            </p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-red-500">
                ${liabilitiesTotal.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Total</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">${totalBalance.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {accountGroups?.map((group) => (
          <div key={group.group_id} className="rounded-lg">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {group.group_name}
                </span>
                <span className="text-sm font-medium">
                  ${' '}
                  {group.accounts
                    .reduce(
                      (sum, account) =>
                        sum + (account.in_total ? account.balance : 0),
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>
            <div className="divide-y divide-border bg-card">
              {group.accounts
                .filter((account) => !account.hidden)
                .map((account) => (
                  <div key={account.account_id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{account.name}</span>
                      <span
                        className={`text-sm ${account.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}
                      >
                        $ {Math.abs(account.balance).toFixed(2)}
                      </span>
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
