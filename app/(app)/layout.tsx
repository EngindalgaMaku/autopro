import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/session";

// Every signed-in screen: the collapsible sidebar, and room at the bottom on phones for the tab bar
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh bg-ground md:flex">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: user.business.name,
        }}
      />
      <main className="min-w-0 flex-1 pt-14 pb-[calc(88px+env(safe-area-inset-bottom))] md:pt-0 md:pb-10">{children}</main>
    </div>
  );
}
