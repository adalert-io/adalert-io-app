import Image from 'next/image';
import Link from 'next/link';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from '@/components/ui/navigation-menu';

export function Header() {
  return (
    <header className="w-full bg-[#FAFBFF] h-16 flex items-center">
      <NavigationMenu className="w-full">
        <NavigationMenuList className="pl-8">
          <NavigationMenuItem>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/adalert-logo.avif"
                alt="AdAlert Logo"
                width={32}
                height={32}
                priority
              />
              <span className="text-xl font-bold text-gray-900 tracking-tight">adAlert.io</span>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
} 