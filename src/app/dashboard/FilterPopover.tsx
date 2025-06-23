"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ALERT_SEVERITIES } from "@/lib/constants";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";

export interface FilterState {
  severity: string[];
  label: "Unarchive" | "Archive";
  timeRange: "All Time" | "Last 7 days" | "Last 30 days";
}

interface FilterPopoverProps {
  filterState: FilterState;
  onFilterChange: (newFilterState: Partial<FilterState>) => void;
  onClose: () => void;
}

export function FilterPopover({
  filterState,
  onFilterChange,
  onClose,
}: FilterPopoverProps) {
  const [openSections, setOpenSections] = useState({
    severity: true,
    label: true,
    timeRange: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSeverityChange = (severity: string, checked: boolean) => {
    const newSeverity = checked
      ? [...filterState.severity, severity]
      : filterState.severity.filter((s) => s !== severity);
    onFilterChange({ severity: newSeverity });
  };

  const handleLabelChange = (label: "Unarchive" | "Archive") => {
    onFilterChange({ label });
  };

  const handleTimeRangeChange = (
    timeRange: "All Time" | "Last 7 days" | "Last 30 days"
  ) => {
    onFilterChange({ timeRange });
  };

  return (
    <div className="w-64 bg-white p-4 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Filter</h3>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Severity */}
        <div>
          <div
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => toggleSection("severity")}
          >
            <h4 className="font-semibold">Severity</h4>
            {openSections.severity ? (
              <ChevronUp className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            )}
          </div>
          {openSections.severity && (
            <div className="space-y-2">
              {(
                Object.keys(ALERT_SEVERITIES) as Array<
                  keyof typeof ALERT_SEVERITIES
                >
              ).map((key) => {
                const severity = ALERT_SEVERITIES[key];
                return (
                  <div key={severity} className="flex items-center gap-2">
                    <Checkbox
                      id={`sev-${severity}`}
                      checked={filterState.severity.includes(severity)}
                      onCheckedChange={(checked) =>
                        handleSeverityChange(severity, !!checked)
                      }
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor={`sev-${severity}`}>{severity}</Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Label */}
        <div>
          <div
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => toggleSection("label")}
          >
            <h4 className="font-semibold">Label</h4>
            {openSections.label ? (
              <ChevronUp className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            )}
          </div>
          {openSections.label && (
            <RadioGroup
              value={filterState.label}
              onValueChange={handleLabelChange}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Unarchive" id="label-unarchive" />
                <Label htmlFor="label-unarchive">Unarchive</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Archive" id="label-archive" />
                <Label htmlFor="label-archive">Archive</Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {/* Time Range */}
        <div>
          <div
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => toggleSection("timeRange")}
          >
            <h4 className="font-semibold">Time Range</h4>
            {openSections.timeRange ? (
              <ChevronUp className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            )}
          </div>
          {openSections.timeRange && (
            <RadioGroup
              value={filterState.timeRange}
              onValueChange={handleTimeRangeChange}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="All Time" id="time-all" />
                <Label htmlFor="time-all">All Time</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Last 7 days" id="time-7" />
                <Label htmlFor="time-7">Last 7 days</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Last 30 days" id="time-30" />
                <Label htmlFor="time-30">Last 30 days</Label>
              </div>
            </RadioGroup>
          )}
        </div>
      </div>
    </div>
  );
} 