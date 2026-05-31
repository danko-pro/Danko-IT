export type ServiceVisualIconName =
  | "appliance"
  | "brush"
  | "calendar"
  | "cabinet"
  | "check"
  | "clipboard"
  | "hardhat"
  | "layers"
  | "light"
  | "package"
  | "palette"
  | "paintRoller"
  | "plan"
  | "ruler"
  | "search"
  | "shieldCheck"
  | "shopping"
  | "stove"
  | "tool"
  | "truck"
  | "users"
  | "wardrobe";

const serviceVisualIcons: ServiceVisualIconName[][] = [
  ["plan", "palette", "light"],
  ["tool", "layers", "package"],
  ["tool", "paintRoller", "shieldCheck"],
  ["search", "shopping", "truck"],
  ["stove", "wardrobe", "appliance"],
  ["calendar", "hardhat", "shieldCheck"],
];

export function PublicServiceVisualIcon({ name }: { name: ServiceVisualIconName }) {
  const commonProps = {
    className: "public-service-visual-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
    focusable: false,
  } as const;

  switch (name) {
    case "appliance":
      return (
        <svg {...commonProps}>
          <rect x="6" y="4" width="12" height="16" rx="2.4" />
          <path d="M9 8h6M9 12h6M15 16h.01" />
        </svg>
      );
    case "brush":
      return (
        <svg {...commonProps}>
          <path d="M15.5 4.5l4 4-8.2 8.2-4.1 1.1 1.1-4.1 7.2-9.2Z" />
          <path d="M4 20c1.7-2 3.6-2.1 5.4-1.2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="15" rx="2.4" />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3M8 17h3" />
        </svg>
      );
    case "cabinet":
      return (
        <svg {...commonProps}>
          <rect x="5" y="4" width="14" height="16" rx="2.2" />
          <path d="M12 4v16M9 11h.01M15 11h.01" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <path d="M20 7 10 17l-5-5" />
          <path d="M18.2 12.6A6.6 6.6 0 1 1 15.7 7" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...commonProps}>
          <path d="M9 5h6l1 2h2v13H6V7h2l1-2Z" />
          <path d="M9 11h6M9 15h6" />
        </svg>
      );
    case "hardhat":
      return (
        <svg {...commonProps}>
          <path d="M4 15h16" />
          <path d="M6 15v-2a6 6 0 0 1 12 0v2" />
          <path d="M10 15V9M14 15V9M7 18h10" />
        </svg>
      );
    case "layers":
      return (
        <svg {...commonProps}>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </svg>
      );
    case "light":
      return (
        <svg {...commonProps}>
          <path d="M9 18h6M10 21h4" />
          <path d="M8 13a5 5 0 1 1 8 0c-.9.8-1.3 1.7-1.4 3H9.4C9.3 14.7 8.9 13.8 8 13Z" />
        </svg>
      );
    case "package":
      return (
        <svg {...commonProps}>
          <path d="m4 8 8-4 8 4v9l-8 4-8-4V8Z" />
          <path d="m4 8 8 4 8-4M12 12v9" />
        </svg>
      );
    case "palette":
      return (
        <svg {...commonProps}>
          <path d="M12 4a8 8 0 0 0 0 16h1.2a1.8 1.8 0 0 0 1.1-3.2 1.4 1.4 0 0 1 .9-2.5H17a3 3 0 0 0 3-3A7.3 7.3 0 0 0 12 4Z" />
          <path d="M8.5 10h.01M11 8h.01M14 8.5h.01" />
        </svg>
      );
    case "paintRoller":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="12" height="5" rx="1.4" />
          <path d="M16 7.5h2a2 2 0 0 1 2 2v.5a2 2 0 0 1-2 2h-6v4" />
          <path d="M10.5 16h3v5h-3v-5Z" />
        </svg>
      );
    case "plan":
      return (
        <svg {...commonProps}>
          <path d="M4 5h16v14H4V5Z" />
          <path d="M9 5v5h5V5M14 10h6M9 10v9" />
        </svg>
      );
    case "ruler":
      return (
        <svg {...commonProps}>
          <path d="M5 15 15 5l4 4L9 19l-4-4Z" />
          <path d="m9 15-1.5-1.5M12 12l-1.5-1.5M15 9l-1.5-1.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 5 5" />
          <path d="M8.5 10.5h4M10.5 8.5v4" />
        </svg>
      );
    case "shieldCheck":
      return (
        <svg {...commonProps}>
          <path d="M12 3 19 6v5.5c0 4.1-2.8 7.2-7 8.5-4.2-1.3-7-4.4-7-8.5V6l7-3Z" />
          <path d="m8.8 12 2.1 2.1 4.4-4.6" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...commonProps}>
          <path d="M6 8h14l-1.4 8H8L6 4H3" />
          <path d="M9 20h.01M17 20h.01" />
        </svg>
      );
    case "stove":
      return (
        <svg {...commonProps}>
          <rect x="5" y="4" width="14" height="16" rx="2.2" />
          <path d="M8 8h8" />
          <circle cx="9" cy="13" r="1.2" />
          <circle cx="15" cy="13" r="1.2" />
          <path d="M8 17h8" />
        </svg>
      );
    case "tool":
      return (
        <svg {...commonProps}>
          <path d="M14.5 5.5a4 4 0 0 0 4 4L10 18l-4 1 1-4 8.5-8.5Z" />
          <path d="m13 7 4 4" />
        </svg>
      );
    case "truck":
      return (
        <svg {...commonProps}>
          <path d="M3 7h11v9H3V7ZM14 10h3l4 4v2h-7v-6Z" />
          <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 11a2.7 2.7 0 1 0 0-5.4M17 15.5a4.4 4.4 0 0 1 3.5 4.3" />
        </svg>
      );
    case "wardrobe":
      return (
        <svg {...commonProps}>
          <rect x="5" y="4" width="14" height="16" rx="2.2" />
          <path d="M12 4v16M9 10h.01M15 10h.01M8 20v1M16 20v1" />
        </svg>
      );
    default:
      return null;
  }
}

export function getServiceVisualIcon(serviceIndex: number, itemIndex: number) {
  return serviceVisualIcons[serviceIndex]?.[itemIndex] ?? "check";
}
