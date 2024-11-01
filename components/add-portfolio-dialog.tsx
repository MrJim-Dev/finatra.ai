import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortfolioIconPicker } from './ui/portfolio-icon-picker';

interface AddPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPortfolioDialog({
  open,
  onOpenChange,
}: AddPortfolioDialogProps) {
  const [icon, setIcon] = React.useState<{
    type: 'icon' | 'emoji';
    value: string;
  }>({
    type: 'icon',
    value: '',
  });
  const [color, setColor] = React.useState<string>('#4F46E5');
  const [title, setTitle] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!icon.value || !color || !title.trim()) {
      return; // Add proper error handling/messaging here
    }

    // Handle portfolio creation here
    console.log({ icon, color, title });
    onOpenChange(false);

    // Reset form
    setIcon({ type: 'icon', value: '' });
    setColor('#4F46E5');
    setTitle('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <PortfolioIconPicker
                icon={icon}
                color={color}
                onIconChange={setIcon}
                onColorChange={setColor}
              />
              <span className="text-sm text-muted-foreground">
                Choose an icon and color
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Portfolio Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter portfolio title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Portfolio</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
