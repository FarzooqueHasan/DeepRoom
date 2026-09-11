import { cn } from './lib/utils';

export { cn };

export function createPageUrl(pageName) {
  if (!pageName) return '/';
  if (pageName === 'Home') return '/';
  if (pageName.startsWith('Home?')) return '/' + pageName.slice(4);
  if (pageName.startsWith('/')) return pageName;
  return `/${pageName}`;
}
