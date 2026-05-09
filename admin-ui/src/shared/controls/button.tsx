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

type DeleteButtonProps = Omit<SharedButtonProps, "children" | "tone"> & {
  busy?: boolean;
  busyLabel?: string;
  children?: ReactNode;
};

export function DeleteButton(props: DeleteButtonProps) {
  const {
    busy = false,
    busyLabel = "...",
    children = "Удалить",
    disabled,
    variant = "micro",
    ...buttonProps
  } = props;

  return (
    <Button {...buttonProps} disabled={disabled || busy} tone="danger" variant={variant}>
      {busy ? busyLabel : children}
    </Button>
  );
}

type AddButtonProps = Omit<SharedButtonProps, "children" | "tone"> & {
  children?: ReactNode;
  glyphClassName?: string;
  showGlyph?: boolean;
};

export function AddButton(props: AddButtonProps) {
  const {
    children = "Добавить",
    glyphClassName,
    showGlyph = true,
    variant = "micro",
    ...buttonProps
  } = props;

  return (
    <Button {...buttonProps} variant={variant}>
      {showGlyph ? (
        <span className={glyphClassName} aria-hidden="true">
          +
        </span>
      ) : null}
      {children}
    </Button>
  );
}
