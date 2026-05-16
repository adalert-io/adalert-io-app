"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  style,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(className)}
      style={
        {
          "--rdp-accent-color": "#3b82f6",
          "--rdp-accent-background-color": "rgb(59 130 246 / 0.12)",
          ...style,
        } as React.CSSProperties
      }
      classNames={classNames}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
