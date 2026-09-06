import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Shared Hugeicons renderer. Pass an icon object from @hugeicons/core-free-icons.
 */
export function Icon({ icon, size = 18, strokeWidth = 1.6, className, ...rest }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      {...rest}
    />
  );
}
