
import React, { useState } from 'react';
import { CalendarEvent, User } from './types';

const SHIFT_LABELS: Record<string, string> = {
    morning: '上午',
    afternoon: '下午',
    full_day: '整天',
    '上午': '上午',
    '下午': '下午',
    '整天': '整天',
    '09:30 - 12:00': '上午',
    '13:00 - 17:30': '下午',
    '09:30 - 17:30': '整天',
};

const SHIFT_BADGE_STYLES: Record<string, string> = {
    morning: 'bg-sky-100 text-sky-700 border-sky-200',
    afternoon: 'bg-amber-100 text-amber-700 border-amber-200',
    full_day: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    '上午': 'bg-sky-100 text-sky-700 border-sky-200',
    '下午': 'bg-amber-100 text-amber-700 border-amber-200',
    '整天': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    '09:30 - 12:00': 'bg-sky-100 text-sky-700 border-sky-200',
    '13:00 - 17:30': 'bg-amber-100 text-amber-700 border-amber-200',
    '09:30 - 17:30': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PERSON_COLORS = [
    { card: 'bg-rose-50 border-rose-200 text-rose-900', accent: 'bg-rose-600', chip: 'bg-rose-700 text-white' },
    { card: 'bg-violet-50 border-violet-200 text-violet-900', accent: 'bg-violet-600', chip: 'bg-violet-700 text-white' },
    { card: 'bg-cyan-50 border-cyan-200 text-cyan-900', accent: 'bg-cyan-600', chip: 'bg-cyan-700 text-white' },
    { card: 'bg-lime-50 border-lime-200 text-lime-900', accent: 'bg-lime-600', chip: 'bg-lime-700 text-white' },
    { card: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900', accent: 'bg-fuchsia-600', chip: 'bg-fuchsia-700 text-white' },
    { card: 'bg-orange-50 border-orange-200 text-orange-900', accent: 'bg-orange-600', chip: 'bg-orange-700 text-white' },
    { card: 'bg-indigo-50 border-indigo-200 text-indigo-900', accent: 'bg-indigo-600', chip: 'bg-indigo-700 text-white' },
    { card: 'bg-teal-50 border-teal-200 text-teal-900', accent: 'bg-teal-600', chip: 'bg-teal-700 text-white' },
];

const getShiftLabel = (event: CalendarEvent) => SHIFT_LABELS[event.title] || event.title;
const getShiftBadgeStyle = (event: CalendarEvent) => SHIFT_BADGE_STYLES[event.title] || 'bg-blue-100 text-blue-700 border-blue-200';
const getPersonStyle = (ownerId: string) => {
    const index = Array.from(ownerId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % PERSON_COLORS.length;
    return PERSON_COLORS[index];
};

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
        const targetCells = days.length <= 35 ? 35 : 42;
        const remaining = targetCells - days.length; 
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
                  const dayEvents = dayObj.isCurrentMonth ? events.filter(e => { 
                      if (e.date !== dateStr) return false; 
                      if (e.type === 'shift') { if (isSupervisor) return true; return e.ownerId === currentUser.id; } 
                      else if (e.type === 'reminder') { return e.ownerId === currentUser.id; } 
                      return false; 
                  }) : []; 
                  
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
                              {dayEvents.map(ev => { 
                                  const isShift = ev.type === 'shift';
                                  const personStyle = isShift ? getPersonStyle(ev.ownerId) : null;
                                  return (
                                      <div key={ev.id} onClick={(e) => onEventClick(e, ev)} className={`relative overflow-hidden text-xs rounded border shadow-sm font-medium hover:brightness-95 transition-all ${isShift && personStyle ? personStyle.card : 'bg-yellow-100 border-yellow-200 text-yellow-800'}`}> 
                                          {isShift ? (
                                              <span className="flex items-center gap-1.5 min-w-0 pl-2 pr-1.5 py-1.5">
                                                  <span className={`absolute left-0 top-0 h-full w-1 ${personStyle?.accent}`}></span>
                                                  <span className={`ml-1 rounded px-2 py-1 text-xs font-black leading-none shrink-0 shadow-sm ring-1 ring-black/10 ${personStyle?.chip}`}>{ev.ownerName}</span>
                                                  <span className={`rounded border px-1.5 py-0.5 text-[11px] font-black leading-none shrink-0 ${getShiftBadgeStyle(ev)}`}>{getShiftLabel(ev)}</span>
                                              </span>
                                          ) : <span className="block px-2 py-1.5 truncate">{ev.title}</span>}
                                      </div>
                                  );
                              })} 
                          </div>

                          {hoveredCalendarDate === dateStr && dayEvents.length > 0 && (
                              <div className={tooltipClasses}>
                                  <h4 className="text-gray-500 font-bold text-xs border-b border-gray-100 pb-2 mb-2 flex justify-between">
                                      <span>{dateStr}</span>
                                      <span>{dayEvents.length} 項活動</span>
                                  </h4>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                      {dayEvents.map(ev => {
                                          const personStyle = ev.type === 'shift' ? getPersonStyle(ev.ownerId) : null;
                                          return (
                                          <div key={`tooltip-${ev.id}`} className={`relative overflow-hidden p-2 rounded border text-left ${ev.type === 'shift' && personStyle ? personStyle.card : 'bg-yellow-50 border-yellow-100'}`}>
                                              {ev.type === 'shift' && <span className={`absolute left-0 top-0 h-full w-1 ${personStyle?.accent}`}></span>}
                                              <div className="text-xs font-bold mb-0.5 flex items-center gap-1">
                                                  {ev.type === 'shift' ? (
                                                      <>
                                                          <span className={`ml-1 rounded px-2 py-1 text-xs font-black leading-none shadow-sm ring-1 ring-black/10 ${personStyle?.chip}`}>{ev.ownerName}</span>
                                                          <span className={`rounded border px-1.5 py-0.5 text-[11px] font-black leading-none ${getShiftBadgeStyle(ev)}`}>{getShiftLabel(ev)}</span>
                                                      </>
                                                  ) : (
                                                      <>
                                                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                          <span className="text-yellow-700">{ev.title}</span>
                                                      </>
                                                  )}
                                              </div>
                                              {ev.description && <div className="text-xs text-gray-500 pl-3 border-l-2 border-gray-200 ml-1 whitespace-pre-wrap">{ev.description}</div>}
                                          </div>
                                      );
                                      })}
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
