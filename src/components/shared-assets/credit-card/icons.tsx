"use client";

import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

import type { CardBrandSlug } from "./card-brand";

export const PaypassIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" {...props}>
            <g clipPath="url(#clip0_1307_7682)">
                <path
                    d="M15.1429 1.28571C17.0236 4.54326 18.0138 8.23849 18.0138 12C18.0138 15.7615 17.0236 19.4567 15.1429 22.7143M10.4286 3.64285C11.8956 6.18374 12.6679 9.06602 12.6679 12C12.6679 14.934 11.8956 17.8162 10.4286 20.3571M5.92859 5.80713C6.98933 7.66394 7.54777 9.77022 7.54777 11.9143C7.54777 14.0583 6.98933 16.1646 5.92859 18.0214M1.42859 8.14285C2.19306 9.29983 2.59834 10.6362 2.59834 12C2.59834 13.3638 2.19306 14.7002 1.42859 15.8571"
                    stroke="currentColor"
                    strokeWidth="2.57143"
                    strokeLinecap="round"
                />
            </g>
            <defs>
                <clipPath id="clip0_1307_7682">
                    <rect width="20" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
};

export const MastercardIconWhite = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="30" height="19" viewBox="0 0 30 19" fill="none" {...props}>
            <path
                opacity="0.5"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C13.3266 17.7699 11.2787 18.5733 9.04092 18.5733C4.04776 18.5733 0 14.5737 0 9.63994C0 4.70619 4.04776 0.706604 9.04092 0.706604C11.2787 0.706604 13.3266 1.50993 14.9053 2.84066C16.484 1.50993 18.5319 0.706604 20.7697 0.706604C25.7629 0.706604 29.8106 4.70619 29.8106 9.63994C29.8106 14.5737 25.7629 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.7699 14.9053 16.4392Z"
                fill="white"
            />
            <path
                opacity="0.5"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C16.8492 14.8007 18.0818 12.3625 18.0818 9.63994C18.0818 6.91733 16.8492 4.47919 14.9053 2.84066C16.484 1.50993 18.5319 0.706604 20.7697 0.706604C25.7628 0.706604 29.8106 4.70619 29.8106 9.63994C29.8106 14.5737 25.7628 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.7699 14.9053 16.4392Z"
                fill="white"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C16.8492 14.8007 18.0818 12.3625 18.0818 9.63995C18.0818 6.91736 16.8492 4.47924 14.9053 2.8407C12.9614 4.47924 11.7288 6.91736 11.7288 9.63995C11.7288 12.3625 12.9614 14.8007 14.9053 16.4392Z"
                fill="white"
            />
        </svg>
    );
};

export const VisaMark = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 16" fill="none" aria-hidden {...props}>
        <path
            d="M20.2 1.2 17.4 14.8h-3.1L20.2 1.2Zm9.1 8.5c0-3.3-4.6-3.5-4.6-5 0-.5.4-1 1.4-1.1.5 0 1.7.1 2.5.7l.4-2c-.6-.2-1.6-.5-2.8-.5-3 0-5.1 1.6-5.1 3.8 0 1.7 1.5 2.6 2.6 3.2 1.2.6 1.6 1 1.6 1.5 0 .8-1 1.2-1.9 1.2-1.6 0-2.5-.4-3.2-.8l-.4 2.1c.8.4 2.2.7 3.7.7 3.1 0 5.2-1.5 5.2-3.9ZM39.5 1.2 37 14.8h-2.9l2.5-13.6h2.9ZM9.8 1.2 6.2 10.2 5.8 8 4.9 1.2H1.4L0 14.8h3.1l.7-4.5 1.2 4.5h1.8l3.5-13.6H9.8Zm30.2 0-2.3 13.6h-2.8l2.3-13.6h2.8Z"
            fill="currentColor"
        />
    </svg>
);

export const AmexMark = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 42 16" fill="none" aria-hidden {...props}>
        <path
            d="M2 1.5h7.8l1.2 2.6L12.2 1.5H20v13H2V1.5Zm2.2 2.2v8.6h2.4V7.4l2.5 4.9h2.8l2.5-4.9v5h2.4V3.7H13.6l-2.2 4.4-2.2-4.4H4.2Zm22.2 0h8.4c2.8 0 4.6 1.5 4.6 4.3 0 2.8-1.8 4.3-4.6 4.3h-8.4V3.7Zm2.2 2v4.6h5.8c1.4 0 2.2-.8 2.2-2.3s-.8-2.3-2.2-2.3h-5.8Z"
            fill="currentColor"
        />
    </svg>
);

export const DiscoverMark = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 56 16" fill="none" aria-hidden {...props}>
        <path
            d="M8.5 1.5c-3.6 0-6.5 2.6-6.5 6s2.9 6 6.5 6c1.8 0 3.4-.7 4.6-1.9v-2.4c-1 .9-2.2 1.4-3.5 1.4-2.5 0-4.5-1.9-4.5-4.1s2-4.1 4.5-4.1c1.3 0 2.5.5 3.5 1.4V3.4C11.9 2.2 10.3 1.5 8.5 1.5Zm12.2 0c-2.2 0-3.8 1.1-3.8 2.8 0 1.4.9 2.2 3 2.8l1.1.3c1 .3 1.3.5 1.3 1 0 .6-.6 1-1.6 1-1.1 0-2.1-.4-3-1.1l-1 2.2c1.2.8 2.6 1.2 4.1 1.2 2.5 0 4.2-1.2 4.2-3.1 0-1.5-1-2.3-3.2-2.9l-1.1-.3c-.9-.2-1.2-.5-1.2-.9 0-.5.5-.9 1.3-.9.9 0 1.8.3 2.6.9l1-2.1c-.9-.6-2.1-.9-3.4-.9Zm8.4 0-3.4 11.5h2.4l.6-2h3.5l.6 2h2.5L32.5 1.5h-3.4Zm-.3 2.2.9 3.2h-1.8l.9-3.2Zm9.1-2.2c-2.5 0-4.3 1.9-4.3 4.3s1.8 4.3 4.3 4.3c1.2 0 2.2-.4 3-1.1v-2.2c-.6.5-1.3.8-2.1.8-1.3 0-2.2-1-2.2-2.4s.9-2.4 2.2-2.4c.8 0 1.5.3 2.1.8V3.6c-.8-.7-1.8-1.1-3-1.1Zm8.2 0v11.5h2.3V9.4h3.5v3.6h2.3V1.5H48.8V5h-3.5V1.5h-2.3Z"
            fill="currentColor"
        />
    </svg>
);

export const GenericCardMark = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 16" fill="none" aria-hidden {...props}>
        <rect x="1" y="2" width="22" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 6h22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

export const MastercardIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="30" height="19" viewBox="0 0 30 19" fill="none" {...props}>
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C13.3266 17.77 11.2787 18.5733 9.04092 18.5733C4.04776 18.5733 0 14.5737 0 9.64C0 4.70625 4.04776 0.706665 9.04092 0.706665C11.2787 0.706665 13.3266 1.51 14.9053 2.84072C16.484 1.51 18.5319 0.706665 20.7697 0.706665C25.7629 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7629 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z"
                fill="#ED0006"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C16.8492 14.8007 18.0818 12.3626 18.0818 9.64C18.0818 6.91739 16.8492 4.47925 14.9053 2.84072C16.484 1.50999 18.5319 0.706665 20.7697 0.706665C25.7628 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7628 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z"
                fill="#F9A000"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C16.8492 14.8008 18.0818 12.3627 18.0818 9.64007C18.0818 6.91748 16.8492 4.47936 14.9053 2.84082C12.9614 4.47936 11.7288 6.91748 11.7288 9.64007C11.7288 12.3627 12.9614 14.8008 14.9053 16.4393Z"
                fill="#FF5E00"
            />
        </svg>
    );
};

interface CardBrandIconProps {
    brand: CardBrandSlug;
    variant?: "light" | "color";
    className?: string;
}

export function CardBrandIcon({ brand, variant = "light", className }: CardBrandIconProps) {
    const colorClass = variant === "light" ? "text-white" : "text-inherit";

    if (brand === "visa") {
        return <VisaMark className={cn("h-3.5 w-auto", colorClass, className)} />;
    }

    if (brand === "amex") {
        return <AmexMark className={cn("h-3 w-auto", colorClass, className)} />;
    }

    if (brand === "discover") {
        return <DiscoverMark className={cn("h-3 w-auto", colorClass, className)} />;
    }

    if (brand === "mastercard") {
        return variant === "color" ? (
            <MastercardIcon className={cn("h-[19px] w-auto", className)} />
        ) : (
            <MastercardIconWhite className={cn("h-[19px] w-auto", className)} />
        );
    }

    if (brand === "unknown") {
        return <GenericCardMark className={cn("h-3.5 w-auto", colorClass, className)} />;
    }

    return (
        <span
            className={cn(
                "text-[9px] font-bold uppercase tracking-wide",
                colorClass,
                className,
            )}
        >
            {brand}
        </span>
    );
}
