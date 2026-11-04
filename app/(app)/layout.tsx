import { Sidebar } from "@/components/sidebar";
import { isDemoMode } from "@/lib/demo";
import { requireUser } from "@/lib/session";

// Every signed-in screen: the collapsible sidebar, and room at the bottom on phones for the tab bar
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notice = user.business.isDemo
    ? "Demo hesap: veriler her gece 03.00'te sıfırlanır. Gerçek bilgi girmeyin."
    : isDemoMode() && "Tanıtım sürümü: gerçek müşteri bilgisi girmeyin.";
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
      <main className="min-w-0 flex-1 pt-14 pb-[calc(88px+env(safe-area-inset-bottom))] md:pt-0 md:pb-10">
        {notice && (
          <p role="note" data-testid="demo-notice" className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs font-medium text-ink">
            {notice}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
