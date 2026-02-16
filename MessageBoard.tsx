// src/MessageBoard.tsx

import React, { useState } from 'react';
import { User, Message, MessageCategory, UserRole } from './types';
import { TaskService } from './taskService';
import { TrashIcon, UserGroupIcon, LightningIcon, ChatBubbleIcon } from './Icons'; // 確保 Icons 有這些

interface MessageBoardProps {
    currentUser: User;
    messages: Message[];
    onUpdate: () => void;
    onClose: () => void;
}

export const MessageBoard: React.FC<MessageBoardProps> = ({ currentUser, messages, onUpdate, onClose }) => {
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<MessageCategory>('chat');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 留言送出
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        const newMessage: Message = {
            id: Date.now().toString(),
            content: content,
            category: category,
            authorId: currentUser.id,
            authorName: currentUser.name,
            createdAt: new Date().toISOString()
        };
        await TaskService.addMessage(newMessage);
        setContent('');
        onUpdate();
        setIsSubmitting(false);
    };

    // 刪除留言
    const handleDelete = async (id: string) => {
        if (confirm('確定要刪除這則留言嗎？')) {
            await TaskService.deleteMessage(id);
            onUpdate();
        }
    };

    // 排序：新的在上面
    const sortedMessages = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // 取得類別的顯示設定 (名稱、顏色、圖示、是否匿名)
    const getCategoryConfig = (cat: MessageCategory) => {
        switch (cat) {
            case 'announcement':
                return { label: '公告', color: 'bg-red-100 text-red-800 border-red-200', icon: '📢', isAnonymous: false };
            case 'bug':
                return { label: '系統 BUG', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🐛', isAnonymous: true };
            case 'chat':
                return { label: '閒聊', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: '💬', isAnonymous: true };
            default:
                return { label: '其他', color: 'bg-gray-100', icon: '📝', isAnonymous: true };
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        💬 事務所留言板
                        <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded border">暢所欲言區</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                </div>

                {/* 留言列表區 (可捲動) */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50 space-y-4">
                    {sortedMessages.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">目前還沒有留言，來搶頭香吧！</div>
                    ) : (
                        sortedMessages.map(msg => {
                            const config = getCategoryConfig(msg.category);
                            // 權限判斷：主管可以刪除所有留言，自己可以刪除自己的留言
                            const canDelete = currentUser.role === UserRole.SUPERVISOR || currentUser.id === msg.authorId;
                            
                            return (
                                <div key={msg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${config.color}`}>
                                                <span>{config.icon}</span> {config.label}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {canDelete && (
                                            <button onClick={() => handleDelete(msg.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed pl-1">{msg.content}</p>
                                    
                                    <div className="mt-3 flex items-center justify-end">
                                        {/* ✨ 這裡就是你要的匿名邏輯！ */}
                                        <span className={`text-xs font-bold flex items-center gap-1 ${config.isAnonymous ? 'text-gray-400' : 'text-blue-600'}`}>
                                            {config.isAnonymous ? (
                                                <>👺 某位同事</> 
                                            ) : (
                                                <>😎 {msg.authorName}</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 輸入區 (Footer) */}
                <form onSubmit={handleSubmit} className="p-4 border-t bg-white rounded-b-2xl">
                    <div className="flex gap-2 mb-2">
                        {/* 類別選擇按鈕 */}
                        {(['chat', 'bug', 'announcement'] as MessageCategory[]).map(cat => {
                            const conf = getCategoryConfig(cat);
                            const isActive = category === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex justify-center items-center gap-1 ${
                                        isActive 
                                        ? 'bg-gray-800 text-white border-gray-800 shadow-md transform scale-105' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{conf.icon}</span> {conf.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={category === 'announcement' ? "輸入公告內容..." : category === 'bug' ? "發現什麼 BUG？請告訴我們..." : "想聊什麼？(匿名)"}
                            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 border rounded-xl px-4 py-3 outline-none transition-colors"
                        />
                        <button 
                            type="submit" 
                            disabled={!content.trim() || isSubmitting}
                            className="bg-blue-600 text-white px-6 rounded-xl font-bold shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            送出
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
