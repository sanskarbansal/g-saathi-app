import React from "react";
import { render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/theme";
import { PriceBlock, VariantSpecs, mrpSaving } from "@/features/orders";
import "@/i18n";

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("VariantSpecs — variant / unit / weight are each labelled", () => {
    it("shows all three facts with their labels", () => {
        wrap(<VariantSpecs variantName="5kg" unit="bag" weight="5 kg" />);
        expect(screen.getByText("Variant")).toBeTruthy();
        expect(screen.getByText("5kg")).toBeTruthy();
        expect(screen.getByText("Unit")).toBeTruthy();
        expect(screen.getByText("bag")).toBeTruthy();
        expect(screen.getByText("Weight")).toBeTruthy();
        expect(screen.getByText("5 kg")).toBeTruthy();
    });

    it("leaves out missing facts and the meaningless 'Default' variant name", () => {
        wrap(<VariantSpecs variantName="Default" unit="piece" weight={null} />);
        expect(screen.queryByText("Variant")).toBeNull();
        expect(screen.queryByText("Weight")).toBeNull();
        expect(screen.getByText("Unit")).toBeTruthy();
        expect(screen.getByText("piece")).toBeTruthy();
    });
});

describe("PriceBlock — MRP is always shown", () => {
    it("strikes MRP and calls out the saving when the price is lower", () => {
        wrap(<PriceBlock price={90} mrp={120} unit="piece" />);
        expect(screen.getByText("₹90.00")).toBeTruthy();
        expect(screen.getByText("per piece")).toBeTruthy();
        expect(screen.getByText("₹120.00")).toBeTruthy();
        expect(screen.getByText(/MRP/)).toBeTruthy();
        expect(screen.getByText("₹30.00 off · 25%")).toBeTruthy();
    });

    it("still states MRP (without a saving) when the price equals it", () => {
        wrap(<PriceBlock price={120} mrp={120} />);
        expect(screen.getByText(/MRP/)).toBeTruthy();
        expect(screen.getAllByText("₹120.00")).toHaveLength(2);
        expect(screen.queryByText(/off/)).toBeNull();
    });

    it("mrpSaving maths", () => {
        expect(mrpSaving(90, 120)).toEqual({ amount: 30, pct: 25 });
        expect(mrpSaving(120, 120)).toBeNull();
        expect(mrpSaving(50, 0)).toBeNull();
    });
});

describe("formatPrice — always two decimals, Indian grouping", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { formatPrice } = require("@/utils/format");
    it("pads, rounds to the paisa and groups lakhs", () => {
        expect(formatPrice(90)).toBe("₹90.00");
        expect(formatPrice(1234.5)).toBe("₹1,234.50");
        expect(formatPrice(120000)).toBe("₹1,20,000.00");
        expect(formatPrice(99.999)).toBe("₹100.00");
        expect(formatPrice(-5.5)).toBe("-₹5.50");
        expect(formatPrice(NaN)).toBe("₹0.00");
    });
});
