type CatalogEditorIconProps = {
  className?: string;
};

export function EditIcon({ className }: CatalogEditorIconProps) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="M4 14.6 4.6 11 12.4 3.2a2 2 0 0 1 2.8 0l1.6 1.6a2 2 0 0 1 0 2.8L9 15.4 4 16z" />
      <path d="m11.4 4.2 4.4 4.4" />
    </svg>
  );
}

export function PlusIcon({ className }: CatalogEditorIconProps) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  );
}

export function TrashIcon({ className }: CatalogEditorIconProps) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="M4 6h12" />
      <path d="M8 6V4h4v2" />
      <path d="M6 6l.7 10h6.6L14 6" />
      <path d="M9 9v4" />
      <path d="M11 9v4" />
    </svg>
  );
}
