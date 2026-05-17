const pngImages = import.meta.glob("../../pictures/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function getLocalStructureImageUrl(compoundId: number): string | undefined {
  const match = Object.entries(pngImages).find(([filePath]) =>
    filePath.endsWith(`/pictures/${compoundId}.png`),
  );

  return match?.[1];
}
