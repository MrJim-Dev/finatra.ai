'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';

export function SearchInput() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (value) {
        searchParams.set('search', value);
      } else {
        searchParams.delete('search');
      }
      searchParams.delete('page'); // Reset to first page on new search
      router.push(`?${searchParams.toString()}`);
    }, 300),
    [router]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <Input
      type="search"
      placeholder="Search projects..."
      value={search}
      onChange={handleSearch}
      className="mb-6"
    />
  );
}
