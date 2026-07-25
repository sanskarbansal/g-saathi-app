import React from "react";
import { render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/theme";
import { ScoreScreen } from "@/features/score/ScoreScreen";
import { fieldApi, type ScoreBreakdown } from "@/api";
import i18n from "@/i18n";

// Mock the network call; keep everything else real.
jest.mock("@/api", () => {
    const actual = jest.requireActual("@/api");
    return {
        __esModule: true,
        ...actual,
        fieldApi: { ...actual.fieldApi, getScore: jest.fn() },
    };
});

const getScoreMock = fieldApi.getScore as jest.Mock;

const SCORE: ScoreBreakdown = {
    period: "2026-07",
    saathiScore: 640,
    scoreMax: 1000,
    pillars: [
        { key: "stores", actual: 12, target: 30, weightPct: 20, points: 80 },
        { key: "activations", actual: 8, target: 25, weightPct: 20, points: 64 },
        { key: "revenue", actual: 120000, target: 500000, weightPct: 30, points: 72 },
        { key: "repeat", actualPct: 55, targetPct: 70, weightPct: 30, points: 118 },
    ],
};

function renderScore() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <SafeAreaProvider>
            <QueryClientProvider client={client}>
                <ThemeProvider>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <ScoreScreen {...({} as any)} />
                </ThemeProvider>
            </QueryClientProvider>
        </SafeAreaProvider>,
    );
}

describe("ScoreScreen", () => {
    beforeAll(async () => {
        await i18n.changeLanguage("en");
    });

    beforeEach(() => getScoreMock.mockReset());

    it("renders the Saathi Score and all four pillars", async () => {
        getScoreMock.mockResolvedValue(SCORE);
        renderScore();

        expect(await screen.findByText("Stores onboarded")).toBeTruthy();
        expect(screen.getByText("App activations")).toBeTruthy();
        expect(screen.getByText("Revenue (GMV)")).toBeTruthy();
        expect(screen.getByText("Repeat rate")).toBeTruthy();
        // Big score number in the ring.
        expect(screen.getByText("640")).toBeTruthy();
    });

    it("shows the actual/target for the revenue pillar in compact rupees", async () => {
        getScoreMock.mockResolvedValue(SCORE);
        renderScore();

        // 120000 → ₹1.2 L, 500000 → ₹5 L
        expect(await screen.findByText("₹1.2 L / ₹5 L")).toBeTruthy();
    });
});
