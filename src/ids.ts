// The extension's ids: its slots, shortcuts and saved settings.

export const EXTENSION_ID = "magnifier-loupe";

export const DEVELOP_OVERLAY_SLOT = `${EXTENSION_ID}.develop-overlay`;
export const DEVELOP_TOOLBAR_SLOT = `${EXTENSION_ID}.develop-toolbar`;
export const LIBRARY_TOOLBAR_SLOT = `${EXTENSION_ID}.library-toolbar`;

export const TOGGLE_ACTION = `${EXTENSION_ID}.toggle`;
export const PARK_ACTION = `${EXTENSION_ID}.park`;
export const MORE_ACTION = `${EXTENSION_ID}.magnify-more`;
export const LESS_ACTION = `${EXTENSION_ID}.magnify-less`;

/** Settings keys: the last magnification and size, kept between sessions. */
export const MAGNIFICATION_KEY = "magnification";
export const DIAMETER_KEY = "diameter";
