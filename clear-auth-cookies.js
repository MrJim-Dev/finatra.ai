// Run this in your browser console to immediately clear authentication cookies
// and fix the 401 Unauthorized error

console.log('🧹 Clearing authentication cookies...');

// Clear all authentication cookies
document.cookie =
  'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
document.cookie =
  'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
document.cookie =
  'active_portfolio=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

console.log('✅ Authentication cookies cleared!');
console.log('🔄 Refreshing page...');

// Refresh the page to trigger redirect to login
window.location.reload();
