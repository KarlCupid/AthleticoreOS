import React from 'react';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface IconProps {
    color?: string;
    size?: number;
    strokeWidth?: number;
    style?: any;
    focused?: boolean;
}

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 1.5; // Thin, sleek modern styling

export const IconBarChart = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={size} color={color} style={style} />
);

export const IconAddCircle = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="8" x2="12" y2="16" />
        <Line x1="8" y1="12" x2="16" y2="12" />
    </Svg>
);

export const IconPerson = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} style={style} />
);

export const IconShieldCheck = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <Polyline points="9 12 11 14 15 10" />
    </Svg>
);

export const IconWaterDrop = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </Svg>
);

// Custom Athleticore Icon for Fuel / Nutrition
export const IconRestaurant = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M12 2L20.66 7v10L12 22 3.34 17V7z" />
        <Circle cx="12" cy="12" r="3" />
        <Line x1="12" y1="2" x2="12" y2="9" />
        <Line x1="20.66" y1="17" x2="14.5" y2="13.5" />
        <Line x1="3.34" y1="17" x2="9.5" y2="13.5" />
    </Svg>
);

export const IconCheckCircle = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
);

export const IconCircleOutline = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Circle cx="12" cy="12" r="10" />
    </Svg>
);

// Custom Athleticore Icon for Train / Fire
export const IconFire = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M12 2C12 2 17 8 17 13A5 5 0 0 1 7 13C7 8 12 2 12 2Z" />
        <Path d="M12 10C12 10 14.5 13 14.5 15.5A2.5 2.5 0 0 1 9.5 15.5C9.5 13 12 10 12 10Z" />
    </Svg>
);

export const IconLightning = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
);

// Custom Athleticore Icon for Check-In / Activity Target
export const IconActivity = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Line x1="4" y1="12" x2="20" y2="12" />
        <Path d="M4 8v8 M20 8v8" />
        <Path d="M7 6v12 M17 6v12" />
        <Circle cx="12" cy="12" r="2.5" fill={color} />
    </Svg>
);

export const IconChevronRight = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Polyline points="9 18 15 12 9 6" />
    </Svg>
);

export const IconChevronLeft = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Polyline points="15 18 9 12 15 6" />
    </Svg>
);

export const IconSettings = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Circle cx="12" cy="12" r="3" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
);

export const IconTrendUp = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <Polyline points="17 6 23 6 23 12" />
    </Svg>
);

export const IconTrendDown = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <Polyline points="17 18 23 18 23 12" />
    </Svg>
);

// Custom Athleticore Icon for Calendar / Setup
export const IconCalendar = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
        <Line x1="3" y1="10" x2="21" y2="10" />
        <Line x1="8" y1="2" x2="8" y2="6" />
        <Line x1="16" y1="2" x2="16" y2="6" />
        <Path d="M7 14h2 M11 14h2 M15 14h2 M7 18h2 M11 18h2" />
    </Svg>
);

export const IconTarget = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Circle cx="12" cy="12" r="10" />
        <Circle cx="12" cy="12" r="6" />
        <Circle cx="12" cy="12" r="2" />
    </Svg>
);

export const IconPlus = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Line x1="12" y1="5" x2="12" y2="19" />
        <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
);

export const IconBarcode = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Line x1="4" y1="3" x2="4" y2="21" />
        <Line x1="8" y1="3" x2="8" y2="21" />
        <Line x1="12" y1="3" x2="12" y2="21" />
        <Line x1="16" y1="3" x2="16" y2="21" />
        <Line x1="20" y1="3" x2="20" y2="21" />
        <Line x1="6" y1="3" x2="6" y2="21" />
        <Line x1="14" y1="3" x2="14" y2="21" />
    </Svg>
);

export const IconCamera = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <Circle cx="12" cy="13" r="4" />
    </Svg>
);

export const IconFlash = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
);

export const IconFlashOff = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        <Line x1="2" y1="2" x2="22" y2="22" />
    </Svg>
);

export const IconScale = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    <Ionicons name={focused ? "scale" : "scale-outline"} size={size} color={color} style={style} />
);

export const IconAlertTriangle = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <Line x1="12" y1="9" x2="12" y2="13" />
        <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
);

export const IconDroplets = ({ color = '#000', size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, style }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
        <Path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </Svg>
);
