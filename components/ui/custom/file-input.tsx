import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import clsx from 'clsx';

interface FileInputProps {
  label: string;
  description?: string;
  value: File | string | null;
  onChange: (file: File | null) => void;
  accept?: string;
  id: string;
  error?: string;
  existingImageUrl?: string;
  className?: string;
}

const FileInput: React.FC<FileInputProps> = ({
  label,
  description,
  value,
  onChange,
  accept = 'image/*',
  id,
  error,
  existingImageUrl,
  className,
}) => {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div
          className={clsx(
            'relative w-16 h-16 border border-input rounded-md overflow-hidden',
            className
          )}
        >
          <Input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              onChange(file || null);
            }}
            id={id}
          />
          <Button
            type="button"
            variant="ghost"
            className="absolute inset-0 w-full h-full p-0 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50 transition-colors"
            onClick={() => document.getElementById(id)?.click()}
          >
            {value instanceof File ? (
              <img
                src={URL.createObjectURL(value)}
                alt="Selected File"
                className="w-full h-full object-cover"
              />
            ) : existingImageUrl ? (
              <img
                src={existingImageUrl}
                alt="Existing File"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mb-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="text-xs">Upload</span>
              </>
            )}
          </Button>
        </div>
      </FormControl>
      {description && (
        <FormDescription className="text-xs mt-1">
          {description}
        </FormDescription>
      )}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
};

export default FileInput;
