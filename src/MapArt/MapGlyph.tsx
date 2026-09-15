import seedrandom from "seedrandom";

export default function MapGlyph(name: string, size: number = 128) {
    const random = seedrandom(name);
    const cx = size / 2;
    const top = 12;
    const bottom = size - 12;

    const lines = [];
    lines.push(`M ${cx} ${top} L ${cx} ${bottom}`);

    const branches = 3 + Math.floor(random() * 3);
    for (let i = 0; i < branches; i++) {
        const y = 25 + random() * 75;
        const side = random() < 0.5 ? -1 : 1;
        const length = 15 + random() * 30;

        const dy = (random() - 0.5) * 35;

        lines.push(`M ${cx} ${y} L ${cx + side * length} ${y + dy}`);

        if (random() < 0.35) {
            const x = cx + side * length;
            lines.push(
                `M ${x} ${y + dy} L ${x + side * 12} ${y + dy - 14}`
            );
        }
    }

    if (random() < 0.7) {
        const y = 35 + random() * 55;
        const width = 15 + random() * 25;

        lines.push(
        `M ${cx - width} ${y} L ${cx + width} ${y}`
        );
    }

    if (random() < 0.35) {
        const y = 25 + random() * 70;
        const w = 7 + random() * 7;
        const h = 10 + random() * 10;

    lines.push(`
      M ${cx} ${y - h}
      L ${cx + w} ${y}
      L ${cx} ${y + h}
      L ${cx - w} ${y}
      Z
    `);
  }

    return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${size} ${size}`}>
        <g  fill="none"
            stroke="currentColor"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round">
            {lines.map(x => <path key={x} d={x} />)}
        </g>
    </svg>;
}