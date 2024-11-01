"use client"

import { Plus } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { TransactionModal } from "./transaction-modal"

interface FloatingActionButtonProps {
  className?: string
}

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
          "hover:scale-105 transition-transform",
          className
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TransactionModal 
        open={open} 
        onOpenChange={setOpen}
      />
    </>
  )
}