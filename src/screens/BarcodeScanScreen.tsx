import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, ANIMATION } from '../theme/theme';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { IconChevronLeft, IconFlash, IconFlashOff } from '../components/icons';
import { lookupBarcode } from '../../lib/api/openFoodFacts';
import { MealType } from '../../lib/engine/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.72;
const SCAN_AREA_HEIGHT = SCAN_AREA_SIZE * 0.55;

type RouteParams = {
    BarcodeScan: { mealType: MealType; date?: string };
};

type ScanState = 'scanning' | 'loading' | 'not_found';

export function BarcodeScanScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'BarcodeScan'>>();
    const { mealType, date } = route.params;

    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const scanLockRef = useRef(false);

    const handleBarCodeScanned = useCallback(
        async (result: BarcodeScanningResult) => {
            if (scanLockRef.current) return;
            scanLockRef.current = true;

            const barcode = result.data;
            setScannedBarcode(barcode);
            setScanState('loading');

            try {
                const foodItem = await lookupBarcode(barcode);
                if (foodItem) {
                    navigation.replace('FoodDetail', { foodItem, mealType, date });
                } else {
                    setScanState('not_found');
                }
            } catch {
                setScanState('not_found');
            }
        },
        [navigation, mealType, date]
    );

    const handleTryAgain = () => {
        setScanState('scanning');
        setScannedBarcode(null);
        scanLockRef.current = false;
    };

    const handleTryCustom = () => {
        navigation.replace('CustomFood');
    };

    // Permission not yet determined
    if (!permission) {
        return (
            <View style={styles.permissionContainer}>
                <ActivityIndicator color={COLORS.text.tertiary} />
            </View>
        );
    }

    // Permission denied
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionText}>
                    Athleticore needs camera access to scan food barcodes and quickly find nutritional info.
                </Text>
                <AnimatedPressable style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
                </AnimatedPressable>
                <AnimatedPressable
                    style={[styles.permissionButton, styles.permissionButtonSecondary]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.permissionButtonText, { color: COLORS.text.secondary }]}>
                        Go Back
                    </Text>
                </AnimatedPressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(ANIMATION.normal)} style={StyleSheet.absoluteFillObject}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    enableTorch={torchEnabled}
                    barcodeScannerSettings={{
                        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                    }}
                    onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
                />
            </Animated.View>

            {/* Dark overlay with cutout */}
            <View style={styles.overlay}>
                {/* Top bar */}
                <View style={[styles.overlayTop, { paddingTop: insets.top + SPACING.sm }]}>
                    <AnimatedPressable onPress={() => navigation.goBack()} style={styles.topButton}>
                        <IconChevronLeft size={28} color="#FFF" />
                    </AnimatedPressable>
                    <Text style={styles.overlayTitle}>Scan Barcode</Text>
                    <AnimatedPressable
                        onPress={() => setTorchEnabled((v) => !v)}
                        style={styles.topButton}
                    >
                        {torchEnabled ? (
                            <IconFlash size={24} color="#FFF" />
                        ) : (
                            <IconFlashOff size={24} color="rgba(255,255,255,0.6)" />
                        )}
                    </AnimatedPressable>
                </View>

                {/* Middle: scan window */}
                <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanWindow}>
                        {/* Corner brackets */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.overlaySide} />
                </View>

                {/* Bottom section */}
                <View style={styles.overlayBottom}>
                    {scanState === 'scanning' && (
                        <Text style={styles.instructionText}>
                            Align the barcode within the frame
                        </Text>
                    )}

                    {scanState === 'loading' && (
                        <View style={styles.statusContainer}>
                            <ActivityIndicator color="#FFF" size="small" />
                            <Text style={styles.statusText}>Looking up product...</Text>
                        </View>
                    )}

                    {scanState === 'not_found' && (
                        <View style={styles.notFoundContainer}>
                            <Text style={styles.notFoundTitle}>Product Not Found</Text>
                            <Text style={styles.notFoundBarcode}>
                                Barcode: {scannedBarcode}
                            </Text>
                            <View style={styles.notFoundActions}>
                                <AnimatedPressable
                                    style={styles.notFoundButton}
                                    onPress={handleTryCustom}
                                >
                                    <Text style={styles.notFoundButtonText}>Try Custom Food</Text>
                                </AnimatedPressable>
                                <AnimatedPressable
                                    style={[styles.notFoundButton, styles.notFoundButtonOutline]}
                                    onPress={handleTryAgain}
                                >
                                    <Text style={[styles.notFoundButtonText, { color: '#FFF' }]}>
                                        Try Again
                                    </Text>
                                </AnimatedPressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    overlayTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingBottom: SPACING.md,
    },
    topButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayTitle: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    overlayMiddle: {
        flexDirection: 'row',
        height: SCAN_AREA_HEIGHT,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    scanWindow: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_HEIGHT,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#FFF',
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    overlayBottom: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xxl + 20,
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-start',
    },
    instructionText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statusText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    notFoundContainer: {
        alignItems: 'center',
        width: '100%',
    },
    notFoundTitle: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: '#FFF',
        marginBottom: SPACING.xs,
    },
    notFoundBarcode: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: SPACING.lg,
    },
    notFoundActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    notFoundButton: {
        backgroundColor: '#FFF',
        paddingVertical: SPACING.sm + 4,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
    },
    notFoundButtonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    notFoundButtonText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#1A1A2E',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    permissionTitle: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    permissionButton: {
        backgroundColor: COLORS.text.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        width: '100%',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    permissionButtonSecondary: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    permissionButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
});
