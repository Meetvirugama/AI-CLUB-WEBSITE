import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define the props interface for the component
interface CtaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: React.ReactNode;
  description: string;
  buttonText: string;
  onButtonClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  badge?: React.ReactNode;
}

// Reusable CtaCard component with a clean, modern layout
const CtaCard = React.forwardRef<HTMLDivElement, CtaCardProps>(
  (
    {
      className,
      imageSrc,
      imageAlt,
      title,
      subtitle,
      description,
      buttonText,
      onButtonClick,
      secondaryButtonText,
      onSecondaryButtonClick,
      badge,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all duration-300 hover:shadow-lg hover:border-primary/40",
          "flex flex-col md:flex-row", // Stacks on mobile, row on desktop
          className
        )}
        {...props}
      >
        {/* Image Section */}
        <div className="md:w-1/3 w-full relative min-h-[220px] overflow-hidden bg-muted">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-56 w-full object-cover md:h-full transition-transform duration-500 hover:scale-105" // Ensure image covers the area
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";
            }}
          />
          {badge && <div className="absolute top-3 left-3 z-10">{badge}</div>}
        </div>

        {/* Content Section */}
        <div className="md:w-2/3 w-full p-6 md:p-8 flex flex-col justify-center">
          <div>
            <p className="text-sm font-semibold text-primary">{title}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight break-words">
              {subtitle}
            </h2>
            <p
              className="mt-4 text-muted-foreground line-clamp-2 break-words"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </p>
            {children}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {buttonText && (
                <Button
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onButtonClick?.();
                  }}
                >
                  {buttonText}
                </Button>
              )}
              {secondaryButtonText && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSecondaryButtonClick?.();
                  }}
                >
                  {secondaryButtonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
CtaCard.displayName = "CtaCard";

export { CtaCard };
export type { CtaCardProps };
