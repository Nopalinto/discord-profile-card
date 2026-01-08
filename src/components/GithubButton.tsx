'use client';

import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';

export function GithubButton() {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        fetch('https://api.github.com/repos/naufalafif080419/discord-profile-card')
            .then((res) => res.json())
            .then((data) => {
                if (data.stargazers_count) {
                    setStars(data.stargazers_count);
                }
            })
            .catch((err) => console.error('Failed to fetch stars:', err));
    }, []);

    return (
        <a
            href="https://github.com/naufalafif080419/discord-profile-card"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg group"
        >
            <Github className="w-5 h-5" />
            <span className="font-medium">Star on GitHub</span>
            {stars !== null && (
                <span className="flex items-center gap-1 pl-2 ml-2 border-l border-white/20">
                    <span className="font-bold">{stars}</span>
                </span>
            )}
        </a>
    );
}
