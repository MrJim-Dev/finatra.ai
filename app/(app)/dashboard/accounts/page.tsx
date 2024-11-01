import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"

type Account = {
  id: string
  name: string
  amount: number
  balancePayable?: number
  outstandingBalance?: number
}

type AccountGroup = {
  id: string
  name: string
  type?: 'credit' | 'regular'
  accounts: Account[]
}

export default function Page() {
  // Summary totals
  const accountTotal = 6928.12
  const liabilitiesTotal = 208542.65
  const totalBalance = -201614.53

  // Dummy data
  const accountGroups: AccountGroup[] = [
    {
      id: "1",
      name: "Cash",
      type: "regular",
      accounts: [
        { id: "1", name: "Cash", amount: 68.45 },
      ]
    },
    {
      id: "2",
      name: "Accounts",
      type: "regular",
      accounts: [
        { id: "2", name: "HIBD", amount: 1455.05 },
        { id: "3", name: "RBO", amount: 1613.61 },
      ]
    },
    {
      id: "3",
      name: "Card",
      type: "credit",
      accounts: [
        { 
          id: "4", 
          name: "HIBD Travel", 
          amount: -300.99,
          balancePayable: -775.40,
          outstandingBalance: 0.00
        },
        { 
          id: "5", 
          name: "RBO Credit Card", 
          amount: -1116.26,
          balancePayable: -1416.25,
          outstandingBalance: 0.00
        },
      ]
    },
    {
      id: "4",
      name: "Debit Card",
      type: "regular",
      accounts: [
        { id: "6", name: "HIBD Debit Card", amount: 0.00 },
        { id: "7", name: "RBO Debit Card", amount: -99.99 },
      ]
    },
    {
      id: "5",
      name: "Savings",
      type: "regular",
      accounts: [
        { id: "8", name: "RBO Saving", amount: 100.00 },
      ]
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6"> 
        <h2 className="text-2xl font-semibold">Accounts</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>New Group</DropdownMenuItem>
            <DropdownMenuItem>New Account</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <p className="text-sm font-medium text-muted-foreground">Liabilities</p>
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
              <h3 className="text-2xl font-bold">
                ${totalBalance.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {accountGroups.map((group) => (
          <div key={group.id} className="rounded-lg">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {group.name}
                </span>
                <span className="text-sm font-medium">
                  $ {group.accounts.reduce((sum, account) => sum + account.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="divide-y divide-border bg-card">
              {group.accounts.map((account) => (
                <div key={account.id} className="px-4 py-2.5">
                  {group.type === 'credit' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex-1">{account.name}</span>
                      <span className="text-sm text-red-500 flex-1 text-right">
                        $ {Math.abs(account.balancePayable || 0).toFixed(2)}
                      </span>
                      <span className="text-sm flex-1 text-right">
                        $ {account.outstandingBalance?.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{account.name}</span>
                      <span className={`text-sm ${account.amount >= 0 ? "text-blue-500" : "text-red-500"}`}>
                        $ {Math.abs(account.amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
