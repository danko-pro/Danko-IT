import type { MouseEventHandler, ReactNode } from "react";

export type CatalogIconActionVariant = "default" | "primary" | "danger";

export type CatalogIconActionProps = {
  icon: ReactNode;
  ariaLabel: string;
  title: string;
  variant?: CatalogIconActionVariant;
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function CatalogIconAction({
  icon,
  ariaLabel,
  title,
  variant = "default",
  className,
  disabled,
  onClick,
}: CatalogIconActionProps) {
  const variantClass = variant === "default" ? "" : ` ce-icon-action-${variant}`;
  const extraClass = className ? ` ${className}` : "";

  return (
    <button
      type="button"
      className={`ce-icon-action${variantClass}${extraClass}`}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
