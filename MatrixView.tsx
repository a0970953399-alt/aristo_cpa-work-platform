
import React from 'react';
import { Client, ClientTask, TabCategory, User } from './types';
import { COLUMN_CONFIG, ACCOUNTING_SUB_ITEMS, TAX_SUB_ITEMS } from './constants';
import { SearchIcon, NoteIcon } from './Icons';

interface MatrixViewProps {
    tasks: ClientTask[];
    activeTab: TabCategory;
    currentYear: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    collapsedColumns: Set<string>;
    toggleColumn: (col: string) => void;
    toggleAllColumns: () => void;
    users: User[];
    onCellClick: (client: Client, column: string, task?: ClientTask) => void;
    onClientNameClick: (client: Client) => void;
    clients: Client[]; // Added prop
}

export const MatrixView: React.FC<MatrixViewProps> = ({ 
    tasks, activeTab, currentYear, searchQuery, setSearchQuery, 
    collapsedColumns, toggleColumn, toggleAllColumns, users, onCellClick, onClientNameClick, clients
}) => {

    const columns = COLUMN_CONFIG[activeTab] || [];
    let subItems: string[] = [];
    if (activeTab === TabCategory.ACCOUNTING) subItems = ACCOUNTING_SUB_ITEMS;
    else if (activeTab === TabCategory.TAX) subItems = TAX_SUB_ITEMS;
    const hasSubItems = subItems.length > 0;
    const allExpanded = columns.every(col => !collapsedColumns.has(col));

    const filteredClients = React.useMemo(() => { 
        if (!searchQuery) return clients; 
        const lowerQuery = searchQuery.toLowerCase(); 
        return clients.filter(c => c.name.toLowerCase().includes(lowerQuery) || c.code.toLowerCase().includes(lowerQuery)); 
    }, [searchQuery, clients]);

    const getTaskForCell = (clientId: string, column: string) => tasks.find(t => !t.isMisc && t.clientId === clientId && t.category === activeTab && t.workItem === column && t.year === currentYear);

    const isStale = (task: ClientTask) => { 
        if (task.status !== 'in_progress') return false; 
        const lastUpdate = new Date(task.lastUpdatedAt).getTime(); 
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000; 
        return (Date.now() - lastUpdate) > threeDaysMs; 
    };

const renderCell = (client: Client, col: string, task?: ClientTask) => {
        let content = null;
        // 1. 預設背景是 "白色" (代表未派案/空)
        let cellClass = "cursor-pointer hover:bg-gray-100 transition-colors border-r text-center p-1 h-14 relative"; 
        let bgClass = "bg-white"; // 預設白色

        if (task) {
            if (task.isNA) {
                content = <span className="text-gray-300 text-base">N/A</span>;
                bgClass = "bg-gray-50"; // N/A 用灰色
            } else if (task.status === 'done') {
                content = <span className="font-bold text-green-700 text-sm">{task.completionDate || '已完成'}</span>;
                bgClass = "bg-green-50"; // 已完成用綠色
            } else {
                // 顯示負責人標籤
                if (task.assigneeName) {
                    content = <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 shadow-sm">{task.assigneeName}</span>;
                }
                
                if (task.status === 'in_progress') {
                    // 進行中 -> 藍色
                    bgClass = "bg-blue-50"; 
                    if (isStale(task)) {
                         bgClass = "bg-red-50"; // 逾期仍然維持紅色警示
                         content = <div className="relative inline-block">{content}<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span></div>;
                    }
                } else {
                    // 狀態是 Todo (未開始)
                    if (task.assigneeId) {
                        // 2. 已派案 (有人) 但未開始 -> 黃色
                        bgClass = "bg-yellow-50";
                    } else {
                        // 雖然有任務物件但沒人 (罕見情況) -> 視為未派案 (白色)
                        bgClass = "bg-white";
                    }
                }
            }
            if (task.note) {
                 content = <div className="relative w-full h-full flex items-center justify-center">{content}<div className="absolute top-0.5 right-0.5"><NoteIcon /></div></div>;
            }
        } else {
            // 3. 完全沒任務 -> 白色
            bgClass = "bg-white";
        }
  
        // 組合樣式
        cellClass += ` ${bgClass}`;

        return (
            <td key={`${client.id}-${col}`} className={cellClass} onClick={() => onCellClick(client, col, task)}>
                {content}
            </td>
        );
    };

    return (
        <div className="h-full w-full overflow-auto bg-white shadow-sm border border-gray-200 rounded-lg relative custom-scrollbar">
            <table className="min-w-full border-collapse relative">
                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th rowSpan={hasSubItems ? 2 : 1} className="sticky left-0 top-0 z-30 bg-gray-50 p-3 text-left text-base font-bold text-gray-500 border-b border-r w-[220px] min-w-[220px] max-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-2 pr-6">
                                <SearchIcon className="w-5 h-5" />
                                <input 
                                    type="text" 
                                    placeholder="搜尋客戶..." 
                                    className="bg-transparent outline-none w-full text-base"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {hasSubItems && <button type="button" onClick={toggleAllColumns} title={allExpanded ? '收合全部月份' : '展開全部月份'} aria-label={allExpanded ? '收合全部月份' : '展開全部月份'} aria-expanded={allExpanded} className="absolute bottom-1 right-1 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded">
                                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d={allExpanded ? 'M 2 2 L 14 2 L 2 14 Z' : 'M 14 14 L 2 14 L 14 2 Z'} /></svg>
                            </button>}
                        </th>
                        {columns.map(col => (
                            <th 
                                key={col} 
                                colSpan={hasSubItems && !collapsedColumns.has(col) ? subItems.length : 1} 
                                className={`p-3 text-center text-lg font-bold text-gray-700 border-b border-r whitespace-nowrap min-w-[120px] ${hasSubItems ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                onClick={hasSubItems ? () => toggleColumn(col) : undefined}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    {col}
                                </div>
                            </th>
                        ))}
                    </tr>
                    {hasSubItems && (
                        <tr>
                            {columns.map(col => {
                                if (collapsedColumns.has(col)) {
                                    return <th key={`${col}-summary`} className="p-2 text-center text-sm text-gray-400 border-b border-r bg-gray-50 sticky top-[52px] z-20">進度</th>;
                                }
                                return subItems.map(sub => (
                                    <th key={`${col}-${sub}`} className="p-2 text-center text-sm text-gray-500 border-b border-r bg-gray-50 min-w-[80px] whitespace-nowrap sticky top-[52px] z-20">
                                        {sub}
                                    </th>
                                ));
                            })}
                        </tr>
                    )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {filteredClients.map(client => (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 p-3 border-r text-lg font-bold text-gray-700 whitespace-nowrap w-[220px] min-w-[220px] max-w-[220px] truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <button onClick={() => onClientNameClick(client)} className="hover:text-blue-600 hover:underline text-left w-full truncate">
                                    {client.code} {client.name}
                                </button>
                            </td>
                            {columns.map(col => {
                                if (hasSubItems) {
                                    if (collapsedColumns.has(col)) {
                                        const groupTasks = subItems.map(s => getTaskForCell(client.id, `${col}-${s}`));
                                        const total = subItems.length;
                                        // 🔴 修改 5: 加強判斷，確保只有真正完成的才算 done
                                        const done = groupTasks.filter(t => t && (t.status === 'done' || t.isNA)).length;
                                        const percent = Math.round((done / total) * 100);
                                        const isAllDone = done === total;
                                        
                                        // 讓折疊後的格子顏色也跟著邏輯變
                                        let summaryClass = '';
                                        
                                        if (isAllDone) {
                                            // 全部完成 -> 綠色
                                            summaryClass = 'bg-green-100 text-green-700';
                                        } else if (percent > 0) {
                                            // 部分完成 -> 藍色
                                            summaryClass = 'bg-blue-100 text-blue-700';
                                        } else {
                                            // 0% (未開始) -> 改成 "灰色" (原本是黃色)
                                            summaryClass = 'bg-gray-100 text-gray-500'; 
                                        }

                                        return (
                                            <td key={`${client.id}-${col}-summary`} className="p-3 border-r text-center align-middle" onClick={() => toggleColumn(col)}>
                                                <div className={`text-sm font-bold px-2 py-1 rounded cursor-pointer ${summaryClass}`}>
                                                    {percent}%
                                                </div>
                                            </td>
                                        );
                                    }
                                    
                                    return subItems.map(sub => {
                                        const fullColName = `${col}-${sub}`;
                                        const task = getTaskForCell(client.id, fullColName);
                                        return renderCell(client, fullColName, task);
                                    });
                                } else {
                                    const task = getTaskForCell(client.id, col);
                                    return renderCell(client, col, task);
                                }
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
