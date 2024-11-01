import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface NewGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewGroupForm({ open, onOpenChange }: NewGroupFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Account Group</DialogTitle>
        </DialogHeader>
        <form className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groupName">Account Group Name</Label>
            <Input id="groupName" placeholder="Enter group name" />
          </div>

          <div className="space-y-2">
            <Label>Group Type</Label>
            <RadioGroup defaultValue="default">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit">Account group for credit cards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit">Account group for debit cards</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full">
            Create Group
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
