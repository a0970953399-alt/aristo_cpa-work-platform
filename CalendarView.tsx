
import React, { useState } from 'react';
import { CalendarEvent, User } from '../types';

interface CalendarViewProps {
    currentMonth: Date;
    setCurrentMonth: (date: Date) => void;
    events: CalendarEvent[];
    currentUser: User;
    isSupervisor: boolean;
    onDayClick: (dateStr: string) => void;
    onEventClick: (e: React.MouseEvent, event: CalendarEvent) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
    currentMonth, setCurrentMonth, events, currentUser, isSupervisor, onDayClick, onEventClick 
}) => {
    const [hoveredCalendarDate, setHoveredCalendarDate] = useState<string | null>(null);

    const getCalendarDays = (year: number, month: number) => { 
        const firstDay = new Date(year, month, 1); 
        const lastDay = new Date(year, month + 1, 0); 
        const days = []; 
        const startPad = firstDay.getDay(); 
        for (let i = startPad; i > 0; i--) { const d = new Date(year, month, 1 - i); days.push({ date: d, isCurrentMonth: false }); } 
        for (let i = 1; i <= lastDay.getDate(); i++) { const d = new Date(year, month, i); days.push({ date: d, isCurrentMonth: true }); } 
        const remaining = 42 - days.length; 
        for (let i = 1; i <= remaining; i++) { const d = new Date(year, month + 1, i); days.push({ date: d, isCurrentMonth: false }); } 
        return days; 
    };

    const year = currentMonth.getFullYear(); 
    const month = currentMonth.getMonth(); 
    const days = getCalendarDays(year, month); 
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]; 

    return ( 
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col"> 
          <div className="p-6 border-b flex items-center justify-between bg-gray-50"> 
              <div className="flex items-center gap-6"> 
                  <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-3 hover:bg-gray-200 rounded-full text-gray-600 text-2xl">◀</button> 
                  <h2 className="text-2xl font-bold text-gray-800">{year}年 {monthNames[month]}</h2> 
                  <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-3 hover:bg-gray-200 rounded-full text-gray-600 text-2xl">▶</button> 
              </div> 
              <button onClick={() => setCurrentMonth(new Date())} className="text-base font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded">回到今天</button> 
          </div> 
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-gray-500 text-base font-bold uppercase text-center py-3"> 
              <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div> 
          </div> 
          <div className="flex-1 grid grid-cols-7 auto-rows-fr"> 
              {days.map((dayObj, idx) => { 
                  const dateStr = `${dayObj.date.getFullYear()}-${String(dayObj.date.getMonth() + 1).padStart(2, '0')}-${String(dayObj.date.getDate()).padStart(2, '0')}`; 
                  const isToday = dateStr === new Date().toISOString().split('T')[0]; 
                  const dayEvents = events.filter(e => { 
                      if (e.date !== dateStr) return false; 
                      if (e.type === 'shift') { if (isSupervisor) return true; return e.ownerId === currentUser.id; } 
                      else if (e.type === 'reminder') { return e.ownerId === currentUser.id; } 
                      return false; 
                  }); 
                  
                  const colIndex = idx % 7;
                  const rowIndex = Math.floor(idx / 7);
                  const dayOfWeek = dayObj.date.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  let tooltipClasses = "absolute z-50 w-64 bg-white p-3 rounded-lg shadow-xl border border-gray-200 pointer-events-none transition-opacity duration-200";
                  if (colIndex >= 4) { tooltipClasses += " right-0"; } else { tooltipClasses += " left-0"; }
                  if (rowIndex >= 3) { tooltipClasses += " bottom-full mb-2"; } else { tooltipClasses += " top-full mt-2"; }

                  return ( 
                      <div 
                          key={idx} 
                          onClick={() => onDayClick(dateStr)} 
                          onMouseEnter={() => setHoveredCalendarDate(dateStr)} 
                          onMouseLeave={() => setHoveredCalendarDate(null)} 
                          className={`relative border-b border-r min-h-[120px] p-2 flex flex-col gap-2 transition-colors hover:bg-gray-50 cursor-pointer group 
                              ${!dayObj.isCurrentMonth ? 'bg-gray-50 text-gray-400' : (isToday ? 'bg-blue-50' : (isWeekend ? 'bg-green-50' : 'bg-white'))}
                          `}
                      > 
                          <div className="flex justify-between items-start px-1">
                              <div className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold self-center px-1">+ 新增</div>
                              <div className={`text-base font-bold text-right ${isToday ? 'text-blue-600' : (isWeekend && dayObj.isCurrentMonth ? 'text-green-600' : '')}`}> {dayObj.date.getDate()} </div> 
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[140px] custom-scrollbar"> 
                              {dayEvents.map(ev => ( 
                                  <div key={ev.id} onClick={(e) => onEventClick(e, ev)} className={`text-xs px-2 py-1.5 rounded border truncate shadow-sm font-medium hover:brightness-95 transition-all ${ev.type === 'shift' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-yellow-100 border-yellow-200 text-yellow-800'}`}> 
                                      {ev.type === 'shift' && <span className="font-bold mr-1">[{ev.ownerName}]</span>} {ev.title} 
                                  </div> 
                              ))} 
                          </div>

                          {hoveredCalendarDate === dateStr && dayEvents.length > 0 && (
                              <div className={tooltipClasses}>
                                  <h4 className="text-gray-500 font-bold text-xs border-b border-gray-100 pb-2 mb-2 flex justify-between">
                                      <span>{dateStr}</span>
                                      <span>{dayEvents.length} 項活動</span>
                                  </h4>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                      {dayEvents.map(ev => (
                                          <div key={`tooltip-${ev.id}`} className={`p-2 rounded border text-left ${ev.type === 'shift' ? 'bg-blue-50 border-blue-100' : 'bg-yellow-50 border-yellow-100'}`}>
                                              <div className="text-xs font-bold mb-0.5 flex items-center gap-1">
                                                  <span className={`w-2 h-2 rounded-full ${ev.type === 'shift' ? 'bg-blue-500' : 'bg-yellow-500'}`}></span>
                                                  <span className={ev.type === 'shift' ? 'text-blue-700' : 'text-yellow-700'}>
                                                      {ev.type === 'shift' && `[${ev.ownerName}] `}{ev.title}
                                                  </span>
                                              </div>
                                              {ev.description && <div className="text-xs text-gray-500 pl-3 border-l-2 border-gray-200 ml-1 whitespace-pre-wrap">{ev.description}</div>}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div> 
                  ); 
              })} 
          </div> 
      </div> 
    ); 
};
