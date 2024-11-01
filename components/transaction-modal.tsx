import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionModal({ open, onOpenChange }: TransactionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>
          <TabsContent value="income">
            Income form will go here
          </TabsContent>
          <TabsContent value="expense">
            Expense form will go here
          </TabsContent>
          <TabsContent value="transfer">
            Transfer form will go here
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}