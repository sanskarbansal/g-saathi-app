import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/theme";
import { QtySheet } from "@/features/orders";
import "@/i18n";

const units = [
    { id: "u-base", name: "Piece", factorToBase: 1, isBase: true, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 0, available: 500 },
    { id: "u-case", name: "Case", factorToBase: 24, isBase: false, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 1, available: 20 },
];

/** The stepper listens on pressIn/pressOut (so holds work), so a tap is both. */
function tap(label: string) {
    const el = screen.getByLabelText(label);
    fireEvent(el, "pressIn");
    fireEvent(el, "pressOut");
}

function renderSheet(over: Partial<React.ComponentProps<typeof QtySheet>["target"]> = {}) {
    const onApply = jest.fn();
    render(
        <ThemeProvider>
            <QtySheet
                visible
                onClose={() => {}}
                onApply={onApply}
                target={{ title: "Rice", quantity: 0, units, basePrice: 100, unitPrice: 100, tiers: [], maxQuantityPerOrder: 120, baseAvailable: 500, ...over }}
            />
        </ThemeProvider>,
    );
    return onApply;
}

describe("bulk quantity sheet — counted with −/+, clamped to the maximum", () => {
    it("loose units step by one and the Max chip jumps to the per-order cap", () => {
        const onApply = renderSheet();
        expect(screen.queryByPlaceholderText("0")).toBeNull(); // no typed field any more
        tap("+");
        tap("+");
        tap("+");
        expect(screen.getByTestId("qty-count")).toHaveTextContent("3");
        fireEvent.press(screen.getByText(/Max 120/));
        expect(screen.getByTestId("qty-count")).toHaveTextContent("120");
        expect(screen.getByText(/Maximum for this item: 120/)).toBeTruthy();
        // + does nothing past the cap; apply carries the clamped total
        tap("+");
        expect(screen.getByTestId("qty-count")).toHaveTextContent("120");
        fireEvent.press(screen.getByText(/Set 120 units/));
        expect(onApply).toHaveBeenCalledWith(120, null);
    });

    it("packs are counted with −/+ and clamp to whole packs (120 cap / 24 = 5 cases)", () => {
        const onApply = renderSheet();
        fireEvent.press(screen.getByText("Case × 24"));
        for (let i = 0; i < 9; i++) tap("+");
        expect(screen.getByTestId("qty-count")).toHaveTextContent("5");
        expect(screen.getByText("5 Case × 24 = 120 Piece")).toBeTruthy();
        tap("−");
        expect(screen.getByTestId("qty-count")).toHaveTextContent("4");
        fireEvent.press(screen.getByText(/Max 5/));
        fireEvent.press(screen.getByText(/Set 120 units/));
        expect(onApply).toHaveBeenCalledWith(120, { unitId: "u-case", packQuantity: 5 });
    });

    it("uses stock as the limit when it is tighter than the cap", () => {
        renderSheet({ maxQuantityPerOrder: null, baseAvailable: 37 });
        fireEvent.press(screen.getByText(/\+50/));
        expect(screen.getByTestId("qty-count")).toHaveTextContent("37");
        expect(screen.getByText(/Only 37 in stock/)).toBeTruthy();
    });
});

describe("hold-to-accelerate stepper", () => {
    // eslint-disable-next-line @testing-library/no-node-access
    const { HoldStepper, holdNext, holdStep } = jest.requireActual("@/features/orders");

    it("accelerates 1 → 5 → 10 and snaps to round numbers", () => {
        expect(holdStep(0).step).toBe(1);
        expect(holdStep(8).step).toBe(5);
        expect(holdStep(20).step).toBe(10);
        expect(holdNext(13, 1, 5, 0, null)).toBe(15);
        expect(holdNext(13, -1, 5, 0, null)).toBe(10);
        expect(holdNext(98, 1, 10, 0, 100)).toBe(100);
        expect(holdNext(0, -1, 1, 0, null)).toBe(0);
    });

    it("a hold keeps stepping until released, and stops at the max", () => {
        jest.useFakeTimers();
        let value = 0;
        const onChange = jest.fn((n: number) => {
            value = n;
            rerender(<ThemeProvider><HoldStepper value={value} max={60} onChange={onChange} testID="c" /></ThemeProvider>);
        });
        const { rerender } = render(<ThemeProvider><HoldStepper value={value} max={60} onChange={onChange} testID="c" /></ThemeProvider>);
        fireEvent(screen.getByLabelText("+"), "pressIn");
        expect(value).toBe(1); // the tap itself
        jest.advanceTimersByTime(380); // first repeat after the hold delay
        expect(value).toBe(2);
        jest.advanceTimersByTime(140 * 6); // ticks 2–7: still single steps
        expect(value).toBe(8);
        jest.advanceTimersByTime(140); // tick 8: step 5, snapping 8 → 10
        expect(value).toBe(10);
        jest.advanceTimersByTime(120 * 2); // 15, 20
        expect(value).toBe(20);
        jest.advanceTimersByTime(5000); // runs up to the max and stops there
        expect(value).toBe(60);
        fireEvent(screen.getByLabelText("+"), "pressOut");
        jest.advanceTimersByTime(5000);
        expect(value).toBe(60);
        jest.useRealTimers();
    });
});
