import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border",
        info:
          "border-info/40 bg-info-light text-info-dark dark:border-info/60 dark:bg-info-dark/20 dark:text-blue-200 [&>svg]:text-info dark:[&>svg]:text-blue-300",
        success:
          "border-success/40 bg-success-light text-success-dark dark:border-success/60 dark:bg-success-dark/20 dark:text-green-200 [&>svg]:text-success dark:[&>svg]:text-green-300",
        warning:
          "border-warning/40 bg-warning-light text-warning-dark dark:border-warning/60 dark:bg-warning-dark/20 dark:text-amber-200 [&>svg]:text-warning dark:[&>svg]:text-amber-300",
        destructive:
          "border-danger/40 bg-danger-light text-danger-dark dark:border-danger/60 dark:bg-danger-dark/20 dark:text-red-200 [&>svg]:text-danger dark:[&>svg]:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
