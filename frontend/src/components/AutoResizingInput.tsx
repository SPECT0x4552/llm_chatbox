import React, { useEffect, useRef } from 'react';

const AutoResizingTextarea = ({
    value,
    onChange,
    onKeyDown,
    disabled,
    placeholder
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled: boolean;
    placeholder: string;
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to allow proper calculation
        textarea.style.height = 'auto';

        // Calculate the new height (with min and max constraints)
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);

        // Set the new height with smooth transition
        textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <div className="relative flex-1">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    adjustHeight();
                }}
                onKeyDown={onKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full bg-gray-700/50 rounded-lg px-4 py-3 text-base placeholder-gray-400 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none 
                 min-h-[48px] max-h-[200px] transition-all duration-200
                 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent
                 leading-relaxed"
                style={{
                    overflowY: 'auto',
                    overscrollBehavior: 'contain'
                }}
            />
        </div>
    );
};

export default AutoResizingTextarea;