'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { NewGroupForm } from './new-group-form';

export function NewAccountButton() {
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowNewGroupModal(true)}>
            New Group
          </DropdownMenuItem>
          <DropdownMenuItem>New Account</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewGroupForm
        open={showNewGroupModal}
        onOpenChange={setShowNewGroupModal}
      />
    </>
  );
}
