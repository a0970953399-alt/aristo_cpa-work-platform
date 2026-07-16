import type { CSSProperties } from 'react';
import { UserRole } from './types';
import type { User } from './types';

const LEGACY_SHIFT_HUES = [346, 270, 190, 82, 315, 25, 235, 170];
const HUE_PRECISION = 10;
const HUE_CANDIDATE_COUNT = 360 * HUE_PRECISION;

const normalizeHue = (value: unknown): number | null => {
    const hue = Number(value);
    if (!Number.isFinite(hue)) return null;
    const normalized = ((hue % 360) + 360) % 360;
    return Math.round(normalized * HUE_PRECISION) / HUE_PRECISION;
};

const hueKey = (hue: number): string => hue.toFixed(1);

const circularHueDistance = (a: number, b: number): number => {
    const distance = Math.abs(a - b);
    return Math.min(distance, 360 - distance);
};

export const getLegacyShiftHue = (userId: string): number => {
    const index = Array.from(String(userId)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % LEGACY_SHIFT_HUES.length;
    return LEGACY_SHIFT_HUES[index];
};

const findMostDistinctHue = (usedHues: number[]): number => {
    if (usedHues.length === 0) return LEGACY_SHIFT_HUES[0];

    let bestHue = 0;
    let bestDistance = -1;

    for (let candidateIndex = 0; candidateIndex < HUE_CANDIDATE_COUNT; candidateIndex++) {
        const candidate = candidateIndex / HUE_PRECISION;
        const minimumDistance = Math.min(...usedHues.map(usedHue => circularHueDistance(candidate, usedHue)));
        if (minimumDistance > bestDistance) {
            bestHue = candidate;
            bestDistance = minimumDistance;
        }
    }

    return bestHue;
};

export const assignUniqueInternShiftColors = (users: User[]): User[] => {
    const reservedHues = new Map<string, number>();
    const usedHueKeys = new Set<string>();

    users.forEach(user => {
        if (user.role !== UserRole.INTERN) return;
        const storedHue = normalizeHue(user.shiftColorHue);
        if (storedHue === null || usedHueKeys.has(hueKey(storedHue))) return;
        reservedHues.set(String(user.id), storedHue);
        usedHueKeys.add(hueKey(storedHue));
    });

    const assignedHues = Array.from(reservedHues.values());

    return users.map(user => {
        if (user.role !== UserRole.INTERN) return user;

        const reservedHue = reservedHues.get(String(user.id));
        if (reservedHue !== undefined) {
            return user.shiftColorHue === reservedHue ? user : { ...user, shiftColorHue: reservedHue };
        }

        const preferredHue = getLegacyShiftHue(String(user.id));
        const assignedHue = !usedHueKeys.has(hueKey(preferredHue))
            ? preferredHue
            : findMostDistinctHue(assignedHues);

        usedHueKeys.add(hueKey(assignedHue));
        assignedHues.push(assignedHue);
        return { ...user, shiftColorHue: assignedHue };
    });
};

export const getShiftColorStyles = (hue: number): {
    card: CSSProperties;
    accent: CSSProperties;
    chip: CSSProperties;
} => {
    const normalizedHue = normalizeHue(hue) ?? LEGACY_SHIFT_HUES[0];

    return {
        card: {
            backgroundColor: `hsl(${normalizedHue} 78% 97%)`,
            borderColor: `hsl(${normalizedHue} 55% 78%)`,
            color: `hsl(${normalizedHue} 52% 24%)`,
        },
        accent: {
            backgroundColor: `hsl(${normalizedHue} 68% 43%)`,
        },
        chip: {
            backgroundColor: `hsl(${normalizedHue} 68% 32%)`,
            color: '#ffffff',
        },
    };
};
