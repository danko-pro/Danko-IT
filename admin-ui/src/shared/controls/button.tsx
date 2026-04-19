/**
 * Базовые кнопки admin UI.
 * Компоненты пока только нормализуют variant/tone API поверх существующих CSS-классов,
 * чтобы можно было постепенно переводить экраны на общий control-layer без visual rewrite.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "action" | "secondary" | "micro";
type ButtonTone = "default" | "danger";

type SharedButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  className?: string;
  tone?: ButtonTone;
  variant?: ButtonVariant;
};

function buildButtonClassName(variant: ButtonVariant, tone: ButtonTone, className?: string) {
  const variantClassName =
    variant === "action" ? "action-button" : variant === "secondary" ? "secondary-button" : "micro-action";
  const toneClassName = tone === "danger" ? "micro-action-danger" : "";

  return [variantClassName, toneClassName, className].filter(Boolean).join(" ");
}

export function Button(props: SharedButtonProps) {
  const {
    children,
    className,
    tone = "default",
    type = "button",
    variant = "action",
    ...buttonProps
  } = props;

  return (
    <button type={type} className={buildButtonClassName(variant, tone, className)} {...buttonProps}>
      {children}
    </button>
  );
}

type IconButtonProps = Omit<SharedButtonProps, "children"> & {
  ariaLabel: string;
  children: ReactNode;
};

export function IconButton(props: IconButtonProps) {
  const { ariaLabel, title, ...buttonProps } = props;

  return <Button aria-label={ariaLabel} title={title ?? ariaLabel} {...buttonProps} />;
}
