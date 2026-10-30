import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The few primitives every screen uses. Touch targets are 44–56px: the shop floor is wet
// hands and gloves.

export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-hover font-semibold",
        secondary: "bg-raised text-ink hover:bg-line border border-line",
        ghost: "text-ink hover:bg-raised",
        light: "bg-ink text-ground hover:bg-white font-semibold",
        danger: "text-danger hover:bg-raised",
      },
      size: {
        md: "h-12 px-5 text-[15px]",
        lg: "h-14 px-6 text-base",
        sm: "h-11 px-4 text-sm",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-line bg-sunken px-4 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-danger">{error}</span>
      ) : (
        hint && <span className="block text-sm text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface", className)} {...props} />;
}

/** Small upper-case section label, as on the design */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-[13px] font-semibold uppercase tracking-[0.6px] text-muted", className)}>{children}</h2>;
}
