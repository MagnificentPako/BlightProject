import { useState } from "react"
import { useReactFlow, type Node } from "@xyflow/react"
import {
  Box,
  Flex,
  Grid,
  Text,
  TextField,
  Select,
  Checkbox,
  IconButton,
  Button,
  Separator,
  Badge,
  AlertDialog,
  ScrollArea,
} from "@radix-ui/themes"
import { Cross2Icon, LockClosedIcon, LockOpen1Icon, TrashIcon, PlusIcon } from "@radix-ui/react-icons"

import type { AtlasNodeData } from "./AtlasData"

interface NodeInspectorProps {
  node: Node<AtlasNodeData>
  onChange: (data: AtlasNodeData) => void
  onClose: () => void
}

// Small reusable section label. Sentence case, no eyebrow styling -
// it's information (what this group of fields is), not decoration.
function SectionLabel({ children }: { children: string }) {
  return (
    <Text as="div" size="2" weight="medium" mb="1">
      {children}
    </Text>
  )
}

export function NodeInspector({ node, onChange, onClose }: NodeInspectorProps) {
  const { setNodes, deleteElements } = useReactFlow()
  const [uniqueDraft, setUniqueDraft] = useState("")
  const data = node.data

  const update = <K extends keyof AtlasNodeData>(key: K, value: AtlasNodeData[K]) => {
    onChange({ ...data, [key]: value })
  }

  const toggleLock = () => {
    const locked = !data.locked
    setNodes((nds) =>
      nds.map((n) => (n.id === node.id ? { ...n, draggable: !locked, data: { ...n.data, locked } } : n)),
    )
  }

  const addUnique = () => {
    if (!uniqueDraft.trim()) return
    update("empowermentUniques", [...data.empowermentUniques, uniqueDraft.trim()])
    setUniqueDraft("")
  }

  const removeUnique = (index: number) => {
    update(
      "empowermentUniques",
      data.empowermentUniques.filter((_, i) => i !== index),
    )
  }

  const handleDelete = () => {
    deleteElements({ nodes: [{ id: node.id }] })
    onClose()
  }

  return (
    <Box width="300px" style={{ background: "var(--color-panel-solid)", height: "100%" }}>
      <ScrollArea style={{ height: "100%" }}>
        <Flex direction="column" gap="4" p="4">
          {/* Header: name, id, lock, close */}
          <Flex justify="between" align="start">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                value={data.label}
                onChange={(e) => update("label", e.target.value)}
                placeholder="Node name"
                size="3"
              />
              <Text as="div" size="1" color="gray" mt="1" style={{ fontFamily: "var(--code-font-family)" }}>
                {data.id}
              </Text>
            </Box>
            <Flex gap="1" ml="2">
              <IconButton
                variant="soft"
                color={data.locked ? "amber" : "gray"}
                onClick={toggleLock}
                aria-label={data.locked ? "Unlock position" : "Lock position"}
              >
                {data.locked ? <LockClosedIcon /> : <LockOpen1Icon />}
              </IconButton>
              <IconButton variant="soft" color="gray" onClick={onClose} aria-label="Close">
                <Cross2Icon />
              </IconButton>
            </Flex>
          </Flex>

          <Separator size="4" />

          {/* Progression */}
          <Box>
            <SectionLabel>Progression</SectionLabel>
            <Grid columns="2" gap="3">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Tier</Text>
                {/* Assumes tiers 1-5 - adjust the option list if your range differs */}
                <Select.Root value={String(data.tier)} onValueChange={(v) => update("tier", Number(v))}>
                  <Select.Trigger />
                  <Select.Content>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((t) => (
                      <Select.Item key={t} value={String(t)}>
                        Tier {t}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Points</Text>
                <TextField.Root
                  type="number"
                  value={data.points}
                  onChange={(e) => update("points", Number(e.target.value))}
                />
              </Flex>
            </Grid>
          </Box>

          <Separator size="4" />

          {/* Rewards */}
          <Box>
            <SectionLabel>Rewards</SectionLabel>
            <Flex direction="column" gap="2">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Collection item</Text>
                <TextField.Root
                  value={data.collectionItem}
                  onChange={(e) => update("collectionItem", e.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Tithe</Text>
                <TextField.Root value={data.tithe} onChange={(e) => update("tithe", e.target.value)} />
              </Flex>
            </Flex>
          </Box>

          <Separator size="4" />

          {/* Status modifiers */}
          <Box>
            <SectionLabel>Status</SectionLabel>
            <Grid columns="2" gap="2">
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox checked={data.isUnique} onCheckedChange={(v) => update("isUnique", !!v)} />
                  Unique
                </Text>
              </Flex>
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox
                    checked={data.isPenultimate}
                    onCheckedChange={(v) => update("isPenultimate", !!v)}
                  />
                  Penultimate
                </Text>
              </Flex>
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox checked={data.isWeakened} onCheckedChange={(v) => update("isWeakened", !!v)} />
                  Weakened
                </Text>
              </Flex>
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox
                    checked={data.isEmpowered}
                    onCheckedChange={(v) => update("isEmpowered", !!v)}
                  />
                  Empowered
                </Text>
              </Flex>
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox
                    checked={data.isContended}
                    onCheckedChange={(v) => update("isContended", !!v)}
                  />
                  Contended
                </Text>
              </Flex>
            </Grid>
          </Box>

          {/* Empowerment uniques - only relevant once the node is actually
              marked Empowered, so it stays out of the way otherwise. */}
          {data.isEmpowered && (
            <>
              <Separator size="4" />
              <Box>
                <SectionLabel>Empowerment uniques</SectionLabel>
                <Flex gap="2" wrap="wrap" mb="2">
                  {data.empowermentUniques.map((unique, i) => (
                    <Badge key={`${unique}-${i}`} variant="soft" size="2">
                      <Flex align="center" gap="1">
                        {unique}
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="gray"
                          onClick={() => removeUnique(i)}
                          aria-label={`Remove ${unique}`}
                        >
                          <Cross2Icon width="10" height="10" />
                        </IconButton>
                      </Flex>
                    </Badge>
                  ))}
                </Flex>
                <Flex gap="2">
                  <TextField.Root
                    style={{ flex: 1 }}
                    placeholder="Unique item name"
                    value={uniqueDraft}
                    onChange={(e) => setUniqueDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addUnique()}
                  />
                  <IconButton variant="soft" onClick={addUnique} aria-label="Add unique">
                    <PlusIcon />
                  </IconButton>
                </Flex>
              </Box>
            </>
          )}

          <Separator size="4" />

          {/* Fractals */}
          <Box>
            <SectionLabel>Fractals</SectionLabel>
            <Flex direction="column" gap="2">
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox
                    checked={data.containsHiddenFractal}
                    onCheckedChange={(v) => update("containsHiddenFractal", !!v)}
                  />
                  Contains hidden fractal
                </Text>
              </Flex>
              <Flex asChild gap="2" align="center">
                <Text as="label" size="2">
                  <Checkbox
                    checked={data.containsPublicFractal}
                    onCheckedChange={(v) => update("containsPublicFractal", !!v)}
                  />
                  Contains public fractal
                </Text>
              </Flex>
            </Flex>
          </Box>

          <Separator size="4" />

          {/* Delete, with a confirmation step since there's no undo */}
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button color="red" variant="soft">
                <TrashIcon />
                Delete node
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="400px">
              <AlertDialog.Title>Delete {data.label}?</AlertDialog.Title>
              <AlertDialog.Description size="2">
                This also removes any connections to and from this node. This can't be undone.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button color="red" onClick={handleDelete}>
                    Delete node
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </ScrollArea>
    </Box>
  )
}