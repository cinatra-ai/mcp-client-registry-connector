// Test-only host-module double: no product classes or variant recipes.
// Fixtures are excluded from the published package and the host program.
import * as React from "react";

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  variant?: string;
  size?: string;
};

export function Button({ asChild, variant: _variant, size: _size, children, ...props }: ButtonProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.ComponentProps<"button">>, props);
  }
  return <button data-slot="button" {...props}>{children}</button>;
}

export function Alert({ variant: _variant, ...props }: React.ComponentProps<"div"> & { variant?: string }) {
  return <div data-slot="alert" role="alert" {...props} />;
}

export function AlertDescription(props: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" {...props} />;
}
