import React from 'react';

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200 shadow-md",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 shadow-md",
        dark: "bg-slate-800 text-white hover:bg-slate-900"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
