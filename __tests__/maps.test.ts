import { Linking } from "react-native";

import { directionsUrl, openDirections } from "@/utils/maps";

describe("directionsUrl", () => {
    it("builds a universal Google Maps directions link to the destination", () => {
        expect(directionsUrl({ lat: 28.6139, lng: 77.209 })).toBe(
            "https://www.google.com/maps/dir/?api=1&destination=28.6139,77.209",
        );
    });
});

describe("openDirections", () => {
    // jest-expo pre-mocks Linking, so clear call history before each test.
    beforeEach(() => jest.clearAllMocks());
    afterEach(() => jest.restoreAllMocks());

    it("opens the native maps scheme when the device supports it", async () => {
        const canOpen = jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
        const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);

        const ok = await openDirections({ lat: 28.6139, lng: 77.209 }, "Sharma Kirana");

        expect(ok).toBe(true);
        expect(canOpen).toHaveBeenCalledTimes(1);
        const opened = String(open.mock.calls[0]?.[0]);
        expect(opened).toContain("28.6139,77.209");
        // The label is URL-encoded (space → %20).
        expect(opened).toContain("Sharma%20Kirana");
    });

    it("falls back to the universal Google link when the native scheme is unsupported", async () => {
        jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
        const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);

        const ok = await openDirections({ lat: 12.9716, lng: 77.5946 });

        expect(ok).toBe(true);
        expect(open).toHaveBeenCalledWith(
            "https://www.google.com/maps/dir/?api=1&destination=12.9716,77.5946",
        );
    });

    it("returns false for invalid coordinates without opening anything", async () => {
        const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
        const ok = await openDirections({ lat: Number.NaN, lng: 77 });
        expect(ok).toBe(false);
        expect(open).not.toHaveBeenCalled();
    });

    it("returns false when every open attempt throws", async () => {
        jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
        jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
        const ok = await openDirections({ lat: 1, lng: 2 });
        expect(ok).toBe(false);
    });
});
