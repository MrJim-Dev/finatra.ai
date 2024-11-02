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
import { NewAccountForm } from './new-account-form';

export function NewAccountButton() {
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);

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
          <DropdownMenuItem onClick={() => setShowNewAccountModal(true)}>
            New Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {console.log('showNewAccountModal:', showNewAccountModal)}

      <NewGroupForm
        open={showNewGroupModal}
        onOpenChange={setShowNewGroupModal}
      />
      <NewAccountForm
        open={showNewAccountModal}
        onOpenChange={setShowNewAccountModal}
      />
    </>
  );
}
