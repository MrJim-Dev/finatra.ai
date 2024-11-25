'use server'

import { cookies } from 'next/headers'

export async function toggleRightSidebar() {
  const cookieStore = cookies()
  const isOpen = cookieStore.get('rightSidebarOpen')?.value === 'true'
  cookieStore.set('rightSidebarOpen', (!isOpen).toString())
}

export async function getRightSidebarState() {
  const cookieStore = cookies()
  return cookieStore.get('rightSidebarOpen')?.value === 'true'
}
