import React, { useState, useRef, useEffect } from 'react';

interface EditableComboboxProps {
    name: string;
    defaultValue?: string;
    storageKey: string;
    defaultOptions: string[];
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export const EditableCombobox: React.FC<EditableComboboxProps> = ({
    name,
    defaultValue = '',
    storageKey,
    defaultOptions,
    placeholder,
    required,
    className,
}) => {
    const [options, setOptions] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : defaultOptions;
        } catch {
            return defaultOptions;
        }
    });
    const [inputValue, setInputValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(options));
    }, [options, storageKey]);

    // 點擊外部關閉
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setEditingIdx(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = options.filter(o =>
        o.toLowerCase().includes(inputValue.toLowerCase())
    );
    const canAdd = inputValue.trim() !== '' && !options.includes(inputValue.trim());

    const selectOption = (opt: string) => {
        setInputValue(opt);
        setIsOpen(false);
        setEditingIdx(null);
    };

    const addCurrentInput = () => {
        const v = inputValue.trim();
        if (v && !options.includes(v)) {
            setOptions(prev => [...prev, v]);
        }
        setIsOpen(false);
    };

    const deleteOption = (idx: number) => {
        setOptions(prev => prev.filter((_, i) => i !== idx));
    };

    const startEdit = (idx: number) => {
        setEditingIdx(idx);
        setEditingValue(options[idx]);
    };

    const saveEdit = (idx: number) => {
        const v = editingValue.trim();
        if (v) {
            setOptions(prev => {
                const next = [...prev];
                next[idx] = v;
                return next;
            });
            if (inputValue === options[idx]) setInputValue(v);
        }
        setEditingIdx(null);
    };

    return (
        <div ref={containerRef} className="relative">
            {/* hidden input 讓 form submit 可以讀到值 */}
            <input type="hidden" name={name} value={inputValue} required={required} />
            <input
                type="text"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filtered.length === 1) {
                            selectOption(filtered[0]);
                        } else if (canAdd) {
                            addCurrentInput();
                        }
                    }
                    if (e.key === 'Escape') setIsOpen(false);
                }}
                className={className ?? 'w-full p-2 border rounded-lg'}
                placeholder={placeholder}
                autoComplete="off"
            />
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {filtered.map((opt, i) => (
                        <div key={i} className="flex items-center group px-2 hover:bg-gray-50">
                            {editingIdx === i ? (
                                <div className="flex flex-1 items-center gap-1 py-1">
                                    <input
                                        autoFocus
                                        className="flex-1 border border-blue-300 rounded px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        onKeyDown={e => {
                                            e.stopPropagation();
                                            if (e.key === 'Enter') saveEdit(i);
                                            if (e.key === 'Escape') setEditingIdx(null);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => saveEdit(i)}
                                        className="text-green-600 hover:text-green-700 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-green-50"
                                    >✓</button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingIdx(null)}
                                        className="text-gray-400 hover:text-gray-600 text-xs px-1.5 py-0.5 rounded hover:bg-gray-100"
                                    >✕</button>
                                </div>
                            ) : (
                                <>
                                    <span
                                        className="flex-1 py-2 text-sm cursor-pointer"
                                        onClick={() => selectOption(opt)}
                                    >
                                        {opt}
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); startEdit(i); }}
                                            className="text-blue-400 hover:text-blue-600 text-xs px-1.5 py-1 rounded hover:bg-blue-50"
                                            title="編輯"
                                        >✏</button>
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); deleteOption(i); }}
                                            className="text-red-400 hover:text-red-600 text-xs px-1.5 py-1 rounded hover:bg-red-50"
                                            title="刪除"
                                        >✕</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {filtered.length === 0 && !canAdd && (
                        <div className="px-3 py-2 text-sm text-gray-400">找不到符合的選項</div>
                    )}
                    {canAdd && (
                        <div
                            className="px-3 py-2 text-sm text-blue-600 cursor-pointer hover:bg-blue-50 border-t border-gray-100 flex items-center gap-1.5"
                            onClick={addCurrentInput}
                        >
                            <span className="font-bold">＋</span>
                            <span>新增「<strong>{inputValue.trim()}</strong>」</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
