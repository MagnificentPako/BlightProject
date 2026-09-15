export interface AtlasNodeData extends Record<string, unknown> {
    id: string;
    x: number;
    y: number;
    label: string;
    locked?: boolean;
    collectionItem: string;
    tithe: string;
    empowermentUniques: string[];
    points: number;
    tier: number;
    isUnique: boolean;
    isPenultimate: boolean;
    isWeakened: boolean;
    isEmpowered: boolean;
    isContended: boolean;
    containsHiddenFractal: boolean;
    containsPublicFractal: boolean;
}

export interface AtlasLinkData {
    source: string;
    target: string;
}