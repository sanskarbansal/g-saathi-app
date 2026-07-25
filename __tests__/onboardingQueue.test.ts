import { onlineManager } from "@tanstack/react-query";

import { onboardingQueue } from "@/offline/mutationQueue";
import { fieldApi, ApiError, type CreateOnboardingInput } from "@/api";

// Mock only the network call; keep the real ApiError / helpers.
jest.mock("@/api", () => {
    const actual = jest.requireActual("@/api");
    return {
        __esModule: true,
        ...actual,
        fieldApi: { ...actual.fieldApi, createOnboarding: jest.fn() },
    };
});

const createMock = fieldApi.createOnboarding as jest.Mock;

const input: CreateOnboardingInput = {
    clientId: "11111111-1111-4111-8111-111111111111",
    shopName: "Test Kirana",
    phone: "+91 9990000001",
};

describe("offline onboarding queue", () => {
    beforeEach(async () => {
        await onboardingQueue._resetForTests();
        createMock.mockReset();
        onlineManager.setOnline(true);
    });

    afterAll(() => onlineManager.setOnline(true));

    it("holds the create while offline, then flushes exactly once when online", async () => {
        onlineManager.setOnline(false);
        await onboardingQueue.enqueue(input);

        // Nothing posted while offline; the shop is queued ("saved · syncing").
        expect(createMock).not.toHaveBeenCalled();
        expect(onboardingQueue.getItems()).toHaveLength(1);
        expect(onboardingQueue.getItems()[0]?.status).toBe("pending");

        // Reconnect → flush → POST once (idempotent on clientId) → queue drains.
        createMock.mockResolvedValue({
            onboarding: {},
            store: null,
            checklist: [],
            idempotentReplay: false,
        });
        onlineManager.setOnline(true);
        await onboardingQueue.flush();

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ clientId: input.clientId }));
        expect(onboardingQueue.getItems()).toHaveLength(0);
    });

    it("marks a duplicate-phone (409) create as a permanent error and stops retrying", async () => {
        createMock.mockRejectedValue(new ApiError("CONFLICT", "duplicate", 409));
        await onboardingQueue.enqueue(input);
        await onboardingQueue.flush();

        const items = onboardingQueue.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]?.status).toBe("error");
        expect(items[0]?.errorCode).toBe("CONFLICT");

        // A second flush must NOT re-post an errored item.
        createMock.mockClear();
        await onboardingQueue.flush();
        expect(createMock).not.toHaveBeenCalled();
    });

    it("keeps the item pending on a transient network error", async () => {
        createMock.mockRejectedValue(new ApiError("NETWORK", "offline", 0));
        await onboardingQueue.enqueue(input);
        await onboardingQueue.flush();

        const items = onboardingQueue.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]?.status).toBe("pending");
    });
});
