import { useViewport } from "@xyflow/react";

export function AtlasBackdrop({
    src, 
    bounds
}: {
    src: string;
    bounds: { x0: number; y0: number; x1: number; y1: number; }
}) {
    const { x, y, zoom } = useViewport();

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
            style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${x}px, ${y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            }}
        >
            <img
            src={src}
            style={{
                position: 'absolute',
                left: bounds.x0,
                top: bounds.y0,
                width: bounds.x1 - bounds.x0,
                height: bounds.y1 - bounds.y0,
            }}
            />
        </div>
        </div>
    );
}