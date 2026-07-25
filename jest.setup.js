/* eslint-disable @typescript-eslint/no-require-imports */
// Global Jest setup: mock the native modules the app touches so components and
// hooks render in a plain Node test environment.

// AsyncStorage — official in-memory mock.
jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// NetInfo — assume "online" by default; tests override as needed.
jest.mock("@react-native-community/netinfo", () => ({
    __esModule: true,
    default: {
        addEventListener: jest.fn(() => jest.fn()),
        fetch: jest.fn(() =>
            Promise.resolve({ isConnected: true, isInternetReachable: true }),
        ),
    },
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() =>
        Promise.resolve({ isConnected: true, isInternetReachable: true }),
    ),
}));

// expo-secure-store — in-memory map.
jest.mock("expo-secure-store", () => {
    const store = new Map();
    return {
        getItemAsync: jest.fn((k) => Promise.resolve(store.has(k) ? store.get(k) : null)),
        setItemAsync: jest.fn((k, v) => {
            store.set(k, v);
            return Promise.resolve();
        }),
        deleteItemAsync: jest.fn((k) => {
            store.delete(k);
            return Promise.resolve();
        }),
    };
});

// expo-crypto — deterministic-enough uuid + hash for tests.
jest.mock("expo-crypto", () => {
    let n = 0;
    return {
        randomUUID: jest.fn(() => {
            n += 1;
            const h = n.toString(16).padStart(12, "0");
            return `00000000-0000-4000-8000-${h}`;
        }),
        digestStringAsync: jest.fn((_algo, data) =>
            Promise.resolve(`hash_${String(data).length}`),
        ),
        CryptoDigestAlgorithm: { SHA256: "SHA-256" },
        CryptoEncoding: { HEX: "hex" },
    };
});

// expo-haptics — no-ops.
jest.mock("expo-haptics", () => ({
    notificationAsync: jest.fn(() => Promise.resolve()),
    impactAsync: jest.fn(() => Promise.resolve()),
    selectionAsync: jest.fn(() => Promise.resolve()),
    NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
    ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// expo-location — grant + a fixed coordinate.
jest.mock("expo-location", () => ({
    requestForegroundPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: "granted" }),
    ),
    getCurrentPositionAsync: jest.fn(() =>
        Promise.resolve({ coords: { latitude: 28.79, longitude: 76.13, accuracy: 12 } }),
    ),
    Accuracy: { Balanced: 3, High: 4 },
}));

// expo-image-picker — a canned image result.
jest.mock("expo-image-picker", () => ({
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
    requestMediaLibraryPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: "granted" }),
    ),
    launchCameraAsync: jest.fn(() =>
        Promise.resolve({ canceled: false, assets: [{ uri: "file:///photo.jpg" }] }),
    ),
    launchImageLibraryAsync: jest.fn(() =>
        Promise.resolve({ canceled: false, assets: [{ uri: "file:///photo.jpg" }] }),
    ),
    MediaTypeOptions: { Images: "Images" },
    MediaType: { Images: "images" },
}));

// expo-localization — English locale for stable test strings.
jest.mock("expo-localization", () => ({
    getLocales: jest.fn(() => [{ languageCode: "en", languageTag: "en-IN" }]),
}));

// expo-linear-gradient — render children in a plain View.
jest.mock("expo-linear-gradient", () => {
    const React = require("react");
    const { View } = require("react-native");
    return { LinearGradient: (props) => React.createElement(View, props, props.children) };
});

// react-native-svg — lightweight stand-ins so Ring/graphics render.
jest.mock("react-native-svg", () => {
    const React = require("react");
    const { View } = require("react-native");
    const make = (name) => {
        const C = (props) => React.createElement(View, props, props.children);
        C.displayName = name;
        return C;
    };
    const Svg = make("Svg");
    return {
        __esModule: true,
        default: Svg,
        Svg,
        Circle: make("Circle"),
        Path: make("Path"),
        G: make("G"),
        Defs: make("Defs"),
        LinearGradient: make("LinearGradient"),
        Stop: make("Stop"),
        Text: make("Text"),
        Rect: make("Rect"),
    };
});

// react-native-safe-area-context — inline passthrough mock (zero insets).
jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    const insets = { top: 0, right: 0, bottom: 0, left: 0 };
    const frame = { x: 0, y: 0, width: 390, height: 844 };
    return {
        __esModule: true,
        SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
        SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
        SafeAreaInsetsContext: React.createContext(insets),
        useSafeAreaInsets: () => insets,
        useSafeAreaFrame: () => frame,
        initialWindowMetrics: { insets, frame },
    };
});

// Silence the act() / animation noise from RN internals during tests.
jest.spyOn(console, "warn").mockImplementation(() => {});
