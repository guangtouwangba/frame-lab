# Camera / lens simulation — specifications and limits

Verified against manufacturer specifications on 2026-09-06. Product names identify
equipment only; this project is independent and not endorsed by the manufacturers.

## Bodies

| Body | Sensor mm | Mount | Official source |
| --- | --- | --- | --- |
| Sony α7 IV | 35.9 × 23.9 | E | https://www.sony.com/electronics/support/e-mount-body-ilce-7m4-series/ilce-7m4/specifications |
| Sony α6700 | 23.3 × 15.5 | E | https://www.sony.com/electronics/support/e-mount-body-ilce-6000-series/ilce-6700/specifications |
| Fujifilm X-T5 | 23.5 × 15.7 | X | https://www.fujifilm-x.com/en-gb/products/cameras/x-t5/specifications/ |

## Lenses

| Lens | Focal mm | f-number range | Minimum focus m | Official source |
| --- | --- | --- | --- | --- |
| Sony FE 85 mm F1.8 | 85 | 1.8–22 | 0.80 | https://www.sony.co.uk/electronics/camera-lenses/sel85f18/specifications |
| Sony FE 35 mm F1.8 | 35 | 1.8–22 | 0.22 | https://www.sony.com/electronics/support/lenses-e-mount-lenses/sel35f18f/specifications |
| Sony FE 24–105 mm F4 G OSS | 24–105 | 4–22 | 0.38 | https://www.sony.com/electronics/support/lenses-e-mount-lenses/sel24105g/specifications |
| Fujifilm XF 56 mm F1.2 R WR | 56 | 1.2–16 | 0.50 | https://www.fujifilm-x.com/zh-cn/products/lenses/xf56mmf12-r-wr/specifications/ |
| Fujifilm XF 35 mm F1.4 R | 35 | 1.4–16 | 0.28 | https://www.fujifilm-x.com/en-gb/products/lenses/xf35mmf14-r/specifications/ |

The XF35 minimum includes the close-focus range. Aperture controls interpolate
continuously for teaching rather than reproducing each physical click-stop.

## What is modeled

- Sensor rectangle is rotated for portrait orientation, then **cropped within**
  its physical bounds for the selected output aspect ratio. Square never creates
  an imaginary 36 × 36 mm sensor. FOV = 2 atan(active gate / 2 focal length).
- Position controls perspective. Switching a body/lens holds position; scene-shot
  buttons explicitly move the camera to recover approximate framing.
- Only native compatible lenses are offered. Prime focal length is locked; zoom
  range, aperture range and minimum focus distance are constrained.
- Thin-lens CoC drives a depth-buffer blur in the same sensor units. DoF readout
  uses active gate diagonal / 1500 as a conventional equal-output viewing criterion,
  not a sensor pixel-pitch threshold. Blur radius is capped for interactive speed.
- The crop-factor/equivalent-focal readout uses the full sensor diagonal relative
  to 36 × 24 mm, **before** any chosen output crop.
- Face AF focuses at the face's camera-space depth, bounded by the selected
  minimum focus distance. If the face is closer than that limit, it stays blurred.

## Important limits / 不是实机画质评测

This is geometric/optical teaching, not a digital twin of an actual camera.
Perspective is a pinhole projection at nominal focal length. Focus breathing,
principal-plane shifts, distortion, chromatic aberration, vignetting, PSF/MTF,
diffraction, autofocus performance, stabilization, shutter motion blur, sensor
noise, demosaicing, manufacturer color science / film simulations and skin
subsurface scattering are **not** simulated. Near macro distances are especially
approximate. Soft shadows use a filter, not physical area-light integration.

Preview behaves like compensated automatic exposure: aperture changes DoF only;
EV sets scene brightness. Light power is relative, not photometrically calibrated.
All cameras export the same 1600-pixel long-edge rendered PNG, not their native
megapixel resolution, RAW or camera JPEG. PNGs have no camera EXIF claim.

Existing v1 setups remain importable in the free camera/lens mode when equipment
IDs are absent. Output crops now respect a real 36 × 24 rectangle, so old square
setups can frame differently. Setup JSON and saved-photo state include the body,
lens, portrait, environment and all controls.
