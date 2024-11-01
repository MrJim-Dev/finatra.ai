import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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

type Transaction = {
  id: string
  date: Date
  description: string
  amount: number
  status: "pending" | "processing" | "success" | "failed"
  category: string
  account: string
}

function groupTransactionsByDay(transactions: Transaction[]) {
  return transactions.reduce((groups, transaction) => {
    const date = transaction.date.toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(transaction)
    return groups
  }, {} as Record<string, Transaction[]>)
}

function getDayTotal(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.amount > 0) {
        acc.income += transaction.amount
      } else {
        acc.expense += Math.abs(transaction.amount)
      }
      return acc
    },
    { income: 0, expense: 0 }
  )
}

export default function Page() {
  const transactions: Transaction[] = [
    {
      id: "1",
      date: new Date("2024-03-20"),
      description: "Netflix Subscription",
      amount: -19.99,
      status: "success",
      category: "Entertainment",
      account: "Credit Card",
    },
    {
      id: "2",
      date: new Date("2024-03-20"),
      description: "Salary Deposit",
      amount: 5000,
      status: "success",
      category: "Income",
      account: "Main Account",
    },
    {
      id: "3",
      date: new Date("2024-03-19"),
      description: "Spotify Premium",
      amount: 9.99,
      status: "pending",
      category: "Entertainment",
      account: "Credit Card",
    },
    // Add more transactions as needed
  ]

  const groupedTransactions = groupTransactionsByDay(transactions)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">$45,231.89</h3>
              <span className="text-sm text-emerald-500">+20.1%</span>
            </div>
            <p className="text-xs text-muted-foreground">from last month</p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Subscriptions</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">+2350</h3>
              <span className="text-sm text-emerald-500">+180.1%</span>
            </div>
            <p className="text-xs text-muted-foreground">from last month</p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Sales</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">+12,234</h3>
              <span className="text-sm text-emerald-500">+19%</span>
            </div>
            <p className="text-xs text-muted-foreground">from last month</p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Active Now</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">+573</h3>
              <span className="text-sm text-emerald-500">+201</span>
            </div>
            <p className="text-xs text-muted-foreground">since last hour</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">Details</TableHead>
              <TableHead className="w-[20%]">Category</TableHead>
              <TableHead className="w-[20%]">Account</TableHead>
              <TableHead className="w-[20%] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => {
              const { income, expense } = getDayTotal(dayTransactions)
              return (
                <React.Fragment key={date}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="bg-muted/50 py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{date}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-emerald-600">
                            Income: ${income.toFixed(2)}
                          </span>
                          <span className="text-red-600">
                            Expense: ${expense.toFixed(2)}
                          </span>
                          <span className="font-medium">
                            Net: ${(income - expense).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {dayTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{transaction.description}</span>
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              transaction.status === "success"
                                ? "bg-emerald-50 text-emerald-700"
                                : transaction.status === "pending"
                                ? "bg-yellow-50 text-yellow-700"
                                : transaction.status === "failed"
                                ? "bg-red-50 text-red-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-1 text-sm">
                          {transaction.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.account}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            transaction.amount > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }
                        >
                          {transaction.amount > 0 ? "+" : "-"}$
                          {Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
