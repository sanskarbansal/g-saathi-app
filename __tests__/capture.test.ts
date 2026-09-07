import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { pickStorefrontPhoto, recoverPendingPhoto } from "@/utils/capture";

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe("storefront photo capture", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        picker.requestCameraPermissionsAsync.mockResolvedValue({
            status: "granted",
        } as never);
    });

    it("returns the captured photo with a hash", async () => {
        picker.launchCameraAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: "file:///shop.jpg" }],
        } as never);

        const photo = await pickStorefrontPhoto("camera");
        expect(photo?.uri).toBe("file:///shop.jpg");
        expect(photo?.hash).toBeTruthy();
    });

    it("returns null instead of throwing when the camera blows up", async () => {
        picker.launchCameraAsync.mockRejectedValue(new Error("Camera unavailable"));
        await expect(pickStorefrontPhoto("camera")).resolves.toBeNull();
    });

    it("returns null when the agent cancels", async () => {
        picker.launchCameraAsync.mockResolvedValue({
            canceled: true,
            assets: null,
        } as never);
        await expect(pickStorefrontPhoto("camera")).resolves.toBeNull();
    });

    it("returns null when permission is refused, without launching the camera", async () => {
        picker.requestCameraPermissionsAsync.mockResolvedValue({
            status: "denied",
        } as never);
        await expect(pickStorefrontPhoto("camera")).resolves.toBeNull();
        expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it("swallows an error result from the picker", async () => {
        picker.launchCameraAsync.mockResolvedValue({
            code: "ERR_MISSING_ACTIVITY",
            message: "no activity",
        } as never);
        await expect(pickStorefrontPhoto("camera")).resolves.toBeNull();
    });
});

describe("recoverPendingPhoto", () => {
    const original = Platform.OS;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    });

    const setPlatform = (os: string) =>
        Object.defineProperty(Platform, "OS", { value: os, configurable: true });

    it("recovers a photo the OS held while the app was killed", async () => {
        setPlatform("android");
        picker.getPendingResultAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: "file:///pending.jpg" }],
        } as never);

        const photo = await recoverPendingPhoto();
        expect(photo?.uri).toBe("file:///pending.jpg");
    });

    it("is a no-op on iOS", async () => {
        setPlatform("ios");
        await expect(recoverPendingPhoto()).resolves.toBeNull();
        expect(picker.getPendingResultAsync).not.toHaveBeenCalled();
    });

    it("returns null when there is nothing pending", async () => {
        setPlatform("android");
        picker.getPendingResultAsync.mockResolvedValue(null as never);
        await expect(recoverPendingPhoto()).resolves.toBeNull();
    });

    it("returns null when the native call throws", async () => {
        setPlatform("android");
        picker.getPendingResultAsync.mockRejectedValue(new Error("boom"));
        await expect(recoverPendingPhoto()).resolves.toBeNull();
    });
});
