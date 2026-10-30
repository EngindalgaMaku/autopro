import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/session";

// Every signed-in screen: the nav, and room at the bottom on phones for the tab bar
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="md:flex">
      <AppNav businessName={user.business.name} />
      <main className="min-w-0 flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8">{children}</main>
    </div>
  );
}
