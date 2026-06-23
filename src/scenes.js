// =========================================================================
// Choreography config. Each section (by data-scene) maps to a target state
// for the helix + the global scrim. Between dense content the object shrinks
// aside / recedes and dims; on showcase moments it centers and blooms. Some
// scenes lay the strand HORIZONTAL (orient ±PI/2) and the scale is pushed
// across a wide range (0.72 dense → 1.28 climactic) for rhythm.
// =========================================================================

const H = Math.PI / 2; // fully horizontal

export const SCENES = {
  // 1 — showcase: object owns the frame, right of the headline
  hero: {
    helix: { x: 2.0, y: 0, z: 0, scale: 1.0, bloom: 1.05, spin: 0.16, tilt: 0, orient: 0 },
    scrim: 0.0,
  },
  // 2 — copy LEFT → helix slides RIGHT, vertical, dims
  overview: {
    helix: { x: 3.9, y: 0, z: -1, scale: 0.78, bloom: 0.5, spin: 0.22, tilt: 0.05, orient: 0 },
    scrim: 0.55,
  },
  // 3 — logo wall → strand lies HORIZONTAL behind the grid, faint
  clients: {
    helix: { x: 0, y: 0, z: -4.5, scale: 1.08, bloom: 0.3, spin: 0.16, tilt: 0.0, orient: H },
    scrim: 0.62,
  },
  // 4 — copy RIGHT → helix slides LEFT, vertical, six callouts
  services: {
    helix: { x: -3.9, y: 0, z: -0.5, scale: 0.78, bloom: 0.45, spin: 0.2, tilt: -0.05, orient: 0 },
    scrim: 0.55,
  },
  // 5 — showcase bloom, tilted DIAGONAL, big
  midcta: {
    helix: { x: 0, y: 0, z: 1.2, scale: 1.2, bloom: 1.7, spin: 0.42, tilt: 0, orient: 0.42 },
    scrim: 0.0,
  },
  // 6 — copy LEFT → helix RIGHT, vertical
  about: {
    helix: { x: 3.7, y: 0, z: -1, scale: 0.85, bloom: 0.6, spin: 0.22, tilt: 0.06, orient: 0 },
    scrim: 0.5,
  },
  // 7 — team grid → strand HORIZONTAL, far back, very dim (opposite roll)
  team: {
    helix: { x: 0, y: -0.2, z: -5.5, scale: 1.02, bloom: 0.26, spin: 0.13, tilt: 0, orient: -H },
    scrim: 0.62,
  },
  // 8 — single testimonial → helix RIGHT, vertical
  testimonials: {
    helix: { x: 3.6, y: 0, z: -0.5, scale: 0.82, bloom: 0.62, spin: 0.2, tilt: 0.05, orient: 0 },
    scrim: 0.5,
  },
  // 8b — highlight reel → diagonal strand sweeping behind, kinetic
  reel: {
    helix: { x: 0, y: 0, z: -3.8, scale: 1.04, bloom: 0.46, spin: 0.26, tilt: 0, orient: 0.5 },
    scrim: 0.6,
  },
  // 9 — media cards → strand HORIZONTAL behind, dim
  media: {
    helix: { x: 0, y: 0, z: -4, scale: 0.98, bloom: 0.32, spin: 0.16, tilt: 0, orient: H },
    scrim: 0.6,
  },
  // 10 — blog cards → vertical, far back, dim, centered
  insights: {
    helix: { x: 0, y: 0, z: -4.6, scale: 0.95, bloom: 0.34, spin: 0.18, tilt: 0.04, orient: 0 },
    scrim: 0.6,
  },
  // 11 — climax: biggest bloom of the whole page
  finalcta: {
    helix: { x: 0, y: 0, z: 1.6, scale: 1.28, bloom: 1.95, spin: 0.46, tilt: 0, orient: 0 },
    scrim: 0.0,
  },
  // 12 — footer: small behind the wordmark
  footer: {
    helix: { x: 0, y: 0.4, z: -2.5, scale: 0.72, bloom: 0.5, spin: 0.16, tilt: 0, orient: 0 },
    scrim: 0.4,
  },
};

// Callouts latch onto accent-rung anchors (index into Helix.anchorsLocal).
export const CALLOUTS = [
  // overview — pulls three stats onto the strand
  { id: 'overview-0', scene: 'overview', anchor: 0, tag: 'Audience', text: '1M+ Profiles' },
  { id: 'overview-1', scene: 'overview', anchor: 2, tag: 'Footprint', text: '900+ Brands' },
  { id: 'overview-2', scene: 'overview', anchor: 4, tag: 'Target', text: '10× ROAS' },

  // services — one per base pair
  { id: 'services-0', scene: 'services', anchor: 0, tag: '01', text: 'Strategy' },
  { id: 'services-1', scene: 'services', anchor: 1, tag: '02', text: 'Thought Leadership' },
  { id: 'services-2', scene: 'services', anchor: 2, tag: '03', text: 'Advertising' },
  { id: 'services-3', scene: 'services', anchor: 3, tag: '04', text: 'Growth Outreach' },
  { id: 'services-4', scene: 'services', anchor: 4, tag: '05', text: 'Creative Studio' },
  { id: 'services-5', scene: 'services', anchor: 5, tag: '06', text: 'Media Placements' },
];
