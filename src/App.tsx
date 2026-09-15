import { ReactFlowProvider } from "@xyflow/react";
import { Editor } from "./Editor/Editor";


function App() {
  return <>
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  </>;
}

export default App
