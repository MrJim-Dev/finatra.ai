import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { NewAccountButton } from '@/components/new-account-button';
import { Button } from '@/components/ui/button';
import { createClient, getUser } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { accountIncludedInTotals } from '@/lib/accounts-total';
import { creditCardPayableAndOutstanding } from '@/lib/credit-card-display';
import { redirect, notFound } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatMoneyAmount, normalizeCurrencyCode } from '@/lib/format-money';

/** Align name + Balance payable + Outst. balance columns across header, subheaders, and rows. */
const CC_ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] items-start gap-x-3 md:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] md:gap-x-6';

type ViewAccount = {
  account_id: string;
  name: string;
  balance: number;
  in_total?: boolean | null;
  hidden?: boolean | null;
  description?: string | null;
};

type ViewGroup = {
  group_id: string;
  group_name: string;
  accounts: ViewAccount[];
  group_type: string;
};

export default async function Page({ params }: { params: { slug: string } }) {
  const { user } = await getUser();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) {
    notFound();
  }

  const supabase = await createClient();

  const [{ data: accountGroups, error }, { data: groupMeta }] = await Promise.all([
    supabase
      .from('user_accounts_grouped_view')
      .select('*')
      .eq('port_id', portfolio.port_id),
    supabase
      .from('account_groups')
      .select('group_id, group_type')
      .eq('port_id', portfolio.port_id),
  ]);

  if (error) {
    console.error('Error fetching accounts:', error);
    return <div>Error loading accounts</div>;
  }

  const typeByGroup = new Map(
    (groupMeta ?? []).map((g) => [g.group_id, g.group_type ?? 'default'])
  );

  const typedGroups: ViewGroup[] = (accountGroups ?? []).map((g: ViewGroup) => ({
    ...g,
    group_type: (typeByGroup.get(g.group_id) as string) ?? 'default',
  }));

  // Credit-card groups always render last (below cash / debit / default groups).
  const sortedGroups = [...typedGroups].sort((a, b) => {
    const aCredit = a.group_type === 'credit' ? 1 : 0;
    const bCredit = b.group_type === 'credit' ? 1 : 0;
    return aCredit - bCredit;
  });

  const assetGroups = sortedGroups.filter((g) => g.group_type !== 'credit');
  const creditGroups = sortedGroups.filter((g) => g.group_type === 'credit');

  const accountTotal =
    assetGroups.reduce((sum, group) => {
      return (
        sum +
        group.accounts.reduce((accSum, acc) => {
          return accountIncludedInTotals(acc.in_total) && acc.balance > 0
            ? accSum + acc.balance
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  const liabilitiesTotal =
    sortedGroups.reduce((sum, group) => {
      return (
        sum +
        group.accounts.reduce((accSum, acc) => {
          return accountIncludedInTotals(acc.in_total) && acc.balance < 0
            ? accSum + Math.abs(acc.balance)
            : accSum;
        }, 0)
      );
    }, 0) || 0;

  const totalBalance = accountTotal - liabilitiesTotal;

  const displayCurrency = normalizeCurrencyCode(portfolio.default_currency);

  const creditAccounts = creditGroups.flatMap((g) => g.accounts);
  const creditPayableTotal = creditAccounts.reduce((s, a) => {
    if (!accountIncludedInTotals(a.in_total)) return s;
    const { payable } = creditCardPayableAndOutstanding(a.balance);
    return s + payable;
  }, 0);
  const creditOutstandingTotal = creditAccounts.reduce((s, a) => {
    if (!accountIncludedInTotals(a.in_total)) return s;
    const { outstanding } = creditCardPayableAndOutstanding(a.balance);
    return s + outstanding;
  }, 0);

  function groupSubtotal(accounts: ViewAccount[]) {
    return accounts.reduce(
      (sum, account) =>
        sum +
        (accountIncludedInTotals(account.in_total) ? account.balance : 0),
      0
    );
  }

  return (
    <div className="bg-background flex flex-1 flex-col gap-0 pb-8">
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-4 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Accounts
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9 shrink-0" asChild>
            <Link
              href={`/dashboard/${params.slug}/settings?tab=accounts`}
              aria-label="Settings"
            >
              <Pencil className="size-4" />
            </Link>
          </Button>
          <NewAccountButton />
        </div>
      </div>

      <div className="border-border/40 grid grid-cols-3 divide-x divide-border border-b bg-card/30">
        <div className="px-2 py-3 text-center md:px-4">
          <p className="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase tracking-wider md:text-xs">
            Assets
          </p>
          <p className="text-base font-semibold tabular-nums text-blue-500 md:text-lg">
            {formatMoneyAmount(accountTotal, displayCurrency)}
          </p>
        </div>
        <div className="px-2 py-3 text-center md:px-4">
          <p className="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase tracking-wider md:text-xs">
            Liabilities
          </p>
          <p className="text-base font-semibold tabular-nums text-red-500 md:text-lg">
            −{formatMoneyAmount(liabilitiesTotal, displayCurrency)}
          </p>
        </div>
        <div className="px-2 py-3 text-center md:px-4">
          <p className="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase tracking-wider md:text-xs">
            Total
          </p>
          <p className="text-foreground text-base font-semibold tabular-nums md:text-lg">
            {formatMoneyAmount(totalBalance, displayCurrency)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0">
        {assetGroups.map((group) => (
          <section key={group.group_id} className="border-border/40 border-b">
            <div className="text-muted-foreground flex items-center justify-between px-4 py-2.5 text-xs font-medium md:px-6">
              <span>{group.group_name}</span>
              <span className="text-foreground tabular-nums">
                {formatMoneyAmount(groupSubtotal(group.accounts), displayCurrency)}
              </span>
            </div>
            <div className="divide-border divide-y bg-card">
              {group.accounts
                .filter((a) => !a.hidden)
                .map((account) => {
                  const included = accountIncludedInTotals(account.in_total);
                  return (
                    <Link
                      key={account.account_id}
                      href={`/dashboard/${params.slug}/accounts/${account.account_id}`}
                      className={cn(
                        'hover:bg-muted/50 block px-4 py-3 transition-colors md:px-6',
                        !included && 'text-muted-foreground'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium leading-tight">
                            {account.name}
                          </span>
                          {account.description ? (
                            <p
                              className={cn(
                                'mt-0.5 line-clamp-2 text-xs',
                                included ? 'text-muted-foreground' : 'opacity-80'
                              )}
                            >
                              {account.description}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-sm tabular-nums',
                            included
                              ? account.balance >= 0
                                ? 'text-blue-500'
                                : 'text-red-500'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatMoneyAmount(
                            Math.abs(account.balance),
                            displayCurrency
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        ))}

        {creditGroups.length > 0 ? (
          <section className="border-border/40 mt-1 border-b">
            <div className={cn(CC_ROW_GRID, 'px-4 py-2.5 md:px-6')}>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Liabilities
              </span>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider md:text-xs">
                  Balance payable
                </span>
                <span className="text-red-500 text-sm tabular-nums md:text-base">
                  {formatMoneyAmount(creditPayableTotal, displayCurrency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider md:text-xs">
                  Outst. balance
                </span>
                <span className="text-blue-500 text-sm tabular-nums md:text-base">
                  {formatMoneyAmount(creditOutstandingTotal, displayCurrency)}
                </span>
              </div>
            </div>

            {creditGroups.map((group) => (
              <div key={group.group_id}>
                <div
                  className={cn(
                    CC_ROW_GRID,
                    'text-muted-foreground bg-muted/20 px-4 py-2 text-[11px] font-medium md:px-6'
                  )}
                >
                  <span className="min-w-0 truncate">{group.group_name}</span>
                  <span className="text-right tabular-nums text-red-500">
                    {formatMoneyAmount(
                      group.accounts.reduce((s, a) => {
                        if (!accountIncludedInTotals(a.in_total)) return s;
                        return (
                          s +
                          creditCardPayableAndOutstanding(a.balance).payable
                        );
                      }, 0),
                      displayCurrency
                    )}
                  </span>
                  <span className="text-right tabular-nums text-blue-500">
                    {formatMoneyAmount(
                      group.accounts.reduce((s, a) => {
                        if (!accountIncludedInTotals(a.in_total)) return s;
                        return (
                          s +
                          creditCardPayableAndOutstanding(a.balance).outstanding
                        );
                      }, 0),
                      displayCurrency
                    )}
                  </span>
                </div>
                <div className="divide-border divide-y bg-card">
                  {group.accounts
                    .filter((a) => !a.hidden)
                    .map((account) => {
                      const included = accountIncludedInTotals(account.in_total);
                      const { payable, outstanding } =
                        creditCardPayableAndOutstanding(account.balance);
                      return (
                        <Link
                          key={account.account_id}
                          href={`/dashboard/${params.slug}/accounts/${account.account_id}`}
                          className={cn(
                            'hover:bg-muted/50 block px-4 py-3 transition-colors md:px-6',
                            !included && 'text-muted-foreground'
                          )}
                        >
                          <div className={cn(CC_ROW_GRID, 'gap-y-1')}>
                            <div className="min-w-0">
                              <span className="text-sm font-medium leading-tight">
                                {account.name}
                              </span>
                              {account.description ? (
                                <p
                                  className={cn(
                                    'mt-0.5 line-clamp-1 text-xs',
                                    included ? 'text-muted-foreground' : 'opacity-80'
                                  )}
                                >
                                  {account.description}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                'text-right text-sm tabular-nums',
                                included
                                  ? payable > 0
                                    ? 'text-red-500'
                                    : 'text-muted-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {formatMoneyAmount(payable, displayCurrency)}
                            </span>
                            <span
                              className={cn(
                                'text-right text-sm tabular-nums',
                                included
                                  ? outstanding > 0
                                    ? 'text-blue-500'
                                    : 'text-muted-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {formatMoneyAmount(outstanding, displayCurrency)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
