# Utilities Mobile & Web Application Documentation

## Executive Summary

**Utilities** is a modern, cross-platform mobile and web application built with **Angular 20**, **Ionic 8**, and **Capacitor 8**. Designed with user privacy and performance in mind, the application delivers a comprehensive suite of client-side document and image manipulation tools. All processing—including AES-256 PDF encryption, MLKit-powered document scanning, image compression, cropping, and multi-format conversions—executes entirely locally on the user's device or browser without external server dependencies.

---

## Architecture & Core Technologies

The project is structured around Angular Standalone Components and Ionic UI elements, wrapped in Capacitor for seamless native Android and iOS integration.

```
+-----------------------------------------------------------------------+
|                         Angular 20 Standalone                         |
|                 Ionic 8 UI Components (IonContent, etc.)              |
+-----------------------------------+-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|     PDF Utilities     |                       |    Image Utilities    |
|  (PdfUtilityComponent)|                       | (ImageUtilityComponent|
+-----------------------+                       +-----------------------+
| - Rich Text PDF Maker |                       | - Image Compression   |
| - MLKit Doc Scanner   |                       | - Preset/Custom Resize|
| - Wasm QPDF Encrypt   |                       | - Interactive Cropping|
| - Wasm QPDF Decrypt   |                       | - Multi-Format Convert|
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                    Capacitor 8 Cross-Platform Runtime                 |
|       Filesystem (Documents/Utilities) | Share | App Back Button      |
+-----------------------------------------------------------------------+
```

### Key Highlights
- **100% Client-Side Processing**: Heavy tasks like cryptography and image algorithms run via Web Workers, WebAssembly (`qpdf-wasm`), and native device APIs.
- **Cross-Platform Delivery**: Functions as a Progressive Web App (PWA) in standard browsers and compiles into a native Android application via Capacitor.
- **Native OS Integration**: Features custom Android back-button handling (double-tap to exit on Home screen), direct file saving to device Documents, and native system share sheets.

---

## Core Modules & Features

### 1. PDF Utilities (`PdfUtilityComponent`)
Located in [src/app/home/pdf-utility.component.ts](file:///home/manikandanvd/personal-projects/utilities/src/app/home/pdf-utility.component.ts), this module divides into four specialized workflows:

#### A. Rich Text PDF Creator
- **Visual Editor**: Custom DOM-based editing area supporting text formatting (Bold, Italic, Underline), heading hierarchies (`<h1>`, `<h2>`), bulleted lists (`<li>`), and inline image insertion.
- **Tokenized Layout Engine**: Parses the live DOM tree into linear stylistic tokens, automatically calculating text wrapping, line heights, page breaks, and embedded image scaling using `jspdf`.

#### B. MLKit Document Scanner
- **Native Camera Integration**: Integrates `@capacitor-mlkit/document-scanner` to capture multi-page documents directly from the device camera or photo gallery with automatic edge detection and perspective correction.
- **Page Management & PDF Compilation**: Allows users to review, reorder, or delete scanned pages before compiling them into a centered, high-performance A4 PDF document. Includes seamless web fallbacks for browser environments.

#### C. PDF Encryption (AES-256)
- **WebAssembly Security**: Uses `@neslinesli93/qpdf-wasm` (`qpdf`) to apply military-grade AES-256 encryption to user-provided PDF files with custom passwords.
- **Zero-Data Leakage**: Files are processed in-memory within a virtual filesystem (`qpdf.FS`), ensuring sensitive documents never leave the device.

#### D. PDF Decryption & Protection Analysis
- **Protection Verification**: Automatically checks if selected PDFs require a password (`--requires-password` flag inspection) and provides immediate user feedback.
- **Unlocking**: Removes user and owner passwords from protected PDFs locally, generating clean, unencrypted output files.

---

### 2. Image Utilities (`ImageUtilityComponent`)
Located in [src/app/image-utility/image-utility.component.ts](file:///home/manikandanvd/personal-projects/utilities/src/app/image-utility/image-utility.component.ts), this module provides a 4-in-1 image processing workbench:

#### A. Image Compression
- **Smart Sizing**: Powered by `browser-image-compression`, allowing users to define precise target file sizes in Kilobytes (e.g., compress a 5 MB photo down to 500 KB).
- **Web Worker Execution**: Compresses images asynchronously without freezing the user interface, supporting output type selection (`AUTO`, `JPEG`, `PNG`, `WEBP`).

#### B. Image Resizing
- **Preset & Custom Resolutions**: Includes quick-select standard aspect ratios (`1920x1080`, `1280x720`, `800x600`, `640x480`) alongside custom width/height input fields.
- **Aspect Ratio Locking**: Features a reactive aspect ratio lock (`maintainAspectRatio`) that dynamically recomputes height when width is adjusted and vice versa using HTML5 Canvas rendering.

#### C. Interactive Cropping
- **Visual Manipulation**: Powered by `cropperjs`, presenting an interactive canvas with crop boxes, grid guides, mouse/touch dragging, and zoom controls.
- **Lossless Export**: Extracts cropped regions at 95% quality to user-selected file formats.

#### D. Multi-Format Converter
- **Universal Format Support**: Converts images between standard and specialized formats:
  - `JPEG (.jpg)` & `PNG (.png)`
  - `WEBP (.webp)` & `AVIF (.avif)`
  - `GIF (.gif)` & `TIFF (.tiff)`
  - `SVG (.svg)` (embeds raster image data within scalable vector wrappers)
- **Custom Binary Encoders**:
  - **BMP (`image/bmp`)**: Features a custom binary device-independent bitmap header generator (`convertToBmp`) for legacy Windows compatibility.
  - **ICO (`image/x-icon`)**: Implements an inline icon directory wrapper (`convertToIco`) to package PNG buffers into standard favicon/Windows icon containers.
- **Alpha Channel Handling**: Automatically fills transparent areas with solid white backgrounds when converting PNG/WEBP files to non-transparent formats like JPEG or BMP.

---

### 3. Standalone Web Toolbox (`pdf-utility.html`)
Located in [src/pdf-utility.html](file:///home/manikandanvd/personal-projects/utilities/src/pdf-utility.html), this standalone HTML/JS document serves as a lightweight, browser-only fallback utility:
- Demonstrates pure JavaScript PDF generation via `jspdf`.
- Implements browser-based PDF encryption and decryption using `pdf-lib` without Angular or Capacitor runtime requirements.

---

## Platform & Native Capabilities

### Android & iOS (Capacitor Runtime)
- **Persistent Storage**: Output files are saved directly into the device's public `Documents/Utilities/` directory using `@capacitor/filesystem`. If document permissions are restricted, the app seamlessly falls back to device `Cache` storage.
- **Native Share Dialogs**: Once a document or image is processed and saved, the app invokes `@capacitor/share` to open the OS-level share sheet, allowing users to instantly send files via email, messaging apps, or cloud storage.
- **Navigation Control**: Implements custom Hardware Back Button listeners in [AppComponent](file:///home/manikandanvd/personal-projects/utilities/src/app/app.component.ts), preventing accidental exits and prompting users to press back twice within 2 seconds to close the application from the home screen.

### Web Browser Runtime
- When run as a web application (`ng serve`), filesystem and native share calls gracefully fall back to standard browser Blob download anchors (`URL.createObjectURL`), ensuring full compatibility across Chrome, Safari, Firefox, and Edge.

---

## Technology Stack & Dependencies

| Category | Package / Library | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | `@angular/core` | `^20.3.25` | Standalone UI architecture & routing |
| **UI Library** | `@ionic/angular` | `^8.0.0` | Mobile-optimized UI components & gestures |
| **Cross-Platform** | `@capacitor/core` & plugins | `^8.0.0` | Native OS filesystem, sharing, and app lifecycle |
| **PDF Security** | `@neslinesli93/qpdf-wasm` | `^0.3.0` | Client-side WebAssembly AES-256 encryption/decryption |
| **PDF Generation** | `jspdf` | `^4.2.1` | Multi-page document and layout creation |
| **PDF Manipulation**| `pdf-lib` | `^1.17.1` | Standalone PDF document editing & structuring |
| **Doc Scanning** | `@capacitor-mlkit/document-scanner`| `^8.1.0` | Camera document edge detection and cropping |
| **Image Cropping** | `cropperjs` | `^1.6.1` | Interactive canvas cropping and zooming |
| **Compression** | `browser-image-compression`| `^2.0.2` | Web Worker image size reduction |
| **Icons** | `ionicons` | `^7.0.0` | SVG iconography across all utility cards |

---

## Project Directory Structure

```
utilities/
├── android/                   # Native Android Studio project configuration
├── src/
│   ├── app/
│   │   ├── home/              # Landing page & PDF utilities
│   │   │   ├── home.component.ts / .html / .css
│   │   │   └── pdf-utility.component.ts / .html / .css
│   │   ├── image-utility/     # Image processing suite
│   │   │   └── image-utility.component.ts / .html / .css
│   │   ├── app.component.ts   # Root app component & hardware back button logic
│   │   └── app.routes.ts      # Application routing table
│   ├── assets/                # Static images, icons, and branding assets
│   ├── environments/          # Build environment configurations (dev / prod)
│   ├── theme/                 # Ionic global styling and color palette variables
│   ├── global.scss            # App-wide SCSS styling rules
│   ├── index.html             # Web entry point
│   ├── main.ts                # Angular bootstrap configuration
│   └── pdf-utility.html       # Standalone HTML/JS fallback toolbox
├── capacitor.config.ts        # Capacitor native runtime settings
├── package.json               # NPM dependency management & build scripts
└── APP_DOCUMENT.md            # Comprehensive project technical documentation
```

---

## Development & Build Guide

### 1. Local Development (Web)
To start the development server with live reload:
```bash
npm install
npm run start
# OR using Ionic CLI
npm run ionic:serve
```

### 2. Production Build (Web PWA)
To compile the application into optimized static bundles:
```bash
npm run build
```

### 3. Native Android Development
To sync web build artifacts with the native Android project and launch Android Studio:
```bash
# Build the web assets first
npm run build

# Sync web assets and plugins to Android directory
npx cap sync android

# Open project in Android Studio
npx cap open android
```
