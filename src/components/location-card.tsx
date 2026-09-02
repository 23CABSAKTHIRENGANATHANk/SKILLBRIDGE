import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company } from "@/types/skillbridge";

/**
 * Premium location card. Coordinates always come from the API payload —
 * nothing here is hardcoded to a specific company.
 */
export function LocationCard({ company }: { company: Company }) {
  const hasCoords = typeof company.latitude === "number" && typeof company.longitude === "number";
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${company.latitude},${company.longitude}`
    : null;

  return (
    <section
      aria-labelledby="location-title"
      className="overflow-hidden rounded-3xl border bg-card shadow-soft"
    >
      <div className="relative h-44 surface-gradient">
        <div aria-hidden="true" className="grid-field absolute inset-0" />
        {hasCoords && (
          <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="absolute size-12 animate-ping rounded-full bg-primary/20" />
            <span className="relative flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
          </span>
        )}
      </div>
      <div className="p-6">
        <h2 id="location-title" className="font-display text-lg font-bold">
          Where we&apos;re building
        </h2>
        <p className="mt-1 text-sm font-medium">{company.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {company.address ?? "Address not provided"}
          {company.city ? ` · ${company.city}` : ""}
        </p>
        {mapsUrl ? (
          <Button asChild variant="outline" className="mt-5">
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Open in Maps <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">
            Location coordinates haven&apos;t been published by this company yet.
          </p>
        )}
      </div>
    </section>
  );
}
