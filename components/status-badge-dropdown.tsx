import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface StatusOption {
  value: string;
  color: string;
}

interface StatusBadgeDropdownProps {
  currentStatus: string;
  isAuthorized: boolean;
  featureId: string;
  onStatusUpdated?: (newStatus: string) => void;
}

const statusOptions: StatusOption[] = [
  { value: 'Open', color: 'bg-blue-100 text-blue-800' },
  { value: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', color: 'bg-gray-100 text-gray-800' },
];

export function StatusBadgeDropdown({
  currentStatus,
  isAuthorized = true,
  featureId,
  onStatusUpdated,
}: StatusBadgeDropdownProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusColor = (statusValue: string) => {
    return (
      statusOptions.find((option) => option.value === statusValue)?.color ||
      'bg-gray-100 text-gray-800'
    );
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthorized) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase
      .from('featurerequests')
      .update({ status: newStatus })
      .eq('id', featureId);

    if (!error) {
      setStatus(newStatus);
      toast({
        title: 'Status updated',
        description: `Feature status changed to ${newStatus}`,
        variant: 'default',
      });
      if (onStatusUpdated) {
        onStatusUpdated(newStatus);
      }
    } else {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    }
    setIsDropdownOpen(false);
  };

  return (
    <span className="relative mx-2" ref={dropdownRef}>
      <Badge
        variant="secondary"
        className={`cursor-${isAuthorized ? 'pointer' : 'default'} ${getStatusColor(status)}`}
        onClick={handleBadgeClick}
      >
        {status}
      </Badge>
      {isAuthorized && isDropdownOpen && (
        <div className="absolute z-10 mt-2 min-w-[100px] rounded-md shadow-lg bg-background border ring-opacity-5">
          <div
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
            className="whitespace-nowrap"
          >
            {statusOptions.map((option) => (
              <div className="hover:bg-accent px-1 py-1" key={option.value}>
                <Badge
                  key={option.value}
                  className={`w-full justify-center cursor-pointer ${option.color}`}
                  onClick={(e) => handleStatusChange(e, option.value)}
                >
                  {option.value}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
