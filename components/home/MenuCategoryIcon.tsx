import type { ReactNode } from "react";

type MenuCategoryIconId =
  | "main-meals"
  | "burgers"
  | "pizza"
  | "fried-chicken"
  | "kebabs"
  | "pakistani"
  | "indian"
  | "turkish"
  | "middle-eastern"
  | "chinese"
  | "desserts"
  | "drinks"
  | "vegetarian"
  | "family-meals"
  | "meal-deals";

export type MenuHighlight = {
  label: string;
  icon: MenuCategoryIconId;
};

export const MENU_HIGHLIGHTS: MenuHighlight[] = [
  { label: "Main meals", icon: "main-meals" },
  { label: "Burgers", icon: "burgers" },
  { label: "Pizza", icon: "pizza" },
  { label: "Fried chicken", icon: "fried-chicken" },
  { label: "Kebabs", icon: "kebabs" },
  { label: "Pakistani cuisine", icon: "pakistani" },
  { label: "Indian cuisine", icon: "indian" },
  { label: "Turkish cuisine", icon: "turkish" },
  { label: "Middle Eastern food", icon: "middle-eastern" },
  { label: "Chinese dishes", icon: "chinese" },
  { label: "Desserts", icon: "desserts" },
  { label: "Drinks", icon: "drinks" },
  { label: "Vegetarian options", icon: "vegetarian" },
  { label: "Family meals", icon: "family-meals" },
  { label: "Meal deals", icon: "meal-deals" },
];

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function MenuCategoryIcon({ id }: { id: MenuCategoryIconId }) {
  switch (id) {
    case "main-meals":
      return (
        <IconBase>
          <path d="M4 10h16M6 10V7a2 2 0 012-2h8a2 2 0 012 2v3M8 14h8M10 18h4" />
          <circle cx="12" cy="14" r="4" />
        </IconBase>
      );
    case "burgers":
      return (
        <IconBase>
          <path d="M5 11h14M5 14h14M7 8h10M6 17h12" />
          <path d="M8 11V9M12 11V8M16 11V9" />
        </IconBase>
      );
    case "pizza":
      return (
        <IconBase>
          <path d="M12 3L4 19h16L12 3z" />
          <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
        </IconBase>
      );
    case "fried-chicken":
      return (
        <IconBase>
          <path d="M8 20c0-4 1.5-7 4-9s4-5 4-9" />
          <path d="M12 11c2 1.5 3 3.5 3 6" />
          <path d="M9 14c-1 2-1.5 4-1 6" />
        </IconBase>
      );
    case "kebabs":
      return (
        <IconBase>
          <path d="M5 6l14 12M7 4l2 2M11 4l2 2M15 4l2 2" />
          <ellipse cx="12" cy="12" rx="2" ry="1.5" transform="rotate(-40 12 12)" />
          <ellipse cx="15" cy="15" rx="2" ry="1.5" transform="rotate(-40 15 15)" />
        </IconBase>
      );
    case "pakistani":
      return (
        <IconBase>
          <path d="M12 4c-3 2-5 5-5 8a5 5 0 0010 0c0-3-2-6-5-8z" />
          <path d="M9 12h6M10 15h4" />
        </IconBase>
      );
    case "indian":
      return (
        <IconBase>
          <path d="M6 18c0-6 3-10 6-12 3 2 6 6 6 12H6z" />
          <path d="M8 14h8M9 11h6" />
          <path d="M12 6v2" />
        </IconBase>
      );
    case "turkish":
      return (
        <IconBase>
          <path d="M6 8h12l-2 8H8l-2-8z" />
          <path d="M8 8V6a4 4 0 018 0v2" />
          <path d="M10 12h4" />
        </IconBase>
      );
    case "middle-eastern":
      return (
        <IconBase>
          <path d="M5 14h14l-2 6H7l-2-6z" />
          <path d="M8 14V10a4 4 0 018 0v4" />
          <path d="M12 10V8" />
        </IconBase>
      );
    case "chinese":
      return (
        <IconBase>
          <path d="M6 8h12M6 8c0 6 2.5 10 6 10s6-4 6-10" />
          <path d="M9 5l-1 3M15 5l1 3" />
        </IconBase>
      );
    case "desserts":
      return (
        <IconBase>
          <path d="M6 18h12l-1-4H7l-1 4z" />
          <path d="M8 14c0-3 1.5-5 4-5s4 2 4 5" />
          <path d="M12 9V6" />
        </IconBase>
      );
    case "drinks":
      return (
        <IconBase>
          <path d="M8 4h8l-1 14H9L8 4z" />
          <path d="M10 8h4" />
          <path d="M9 18h6" />
        </IconBase>
      );
    case "vegetarian":
      return (
        <IconBase>
          <path d="M12 20c-4-3-6-7-6-11a6 6 0 0112 0c0 4-2 8-6 11z" />
          <path d="M12 9v11" />
        </IconBase>
      );
    case "family-meals":
      return (
        <IconBase>
          <circle cx="9" cy="8" r="2" />
          <circle cx="15" cy="8" r="2" />
          <path d="M6 18c0-2.5 1.5-4 3-4s3 1.5 3 4M12 18c0-2.5 1.5-4 3-4s3 1.5 3 4" />
        </IconBase>
      );
    case "meal-deals":
      return (
        <IconBase>
          <path d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
          <path d="M4 8l2-4h12l2 4" />
          <path d="M9 13h6" />
        </IconBase>
      );
  }
}
