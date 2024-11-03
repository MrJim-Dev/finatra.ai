'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu';

export type Option = {
  label: string;
  value: string;
  children?: Option[];
};

interface MultiLevelSelectProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const renderOptions = (
  options: Option[],
  onSelect: (value: string) => void,
  selectedValue: string,
  openMenus: string[]
) => {
  return options.map((option) => {
    const isSelected = selectedValue === option.value;
    const isOpen = openMenus.includes(option.value);

    if (option.children) {
      return (
        <DropdownMenuSub key={option.value} open={isOpen}>
          <DropdownMenuSubTrigger
            onClick={(e) => {
              e.preventDefault();
              onSelect(option.value);
            }}
            className={cn(
              'flex w-full items-center justify-between px-2 py-1.5 text-sm outline-none',
              isSelected && 'bg-accent text-accent-foreground'
            )}
          >
            {option.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-0">
            {renderOptions(option.children, onSelect, selectedValue, openMenus)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    } else {
      return (
        <DropdownMenuItem
          key={option.value}
          onSelect={() => onSelect(option.value)}
          className={cn(
            'flex w-full cursor-pointer items-center justify-between px-2 py-1.5 text-sm outline-none',
            isSelected && 'bg-accent text-accent-foreground'
          )}
        >
          {option.label}
          {isSelected && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      );
    }
  });
};

export default function MultiLevelSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
}: MultiLevelSelectProps) {
  const [openMenus, setOpenMenus] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (newValue: string) => {
    onChange?.(newValue);

    // Update open menus
    const parts = newValue.split('.');
    const newOpenMenus = parts.reduce((acc: string[], part, index) => {
      if (index === 0) {
        return [part];
      }
      return [...acc, `${acc[index - 1]}.${part}`];
    }, []);

    setOpenMenus(newOpenMenus);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const path: string[] = [];
    const findOptionPath = (opts: Option[], searchValue: string): boolean => {
      for (const opt of opts) {
        if (opt.value === searchValue) {
          path.push(opt.label);
          return true;
        }
        if (opt.children && findOptionPath(opt.children, searchValue)) {
          path.unshift(opt.label);
          return true;
        }
      }
      return false;
    };

    findOptionPath(options, value);
    return path.length > 0 ? path.join('/') : placeholder;
  };

  return (
    <div className="w-full">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              'w-full justify-between text-left font-normal',
              isOpen && 'bg-accent text-accent-foreground'
            )}
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-0">
          <DropdownMenuRadioGroup value={value} onValueChange={handleSelect}>
            {renderOptions(options, handleSelect, value || '', openMenus)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
