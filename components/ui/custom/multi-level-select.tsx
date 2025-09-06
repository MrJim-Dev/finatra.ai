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

    if (option.children) {
      return (
        <DropdownMenuSub key={option.value}>
          <DropdownMenuSubTrigger
            className={cn(
              'flex w-full items-center px-2 py-1.5 text-sm outline-none',
              isSelected && 'text-accent-foreground'
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(option.value);
            }}
          >
            <span className="truncate">{option.label}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="p-0 min-w-[200px] max-h-[300px] overflow-y-auto"
            alignOffset={-4}
            sideOffset={0}
          >
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
            'flex w-full cursor-pointer items-center px-2 py-1.5 text-sm outline-none',
            isSelected && 'bg-accent text-accent-foreground'
          )}
        >
          <span className="truncate">{option.label}</span>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              'w-full justify-between text-left font-normal',
              openMenus.length > 0 && 'text-accent-foreground'
            )}
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="p-0 w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto"
          sideOffset={4}
          align="start"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={handleSelect}>
            {renderOptions(options, handleSelect, value || '', openMenus)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
