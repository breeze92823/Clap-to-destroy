// The two web fonts (index.html): Fredoka for labels and numbers, Luckiest Guy
// for the big blocky titles. Canvas text painted before they load is redrawn
// once this resolves.
export const TITLE_FONT = '"Luckiest Guy", "Fredoka", "Arial Black", sans-serif'
export const titleFontReady = document.fonts?.load
  ? Promise.all([document.fonts.load('400 64px "Luckiest Guy"'), document.fonts.load('700 64px Fredoka')]).catch(() => null)
  : Promise.resolve()
