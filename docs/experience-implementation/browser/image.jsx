export default function Image({
  fill,
  priority,
  quality,
  sizes,
  unoptimized,
  style,
  ...props
}) {
  return (
    <img
      {...props}
      style={{
        ...(fill
          ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
          : {}),
        ...style,
      }}
    />
  );
}
