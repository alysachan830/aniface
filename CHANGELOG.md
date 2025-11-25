# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-11-25

### Fixed
- Fixed head-only avatar models (e.g., raccoon) moving in opposite direction when turning head
- Added proper Y and Z axis rotation mirroring for head-only models to match full-body avatar behavior

## [0.1.0] - 2025-11-23

**Note**: This version on npm has a bug with head-only avatars. Please use 0.1.1 or later.

### Added
- Initial release of Aniface
- Real-time facial tracking using MediaPipe Face Landmarker
- 3D avatar rendering with Three.js
- Automatic blendshape mapping for ARKit-compatible models
- High-level `Aniface` class for easy integration
- Low-level components for advanced usage:
  - `FacialLandmarkManager` for facial tracking
  - `AvatarRenderer` for 3D rendering
  - `Avatar` for model management
- Utility functions for blendshape retargeting and manipulation
- TypeScript support with full type definitions
- Customizable camera and lighting configurations
- Blendshape multipliers for fine-tuning expressions
- Comprehensive documentation and examples

### Features
- 52 ARKit blendshapes supported
- Real-time performance optimization
- Configurable detection and tracking confidence
- Support for GLB/GLTF models
- Camera controls (orbit, zoom)
- MediaPipe WASM files can be served from CDN or self-hosted

[0.1.1]: https://github.com/alysachan830/aniface/releases/tag/v0.1.1
[0.1.0]: https://github.com/alysachan830/aniface/releases/tag/v0.1.0

