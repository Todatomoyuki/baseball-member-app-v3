export type EquipmentItem = {
    id: string;
    name: string;
    holderId: string | null;
    note: string;
    notifyLine: boolean;
};

export type EquipmentData = {
    items: EquipmentItem[];
};

export function initialEquipmentData(): EquipmentData {
    return {
        items: [],
    };
}

export function validateEquipmentData(value: unknown): EquipmentData {
    if (!value || typeof value !== "object") {
        throw new Error("Invalid equipment data");
    }

    const data = value as Partial<EquipmentData>;

    if (!Array.isArray(data.items)) {
        throw new Error("items is required");
    }

    const items = data.items.map((item) => {
        if (!item || typeof item !== "object") {
            throw new Error("Invalid equipment item");
        }

        const v = item as Partial<EquipmentItem>;

        if (
            typeof v.id !== "string" ||
            !v.id.trim() ||
            typeof v.name !== "string" ||
            !v.name.trim()
        ) {
            throw new Error("Invalid equipment item");
        }

        if (
            v.holderId !== null &&
            v.holderId !== undefined &&
            typeof v.holderId !== "string"
        ) {
            throw new Error("Invalid holderId");
        }

        // Reject stale clients instead of resetting an existing notification flag.
        if (typeof v.notifyLine !== "boolean") {
            throw new Error("Invalid notifyLine");
        }

        return {
            id: v.id.trim(),
            name: v.name.trim(),
            holderId: v.holderId?.trim() || null,
            note: typeof v.note === "string" ? v.note.trim() : "",
            notifyLine: v.notifyLine,
        };
    });

    if (new Set(items.map((item) => item.id)).size !== items.length) {
        throw new Error("Duplicate equipment id");
    }

    return { items };
}
