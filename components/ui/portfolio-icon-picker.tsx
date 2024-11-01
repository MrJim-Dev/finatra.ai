import * as React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { HexColorPicker } from 'react-colorful';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import * as Ri from 'react-icons/ri';
import tinycolor from 'tinycolor2';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type IconType = {
  type: 'icon' | 'emoji';
  value: string;
};

interface PortfolioIconPickerProps {
  icon: IconType;
  color: string;
  onIconChange: (value: IconType) => void;
  onColorChange: (value: string) => void;
}

export function PortfolioIconPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: PortfolioIconPickerProps) {
  // Calculate background color based on icon color
  const iconColor = color;
  const backgroundColor = tinycolor(color).setAlpha(0.15).toString();

  // Get all icons from react-icons/ri
  const iconList = Object.keys(Ri)
    .filter((key) => key.startsWith('Ri'))
    .map((key) => ({
      name: key,
      // @ts-ignore
      component: Ri[key],
    }));

  const renderIcon = () => {
    if (!icon.value) return <Plus className="h-8 w-8" />;

    if (icon.type === 'emoji') {
      return (
        <span className="text-2xl" style={{ color: iconColor }}>
          {icon.value}
        </span>
      );
    }

    // @ts-ignore
    const IconComponent = Ri[icon.value];
    return <IconComponent className="h-8 w-8" style={{ color: iconColor }} />;
  };

  // Add local state to handle input value
  const [hexInput, setHexInput] = React.useState(color);

  // Update hex input when color prop changes
  React.useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    // Only update the actual color if it's a valid hex code
    if (tinycolor(value).isValid()) {
      onColorChange(tinycolor(value).toHexString());
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground/50 transition-all hover:border-muted-foreground/50 hover:text-muted-foreground',
            icon.value && 'border-solid'
          )}
          style={{
            backgroundColor,
            borderColor: icon.value
              ? tinycolor(color).setAlpha(0.3).toString()
              : undefined,
          }}
        >
          {renderIcon()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Tabs defaultValue="color">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="icon">Icons</TabsTrigger>
            <TabsTrigger value="emoji">Emojis</TabsTrigger>
          </TabsList>
          <TabsContent value="color" className="mt-3">
            <div className="flex flex-col gap-4">
              <HexColorPicker
                color={color}
                onChange={(newColor) => {
                  onColorChange(newColor);
                  setHexInput(newColor);
                }}
              />
              <div className="grid gap-2">
                <Label htmlFor="hex-color">Hex Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="hex-color"
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#000000"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="icon" className="mt-3">
            <ScrollArea className="h-[300px] w-[300px] p-2">
              <div className="grid grid-cols-6 gap-2">
                {iconList.map(({ name, component: IconComponent }) => (
                  <button
                    key={name}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-muted',
                      icon.value === name && 'bg-muted'
                    )}
                    onClick={() => onIconChange({ type: 'icon', value: name })}
                    style={{
                      backgroundColor:
                        icon.value === name
                          ? tinycolor(color).setAlpha(0.15).toString()
                          : undefined,
                    }}
                  >
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: iconColor }}
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="emoji" className="mt-3">
            <Picker
              data={data}
              onEmojiSelect={(emoji: any) =>
                onIconChange({ type: 'emoji', value: emoji.native })
              }
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
