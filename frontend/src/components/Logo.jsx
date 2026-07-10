const Logo = ({ className = "h-8" }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Icon SVG */}
            <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-auto drop-shadow-md"
            >
                {/* Ticket: Pure White */}
                <rect x="4" y="8" width="40" height="32" rx="8" fill="#ffffff" />

                {/* Cutouts & Play Button: Transparent/Red (Update this hex code if your primary red is different!) */}
                <circle cx="4" cy="24" r="4" fill="#ef4444" />
                <circle cx="44" cy="24" r="4" fill="#ef4444" />
                <path
                    d="M31.5 22.268C32.8333 23.0378 32.8333 24.9622 31.5 25.732L21 31.7942C19.6667 32.564 18 31.6018 18 30.0622L18 17.9378C18 16.3982 19.6667 15.436 21 16.2058L31.5 22.268Z"
                    fill="#ef4444"
                />
            </svg>

            {/* Typography */}
            <span className="text-2xl font-black tracking-tighter text-white drop-shadow-sm">
                Cine<span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">Flix</span>
            </span>
        </div>
    );
};

export default Logo;