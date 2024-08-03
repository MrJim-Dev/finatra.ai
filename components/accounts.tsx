// Define the Account interface
export interface Account {
  id: number
  uid: string
  name: string
  description: string
}

// Create an AccountCard component to display individual account details
export function AccountCard({ account }: { account: Account }) {
  return (
    <div className=" flex items-center space-x-4 rounded-md border p-4">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{account.name}</p>
        <p className="text-sm text-muted-foreground">{account.description}</p>
      </div>
    </div>
  )
}

// The Accounts component that maps and displays account cards
export function Accounts({ accounts }: { accounts: Account[] }) {
  if (!accounts.length) {
    return null
  }

  return (
    <div className="flex gap-2">
      {accounts.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}
