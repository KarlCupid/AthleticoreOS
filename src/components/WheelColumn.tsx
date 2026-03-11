import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { COLORS, FONT_FAMILY } from '../theme/theme';

const ITEM_H = 48;

export function WheelColumn({ items, selected, onSelect, flex, format }: {
    items: number[];
    selected: number;
    onSelect: (v: number) => void;
    flex: number;
    format: (v: number) => string;
}) {
    const scrollRef = useRef<ScrollView>(null);
    const isFirst = useRef(true);

    useEffect(() => {
        const idx = items.indexOf(selected);
        if (idx >= 0 && scrollRef.current) {
            scrollRef.current.scrollTo({ y: idx * ITEM_H, animated: !isFirst.current });
            isFirst.current = false;
        }
    }, [selected, items]);

    return (
        <View style={{ flex, overflow: 'hidden', height: ITEM_H * 5 }}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                    onSelect(items[Math.max(0, Math.min(idx, items.length - 1))]);
                }}
                contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
            >
                {items.map(item => (
                    <View key={item} style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{
                            fontSize: selected === item ? 19 : 15,
                            fontFamily: selected === item ? FONT_FAMILY.semiBold : FONT_FAMILY.regular,
                            color: selected === item ? '#6366F1' : COLORS.text.tertiary,
                        }}>
                            {format(item)}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
