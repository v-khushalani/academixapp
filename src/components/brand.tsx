import { useEffect, useState } from "react";
import { getBrandedInstitute } from "@/lib/academy-settings";

export type Brand = { name: string; logo: string; initials: string };

/** Live institute branding (name + logo), kept in sync with the settings cache. */
export function useBrand(fallback = "Academix"): Brand {
  const [brand, setBrand] = useState<Brand>({
    name: fallback,
    logo: "",
    initials: "Ax",
  });

  useEffect(() => {
    const sync = () => {
      const inst = getBrandedInstitute();
      const name = inst.name || fallback;
      setBrand({
        name,
        logo: inst.logo_url || "",
        initials: (name.match(/\b\w/g) || ["A"]).slice(0, 2).join("").toUpperCase(),
      });
    };
    sync();
    window.addEventListener("vk-institute-changed", sync);
    return () => window.removeEventListener("vk-institute-changed", sync);
  }, [fallback]);

  return brand;
}

/** Institute logo (or initials) — used in every app/portal header. */
export function BrandMark({ brand, size = 36 }: { brand: Brand; size?: number }) {
  if (brand.logo) {
    return (
      <img
        src={brand.logo}
        alt={brand.name}
        style={{ height: size, width: size }}
        className="shrink-0 rounded-md border border-border bg-card object-contain"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="grid shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
    >
      <span className="text-xs font-bold">{brand.initials}</span>
    </div>
  );
}

/** Academix credit line shown under institute-branded surfaces. */
export function PoweredByAcademix({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-muted-foreground ${className}`}>
      Powered by <span className="font-semibold text-foreground/70">Academix</span>
    </p>
  );
}

/** Keeps the browser tab title branded with the institute name. */
export function useBrandedTitle(page?: string) {
  const brand = useBrand();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = [page, brand.name, "Academix"].filter(Boolean).join(" · ");
  }, [brand.name, page]);
}
