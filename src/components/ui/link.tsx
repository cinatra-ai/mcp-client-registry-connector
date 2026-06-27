import * as React from "react"

import { cn } from "../../lib/utils"

// shadcn-style anchor primitive. Lives under components/ui (the vendored
// primitive surface) so the raw <a> it renders is the single sanctioned
// place an anchor exists, exactly like button.tsx is the only place a raw
// <button> exists. Consumers use the documented shadcn link pattern:
//
//   <Button asChild variant="link"><Link href="…">…</Link></Button>
//
// This keeps Block B (raw-JSX) enforceable at `error` everywhere outside
// components/ui while preserving real anchor navigation.
function Link({
  className,
  ...props
}: React.ComponentProps<"a">) {
  return <a data-slot="link" className={cn(className)} {...props} />
}

export { Link }
