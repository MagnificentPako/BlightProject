import { type AtlasNodeData } from "./AtlasData";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

type AtlasNode = Node<AtlasNodeData & Record<string, unknown>, 'atlasNode'>;

export function AtlasNode({data, selected}: NodeProps<AtlasNode>) {
    return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Handle type="target" position={Position.Top}  />
        <div style={{ position: "relative", width: "49px", height: "49px", border: selected ? "2px solid blue" : "2px solid gray", borderRadius: "64px", padding: "4px"}}>
            <span style={{ 
                position: "absolute", 
                zIndex: 1, 
                color: (data.tier < 6) ? "white" 
                    : (data.tier < 11) ? "yellow" 
                                        : "red",
                fontSize: "18px", 
                textAlign: "center",
                width: "100%",
                top: "16px",
                left: "-1px",
                WebkitTextStroke: "1px black"
                }}>{data.tier}</span>
            <img src={`${import.meta.env.BASE_URL}BlankMap.png`} style={{ width: "49px", height: "49px", position: "absolute" }} />
        </div>
        <Handle type="source" position={Position.Bottom}/>
    </div>;
}