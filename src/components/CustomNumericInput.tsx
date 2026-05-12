import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';

const NUMERIC_PAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'DEL'],
] as const;

type NumericPadConfig = {
  id: string;
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  allowDecimal: boolean;
  maxLength: number;
};

type NumericPadContextValue = {
  activeInputId: string | null;
  isOpen: boolean;
  open: (config: NumericPadConfig) => void;
  close: () => void;
  closeIfActive: (id: string) => void;
  syncValue: (id: string, value: string) => void;
};

const NumericPadContext = createContext<NumericPadContextValue | null>(null);

function useNumericPadContext() {
  const context = useContext(NumericPadContext);
  if (!context) {
    throw new Error('CustomNumericInput must be used within CustomNumericPadProvider');
  }
  return context;
}

function normalizeNumericInput(value: string, allowDecimal: boolean, maxLength: number): string {
  let next = value.replace(/[^\d.]/g, '');
  if (!allowDecimal) {
    return next.replace(/\./g, '').slice(0, maxLength);
  }

  const firstDecimalIndex = next.indexOf('.');
  if (firstDecimalIndex >= 0) {
    const before = next.slice(0, firstDecimalIndex + 1);
    const after = next.slice(firstDecimalIndex + 1).replace(/\./g, '');
    next = `${before}${after}`;
  }

  return next.slice(0, maxLength);
}

export function CustomNumericPadProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [activeConfig, setActiveConfig] = useState<NumericPadConfig | null>(null);
  const [activeValue, setActiveValue] = useState('');

  const close = useCallback(() => {
    setActiveConfig(null);
    setActiveValue('');
  }, []);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', close);
    return () => subscription.remove();
  }, [close]);

  const open = useCallback((config: NumericPadConfig) => {
    Keyboard.dismiss();
    const normalizedValue = normalizeNumericInput(config.value, config.allowDecimal, config.maxLength);
    setActiveConfig(config);
    setActiveValue(normalizedValue);
  }, []);

  const closeIfActive = useCallback((id: string) => {
    setActiveConfig((current) => {
      if (current?.id !== id) {
        return current;
      }
      setActiveValue('');
      return null;
    });
  }, []);

  const syncValue = useCallback((id: string, value: string) => {
    setActiveConfig((current) => {
      if (current?.id !== id) {
        return current;
      }
      setActiveValue(normalizeNumericInput(value, current.allowDecimal, current.maxLength));
      return current;
    });
  }, []);

  const commitValue = useCallback((nextValue: string) => {
    setActiveValue(nextValue);
    activeConfig?.onChangeText(nextValue);
  }, [activeConfig]);

  const handleKey = useCallback((key: string) => {
    if (!activeConfig) {
      return;
    }

    if (key === 'DEL') {
      commitValue(activeValue.slice(0, -1));
      return;
    }

    if (key === '.') {
      if (!activeConfig.allowDecimal || activeValue.includes('.')) {
        return;
      }
      commitValue(activeValue ? `${activeValue}.` : '0.');
      return;
    }

    if (activeValue.length >= activeConfig.maxLength) {
      return;
    }

    commitValue(activeValue === '0' ? key : `${activeValue}${key}`);
  }, [activeConfig, activeValue, commitValue]);

  const contextValue = useMemo<NumericPadContextValue>(() => ({
    activeInputId: activeConfig?.id ?? null,
    isOpen: activeConfig != null,
    open,
    close,
    closeIfActive,
    syncValue,
  }), [activeConfig, close, closeIfActive, open, syncValue]);

  return (
    <NumericPadContext.Provider value={contextValue}>
      <View style={styles.providerRoot}>
        {children}
        {activeConfig ? (
          <View pointerEvents="box-none" style={styles.overlay}>
            <View style={[styles.pad, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
              <View style={styles.padHeader}>
                <View style={styles.padHeaderCopy}>
                  <Text style={styles.padKicker}>Editing</Text>
                  <Text style={styles.padTitle} numberOfLines={1}>{activeConfig.title}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done editing numeric field"
                  style={styles.doneButton}
                  onPress={close}
                >
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>

              <View style={styles.valueRow}>
                <Text style={[styles.valueText, !activeValue && styles.valuePlaceholder]}>
                  {activeValue || 'Not set'}
                </Text>
              </View>

              <View style={styles.keyGrid}>
                {NUMERIC_PAD_ROWS.map((row) => (
                  <View key={row.join('-')} style={styles.keyRow}>
                    {row.map((key) => {
                      const disabled = key === '.' && !activeConfig.allowDecimal;
                      return (
                        <Pressable
                          key={key}
                          accessibilityRole="button"
                          accessibilityLabel={key === 'DEL' ? 'Delete' : `Enter ${key}`}
                          style={[styles.key, disabled && styles.keyDisabled]}
                          disabled={disabled}
                          onPress={() => handleKey(key)}
                        >
                          <Text style={[
                            styles.keyText,
                            key === 'DEL' && styles.deleteText,
                            disabled && styles.keyTextDisabled,
                          ]}>
                            {disabled ? '' : key}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </NumericPadContext.Provider>
  );
}

type CustomNumericInputProps = {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string | undefined;
  allowDecimal?: boolean;
  maxLength?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeStyle?: StyleProp<ViewStyle>;
  placeholderTextColor?: string | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityHint?: string | undefined;
  testID?: string | undefined;
  onPress?: (() => void) | undefined;
};

export const CustomNumericInput = memo(function CustomNumericInput({
  title,
  value,
  onChangeText,
  placeholder = '',
  allowDecimal = true,
  maxLength,
  disabled = false,
  style,
  textStyle,
  activeStyle,
  placeholderTextColor = COLORS.text.tertiary,
  accessibilityLabel,
  accessibilityHint = 'Opens the numeric keypad.',
  testID,
  onPress,
}: CustomNumericInputProps) {
  const idRef = useRef(`numeric-${Math.random().toString(36).slice(2)}`);
  const { activeInputId, open, closeIfActive, syncValue } = useNumericPadContext();
  const selected = activeInputId === idRef.current;
  const resolvedMaxLength = maxLength ?? (allowDecimal ? 7 : 4);
  const displayValue = normalizeNumericInput(value, allowDecimal, resolvedMaxLength);

  useEffect(() => () => closeIfActive(idRef.current), [closeIfActive]);

  useEffect(() => {
    syncValue(idRef.current, displayValue);
  }, [displayValue, syncValue]);

  const handlePress = () => {
    if (disabled) {
      return;
    }
    onPress?.();
    open({
      id: idRef.current,
      title,
      value: displayValue,
      onChangeText,
      allowDecimal,
      maxLength: resolvedMaxLength,
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      testID={testID}
      disabled={disabled}
      style={[styles.inputShell, style, selected && styles.inputShellActive, selected && activeStyle, disabled && styles.inputShellDisabled]}
      onPress={handlePress}
    >
      <Text
        style={[
          styles.inputText,
          { color: displayValue ? COLORS.text.primary : placeholderTextColor },
          textStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {displayValue || placeholder}
      </Text>
    </Pressable>
  );
});

export function useCustomNumericPad() {
  const { isOpen, close } = useNumericPadContext();
  return { isOpen, close };
}

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  pad: {
    backgroundColor: '#151515',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 245, 240, 0.14)',
    paddingHorizontal: 12,
    paddingTop: 6,
    ...SHADOWS.card,
  },
  padHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: 6,
  },
  padHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  padKicker: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  padTitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  doneButton: {
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: SPACING.md + SPACING.sm,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.28)',
    ...SHADOWS.colored.accent,
  },
  doneText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  valueRow: {
    minHeight: 32,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.12)',
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: 6,
  },
  valueText: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  valuePlaceholder: {
    color: COLORS.text.tertiary,
  },
  keyGrid: {
    gap: 8,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.06)',
  },
  keyDisabled: {
    opacity: 0,
  },
  keyText: {
    fontSize: 25,
    lineHeight: 30,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  deleteText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.semiBold,
    letterSpacing: 0.8,
  },
  keyTextDisabled: {
    color: 'transparent',
  },
  inputShell: {
    minHeight: 50,
    justifyContent: 'center',
  },
  inputShellActive: {
    borderColor: 'rgba(212, 175, 55, 0.60)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    ...SHADOWS.colored.accent,
  },
  inputShellDisabled: {
    opacity: 0.5,
  },
  inputText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.regular,
  },
});
