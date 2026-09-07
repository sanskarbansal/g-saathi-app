import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/theme";
import { QtySheet } from "@/features/orders";
import "@/i18n";

const units = [
    { id: "u-base", name: "Piece", factorToBase: 1, isBase: true, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 0, available: 500 },
    { id: "u-case", name: "Case", factorToBase: 24, isBase: false, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 1, available: 20 },
];

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

describe("bulk quantity sheet — auto-clamps to the maximum", () => {
    it("typing more than the per-order cap lands on the cap", () => {
        const onApply = renderSheet();
        fireEvent.changeText(screen.getByPlaceholderText("0"), "500");
        expect(screen.getByDisplayValue("120")).toBeTruthy();
        expect(screen.getByText(/Maximum for this item: 120/)).toBeTruthy();
        // Apply button carries the clamped total
        fireEvent.press(screen.getByText(/Set 120 units/));
        expect(onApply).toHaveBeenCalledWith(120, null);
    });

    it("clamps to whole packs when a pack is chosen (120 cap / 24 = 5 cases)", () => {
        const onApply = renderSheet();
        fireEvent.press(screen.getByText("Case × 24"));
        fireEvent.changeText(screen.getByPlaceholderText("0"), "9");
        expect(screen.getByDisplayValue("5")).toBeTruthy();
        fireEvent.press(screen.getByText(/Set 120 units/));
        expect(onApply).toHaveBeenCalledWith(120, { unitId: "u-case", packQuantity: 5 });
    });

    it("uses stock as the limit when it is tighter than the cap", () => {
        renderSheet({ maxQuantityPerOrder: null, baseAvailable: 37 });
        fireEvent.changeText(screen.getByPlaceholderText("0"), "1000");
        expect(screen.getByDisplayValue("37")).toBeTruthy();
        expect(screen.getByText(/Only 37 in stock/)).toBeTruthy();
    });
});
