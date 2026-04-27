import React from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

export interface IconProps {
    color?: string;
    size?: number;
    strokeWidth?: number;
    style?: any;
    focused?: boolean;
}

const DEFAULT_SIZE = 24;

// ------------------------------------------------------------------
// Base / Navigation Icons
// ------------------------------------------------------------------

export const IconBarChart = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={size} color={color} style={style} />
);

export const IconPerson = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} style={style} />
);

export const IconAddCircle = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="plus-circle" size={size} color={color} style={style} />
);

export const IconShieldCheck = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="shield" size={size} color={color} style={style} />
);

export const IconBell = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="bell" size={size} color={color} style={style} />
);

export const IconWaterDrop = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="droplet" size={size} color={color} style={style} />
);

export const IconDroplets = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => ( // Closest feather match
    <Feather name="droplet" size={size} color={color} style={style} />
);

export const IconRestaurant = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    // Feather doesn't have standard food icons, Ionicons is better here.
    <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={size} color={color} style={style} />
);

export const IconCheckCircle = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="check-circle" size={size} color={color} style={style} />
);

export const IconCircleOutline = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="circle" size={size} color={color} style={style} />
);

export const IconFire = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    // Feather lacks a flame, Ionicons is standard
    <Ionicons name="flame-outline" size={size} color={color} style={style} />
);

export const IconBarbell = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Ionicons name="barbell-outline" size={size} color={color} style={style} />
);

export const IconLightning = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="zap" size={size} color={color} style={style} />
);

export const IconArrowUp = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="arrow-up" size={size} color={color} style={style} />
);

export const IconActivity = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="activity" size={size} color={color} style={style} />
);

export const IconChevronRight = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="chevron-right" size={size} color={color} style={style} />
);

export const IconChevronLeft = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="chevron-left" size={size} color={color} style={style} />
);

export const IconSettings = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="settings" size={size} color={color} style={style} />
);

export const IconTrendUp = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="trending-up" size={size} color={color} style={style} />
);

export const IconTrendDown = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="trending-down" size={size} color={color} style={style} />
);

export const IconCalendar = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="calendar" size={size} color={color} style={style} />
);

export const IconTarget = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="target" size={size} color={color} style={style} />
);

export const IconPlus = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="plus" size={size} color={color} style={style} />
);

export const IconMinus = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="minus" size={size} color={color} style={style} />
);

export const IconClose = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="x" size={size} color={color} style={style} />
);

export const IconCheck = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="check" size={size} color={color} style={style} />
);

export const IconBarcode = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Ionicons name="barcode-outline" size={size} color={color} style={style} />
);

export const IconCamera = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="camera" size={size} color={color} style={style} />
);

export const IconFlash = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Ionicons name="flash" size={size} color={color} style={style} />
);

export const IconFlashOff = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Ionicons name="flash-off" size={size} color={color} style={style} />
);

export const IconScale = ({ color = '#000', size = DEFAULT_SIZE, focused = false, style }: IconProps) => (
    // Ionicons has a dedicated scale icon
    <Ionicons name={focused ? "scale" : "scale-outline"} size={size} color={color} style={style} />
);

export const IconAlertTriangle = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="alert-triangle" size={size} color={color} style={style} />
);

export const IconInfo = ({ color = '#000', size = DEFAULT_SIZE, style }: IconProps) => (
    <Feather name="info" size={size} color={color} style={style} />
);
