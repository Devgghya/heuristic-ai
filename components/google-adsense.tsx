"use client";

import Script from "next/script";

type Props = {
    pId: string;
};

export const GoogleAdsense = ({ pId }: Props) => {
    if (!pId) return null;

    // Ensure we handle both "pub-123..." and "123..." formats
    const cleanId = pId.replace("pub-", "");

    return (
        <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${cleanId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
    );
};
