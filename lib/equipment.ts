export type EquipmentItem = {
    id: string;
    name: string;
    holderId: string | null;
    note: string;
};

export type EquipmentData = {
    items: EquipmentItem[];
};

export function initialEquipmentData(): EquipmentData {
    return {
        items: [],
    };
}

export function normalizeEquipmentData(data: EquipmentData): EquipmentData {
    return {
        items: Array.isArray(data.items)
            ? data.items.map((item) => ({
                  id: String(item.id ?? ""),
                  name: String(item.name ?? ""),
                  holderId: item.holderId ? String(item.holderId) : null,
                  note: String(item.note ?? ""),
              }))
            : [],
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

        return {
            id: v.id.trim(),
            name: v.name.trim(),
            holderId: v.holderId?.trim() || null,
            note: typeof v.note === "string" ? v.note.trim() : "",
        };
    });

    return { items };
}
