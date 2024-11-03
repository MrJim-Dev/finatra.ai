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
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

type Option = {
  label: string;
  value: string;
  children?: Option[];
};

const options: Option[] = [
  {
    label: 'Frontend Frameworks',
    value: 'Frontend Frameworks',
    children: [
      {
        label: 'React',
        value: 'Frontend Frameworks.React',
        children: [
          { label: 'Hooks', value: 'Frontend Frameworks.React.Hooks' },
          { label: 'Context', value: 'Frontend Frameworks.React.Context' },
          { label: 'Redux', value: 'Frontend Frameworks.React.Redux' },
        ],
      },
      {
        label: 'Vue',
        value: 'Frontend Frameworks.Vue',
        children: [
          {
            label: 'Composition API',
            value: 'Frontend Frameworks.Vue.Composition API',
          },
          { label: 'Vuex', value: 'Frontend Frameworks.Vue.Vuex' },
          { label: 'Pinia', value: 'Frontend Frameworks.Vue.Pinia' },
        ],
      },
    ],
  },
  {
    label: 'Backend Frameworks',
    value: 'Backend Frameworks',
    children: [
      {
        label: 'Node.js',
        value: 'Backend Frameworks.Node.js',
        children: [
          { label: 'Express', value: 'Backend Frameworks.Node.js.Express' },
          { label: 'Koa', value: 'Backend Frameworks.Node.js.Koa' },
          { label: 'Nest.js', value: 'Backend Frameworks.Node.js.Nest.js' },
        ],
      },
      {
        label: 'Python',
        value: 'Backend Frameworks.Python',
        children: [
          { label: 'Django', value: 'Backend Frameworks.Python.Django' },
          { label: 'Flask', value: 'Backend Frameworks.Python.Flask' },
          { label: 'FastAPI', value: 'Backend Frameworks.Python.FastAPI' },
        ],
      },
    ],
  },
];

const renderOptions = (
  options: Option[],
  onSelect: (value: string) => void,
  selectedValue: string,
  openMenus: string[]
) => {
  return options.map((option) => {
    const isSelected = selectedValue.startsWith(option.value);
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

export default function MultiLevelSelect() {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(
    null
  );
  const [openMenus, setOpenMenus] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    setSelectedOption(value);

    // Update open menus
    const parts = value.split('.');
    const newOpenMenus = parts.reduce((acc: string[], part, index) => {
      if (index === 0) {
        return [part];
      }
      return [...acc, `${acc[index - 1]}.${part}`];
    }, []);

    setOpenMenus(newOpenMenus);
  };

  const getDisplayValue = (value: string | null) => {
    if (!value) return 'Select an option';
    return value.split('.').join(' / ');
  };

  return (
    <div className="w-full max-w-[300px] sm:max-w-none">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              'w-full sm:w-[300px] justify-between text-left font-normal',
              isOpen && 'bg-accent text-accent-foreground'
            )}
          >
            <span className="truncate">{getDisplayValue(selectedOption)}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full sm:w-[300px] p-0">
          <DropdownMenuRadioGroup
            value={selectedOption || ''}
            onValueChange={setSelectedOption}
          >
            {renderOptions(
              options,
              handleSelect,
              selectedOption || '',
              openMenus
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
