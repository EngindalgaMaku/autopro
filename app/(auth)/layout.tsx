import { BrandMark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <BrandMark />
      <div className="mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
