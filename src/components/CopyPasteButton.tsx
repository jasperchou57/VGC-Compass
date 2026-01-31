'use client';

import { useState } from 'react';

interface CopyPasteButtonProps {
    paste: string;
}

export default function CopyPasteButton({ paste }: CopyPasteButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(paste);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
        >
            {copied ? '✓ Copied!' : '📋 Copy to Showdown'}
        </button>
    );
}
