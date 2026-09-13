interface GridLayerProps {
  width: number;
  height: number;
  size: number;
  color: string;
}

export function GridLayer({ width, height, size, color }: GridLayerProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        width,
        height,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
