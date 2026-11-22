# Magnifier Loupe

A Safelight extension that puts a round magnifier over the Develop photo or the Library grid. It follows the pointer and shows the area under it at 100, 200, 400 or 800 %, so you can check focus and fine detail without zooming the whole view.

## Using it

- Press the backtick key (**`**), or click **Loupe** in the Develop status bar or the Library toolbar, to turn the loupe on or off.
- It follows the pointer while the pointer is over the photo, and hides everywhere else.
- **Alt+wheel**, or **Alt+=** and **Alt+-**, change the magnification. **Shift+wheel** makes the loupe larger or smaller, from 120 to 480 px. The loupe keeps the magnification and size you left it at. On a high-density screen at 100 % in Develop it stays a little smaller, so one patch of the photo fills it.
- **Shift+backtick** parks the loupe where it is, so it stays put while you move the pointer. Drag its ring to move it, and press **Shift+backtick** again to have it follow the pointer.
- Change the shortcuts in **Preferences ▸ Shortcuts**.

Apart from the ring of a parked loupe, the loupe never takes a click, a pan or a zoom: everything you do on the photo works as it would without it. The plain wheel still scrolls the grid and zooms Develop, and Ctrl+wheel still zooms.

## What it shows

**In Develop** the loupe shows your edit at the photo's own pixels, whatever the view's zoom: at fit view, 100 % in the loupe is the same as zooming Develop to 100 %. It isn't an enlargement of what is on screen. Safelight draws just the small patch under the loupe for it, so the view itself is left alone. The patch is drawn as the canvas shows it, with the clipping warning and mask overlay if they are on. With a before/after comparison on, the loupe still shows your edit (the after), on either side of the split.

The pixels it enlarges are the ones Develop works with, which is at most the **Develop render resolution** in Preferences ▸ Performance. With **Dynamic** render resolution, the loupe counts the photo's own pixels as Develop's zoom does, so 100 % is still Develop's 100 %. Develop sharpens its zoomed-in view from the original file a moment after you stop; the loupe doesn't, so on a large RAW it is a little softer than Develop's own 100 %.

**In the Library** the loupe enlarges the grid preview of the photo under it: the same picture the grid shows, about 768 px on its long edge. It shows at once and never decodes a photo, which keeps the grid quick. The magnification counts the preview's pixels, so it shows the composition and rough sharpness; check critical focus in Develop.

Both follow your screen's scaling and the interface scale in Preferences, and are drawn at your screen's own pixels. From 200 % up, pixels are drawn as squares, so you see the photo's own pixels rather than a blur of them.

Needs Safelight 3.2.7 or later.

## Licence

GPL-3.0-or-later. See `LICENSE`.
