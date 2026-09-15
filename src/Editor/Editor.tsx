import { useCallback, useEffect, useRef, useState } from "react";
import { AtlasNode } from "./AtlasNode";
import { useNodesState, useEdgesState, type Connection, type Node, addEdge, ReactFlow, Background, Controls, Panel, MiniMap, useReactFlow } from "@xyflow/react";
import type { AtlasNodeData } from "./AtlasData";

type AtlasFlowNode = Node<AtlasNodeData, "atlasNode">;
import { NodeInspector } from "./NodeInspector";
import '@xyflow/react/dist/style.css'
import { AtlasBackdrop } from "./AtlasBackdrop";
import { Button, Flex, Separator } from "@radix-ui/themes";

const nodeTypes = { atlasNode: AtlasNode };
const STORAGE_KEY = 'atlas-editor-draft';

export function Editor() {
    const { screenToFlowPosition } = useReactFlow();
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const seed = (() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : { flowNodes: [], flowEdges: [] };
    })();

    const [nodes, setNodes, onNodesChange] = useNodesState<AtlasFlowNode>(seed.flowNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(seed.flowEdges);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ flowNodes: nodes, flowEdges: edges }));
    }, [nodes, edges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const updateSelectedNodeData = (data: AtlasNodeData) => {
        setNodes((nds) =>
            nds.map((n) => n.id === data.id ? { ...n, data } : n)
        );
    };

    const addNode = useCallback(
        (position: { x: number; y: number }) => {
            const id = crypto.randomUUID();
            const newNode: AtlasFlowNode = {
                id,
                type: "atlasNode",
                position,
                data: { id, x: position.x, y: position.y, label: `Node ${id}`, locked: false, collectionItem: "", tithe: "", empowermentUniques: [], points: 0, tier: 1, isUnique: false, isPenultimate: false, isWeakened: false, isEmpowered: false, isContended: false, containsHiddenFractal: false, containsPublicFractal: false },
                draggable: true
            };
            setNodes((nds) => [...nds, newNode]);
            setSelectedId(id);
        },
        [setNodes],
    );

    const handlePaneDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            if ((event.target as HTMLElement).closest('.react-flow__node')) return;
            addNode(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
        },
        [addNode, screenToFlowPosition]
    );

    const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

    const addNodeAtViewportCenter = useCallback(() => {
        const bounds = wrapperRef.current!.getBoundingClientRect()
        addNode(screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }))
    }, [addNode, screenToFlowPosition]);


    const exportAtlas = () => {
        navigator.clipboard.writeText(JSON.stringify({ nodes: nodes, links: edges }, null, 4))
        alert('Atlas JSON copied to clipboard.')
  }

    return <div style={{ display: "flex", height: "100vh" }}>
        <div style={{ flex: 1 }} ref={wrapperRef} onDoubleClick={handlePaneDoubleClick}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onPaneClick={() => setSelectedId(null)}
                colorMode="dark"
                fitView
            >
                <AtlasBackdrop src={`${import.meta.env.BASE_URL}BPLAtlas.png`} bounds={{ x0: -1000, y0: -800, x1: 1000, y1: 800 }} />
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                    <Flex gap="3" align="center">
                        <Button onClick={exportAtlas}>Export Atlas</Button>
                        <Separator orientation="vertical" />
                        <Button onClick={addNodeAtViewportCenter}>Add node</Button>
                    </Flex>
                </Panel>
            </ReactFlow>
        </div>
        {selectedNode && (
            <NodeInspector node={selectedNode} onChange={updateSelectedNodeData} onClose={() => setSelectedId(null)} />
        )}
    </div>;
}