import { Employee } from './types';
import { periods } from './functions/src/payrollDomain';

export function taiwanToday(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isEmployeeResigned(employee: Employee, today = taiwanToday()): boolean {
  const started = periods(employee).filter(p => p.startDate <= today);
  return started.length > 0 && started.every(p => !!p.endDate && p.endDate < today);
}

export function insuranceLabel(basis: { hasLaborIns: boolean; hasHealthIns: boolean; insuranceBracket: number }): string {
  const types = [basis.hasLaborIns ? '勞' : '', basis.hasHealthIns ? '健' : ''].join('');
  return types ? basis.insuranceBracket.toLocaleString() + ' (' + types + ')' : '未投保';
}
