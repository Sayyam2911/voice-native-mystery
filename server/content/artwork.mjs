import manifest from '../../public/assets/case-cover-manifest.json' with { type: 'json' };

// Presentation can evolve without rewriting published case truth or active sessions.
const artwork = new Map(manifest.assets.map((asset) => [asset.caseId, asset]));

export function catalogArtwork(caseId) {
  const asset = artwork.get(caseId);
  return asset ? { src: `/assets/${asset.file}`, alt: asset.alt } : null;
}
