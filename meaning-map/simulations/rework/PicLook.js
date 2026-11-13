/**
 * PicLook - two states the picture scenes share, on top of PictureKit's .pk-pic mat.
 *   .pk-wait   a frame still waiting for its picture: dashed, no mat, so an empty slot never looks like a dark picture.
 *   .pk-q      the mark or the control that sits in the middle of a waiting frame.
 * Scenes that use it: Three Sliders family, Picture Map family, Guess the Noise, Film of a Walk, Three Seeds, Average.
 */
export const PIC_LOOK_CSS = `
.pk-pic.pk-wait { background: color-mix(in oklab, var(--sim-bg-surface) 58%, transparent); border: 3px dashed var(--sim-stroke); box-shadow: none; }
.pk-q { position: absolute; inset: 0; display: grid; place-items: center; padding: 8px; text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: clamp(26px, 9cqw, 60px); line-height: 1.2; color: var(--sim-label); }
.pk-pic { container-type: inline-size; }
`;
