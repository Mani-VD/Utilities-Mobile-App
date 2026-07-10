import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, 
  IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
  IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonIcon, IonSpinner, IonRange,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { contractOutline, resizeOutline, cropOutline, swapHorizontalOutline, imagesOutline, colorFilterOutline, refreshOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Cropper from 'cropperjs';
import imageCompression from 'browser-image-compression';

@Component({
  selector: 'app-image-utility',
  templateUrl: './image-utility.component.html',
  styleUrls: ['./image-utility.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, 
    IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
    IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonIcon, IonSpinner, IonRange
  ]
})
export class ImageUtilityComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cropperImage') cropperImage!: ElementRef<HTMLImageElement>;
  
  activeMode: 'compress' | 'resize' | 'crop' | 'convert' | 'filter' = 'compress';

  // Filters & Color Tuning
  filterBrightness: number = 100;
  filterContrast: number = 100;
  filterSaturation: number = 100;
  filterGrayscale: number = 0;
  filterSepia: number = 0;
  filterBlur: number = 0;
  activePreset: string = 'Normal';
  
  selectedFile: File | null = null;
  imageSrc: string | null = null;
  
  // Settings
  outputFormat: string = 'auto'; // 'auto' | 'image/jpeg' | 'image/png' | 'image/webp'
  convertTargetFormat: string = 'image/jpeg';
  
  // Compress
  targetSizeKB: number = 500;
  
  // Resize
  resizeMode: 'preset' | 'custom' = 'preset';
  presetWidth: number = 1920;
  presetHeight: number = 1080;
  customWidth: number = 1920;
  customHeight: number = 1080;
  maintainAspectRatio: boolean = true;
  originalWidth: number = 0;
  originalHeight: number = 0;
  
  // Cropper
  cropper: Cropper | null = null;

  isProcessing = false;
  processingMessage = '';

  constructor(private toastController: ToastController, private loadingController: LoadingController) {
    addIcons({ contractOutline, resizeOutline, cropOutline, swapHorizontalOutline, imagesOutline, colorFilterOutline, refreshOutline });
  }

  private async showLoading(message: string) {
    this.isProcessing = true;
    this.processingMessage = message;
    const loading = await this.loadingController.create({
      message: message,
      spinner: 'circles'
    });
    await loading.present();
    return loading;
  }

  private async dismissLoading(loading: any) {
    this.isProcessing = false;
    this.processingMessage = '';
    if (loading) {
      try {
        await loading.dismiss();
      } catch (e) {
        // Already dismissed
      }
    }
  }

  getCurrentFormatDisplay(): string {
    if (!this.selectedFile) return 'None';
    const type = this.selectedFile.type || 'Unknown';
    const map: any = {
      'image/jpeg': 'JPEG (.jpg)',
      'image/jpg': 'JPEG (.jpg)',
      'image/png': 'PNG (.png)',
      'image/webp': 'WEBP (.webp)',
      'image/gif': 'GIF (.gif)',
      'image/bmp': 'BMP (.bmp)',
      'image/avif': 'AVIF (.avif)',
      'image/x-icon': 'ICO (.ico)',
      'image/svg+xml': 'SVG (.svg)',
      'image/tiff': 'TIFF (.tiff)'
    };
    return map[type.toLowerCase()] || type;
  }

  getActionLabel(): string {
    switch(this.activeMode) {
      case 'compress': return 'Compress & Download';
      case 'resize': return 'Resize & Download';
      case 'crop': return 'Crop & Download';
      case 'convert': return 'Convert & Download';
      case 'filter': return 'Apply Filters & Download';
      default: return 'Process & Download';
    }
  }

  ngAfterViewInit() {
    // If cropper is active and image exists, initialize
  }

  ngOnDestroy() {
    if (this.cropper) {
      this.cropper.destroy();
    }
  }

  fileInputClick() {
    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  getPresetHeight(width: number): number {
    // Basic standard aspect ratios
    switch(Number(width)) {
      case 1920: return 1080;
      case 1280: return 720;
      case 800: return 600;
      case 640: return 480;
      default: return 1080;
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      const loading = await this.showLoading('Loading image...');
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e: any) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        this.imageSrc = dataUrl;
        await this.loadOriginalDimensions();
        if (this.activeMode === 'crop') {
          setTimeout(() => this.initCropper(), 100);
        }
      } catch (err) {
        console.error('Error loading file:', err);
        await this.showToast('Failed to load image.', 'danger');
      } finally {
        await this.dismissLoading(loading);
      }
    }
  }

  loadOriginalDimensions(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.imageSrc) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        if (this.maintainAspectRatio) {
          this.customWidth = img.width;
          this.customHeight = img.height;
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = this.imageSrc;
    });
  }

  setActiveMode(mode: 'compress' | 'resize' | 'crop' | 'convert' | 'filter') {
    this.activeMode = mode;
    if (this.activeMode === 'crop') {
      setTimeout(() => this.initCropper(), 100);
    } else {
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
    }
  }

  onModeChange(event: any) {
    this.activeMode = event.detail.value;
    if (this.activeMode === 'crop') {
      setTimeout(() => this.initCropper(), 100);
    } else {
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
    }
  }

  initCropper() {
    if (!this.cropperImage || !this.cropperImage.nativeElement) return;
    if (this.cropper) {
      this.cropper.destroy();
    }
    this.cropper = new Cropper(this.cropperImage.nativeElement, {
      viewMode: 1,
      dragMode: 'crop',
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      wheelZoomRatio: 0.5
    });
  }

  getOutputMimeType(): string {
    if (this.outputFormat === 'auto') {
      return this.selectedFile?.type || 'image/jpeg';
    }
    return this.outputFormat;
  }

  getOutputExtension(mimeType: string): string {
    const map: any = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/avif': 'avif',
      'image/x-icon': 'ico',
      'image/svg+xml': 'svg',
      'image/tiff': 'tiff'
    };
    return map[mimeType] || 'jpg';
  }

  async processImage() {
    if (!this.selectedFile || !this.imageSrc) return;

    let message = 'Processing image...';
    switch (this.activeMode) {
      case 'compress': message = 'Compressing image...'; break;
      case 'resize': message = 'Resizing image...'; break;
      case 'crop': message = 'Cropping image...'; break;
      case 'convert': message = 'Converting image...'; break;
      case 'filter': message = 'Applying photo filters...'; break;
    }

    const loading = await this.showLoading(message);

    const mimeType = this.activeMode === 'convert' ? this.convertTargetFormat : this.getOutputMimeType();
    let resultBlob: Blob | null = null;

    try {
      if (this.activeMode === 'compress') {
        const options = {
          maxSizeMB: this.targetSizeKB / 1024,
          useWebWorker: true,
          fileType: mimeType
        };
        resultBlob = await imageCompression(this.selectedFile, options);
      } else if (this.activeMode === 'resize') {
        let targetW = this.resizeMode === 'preset' ? this.presetWidth : this.customWidth;
        let targetH = this.resizeMode === 'preset' ? this.presetHeight : this.customHeight;
        resultBlob = await this.resizeCanvas(this.imageSrc, targetW, targetH, mimeType);
      } else if (this.activeMode === 'crop') {
        if (this.cropper) {
          const canvas = this.cropper.getCroppedCanvas();
          resultBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b: Blob | null) => resolve(b), mimeType, 0.95);
          });
        }
      } else if (this.activeMode === 'convert') {
        resultBlob = await this.convertImageFormat(this.imageSrc, this.originalWidth, this.originalHeight, mimeType);
      } else if (this.activeMode === 'filter') {
        resultBlob = await this.applyFiltersCanvas(this.imageSrc, this.originalWidth, this.originalHeight, mimeType);
      }

      if (resultBlob) {
        await this.downloadBlob(resultBlob, mimeType, loading);
      }
    } catch (error) {
      console.error('Processing error:', error);
      await this.showToast('An error occurred during image processing.', 'danger');
    } finally {
      await this.dismissLoading(loading);
    }
  }

  resizeCanvas(src: string, width: number, height: number, mimeType: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), mimeType, 0.95);
        } else {
          resolve(null);
        }
       };
      img.src = src;
    });
  }

  applyFiltersCanvas(src: string, width: number, height: number, mimeType: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width || img.width;
        canvas.height = height || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = this.getFilterCss();
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), mimeType, 0.95);
        } else {
          resolve(null);
        }
      };
      img.src = src;
    });
  }

  applyPresetFilter(preset: string) {
    this.activePreset = preset;
    switch (preset) {
      case 'Normal':
        this.resetFilters();
        break;
      case 'Vibrant':
        this.filterBrightness = 110;
        this.filterContrast = 125;
        this.filterSaturation = 145;
        this.filterGrayscale = 0;
        this.filterSepia = 0;
        this.filterBlur = 0;
        break;
      case 'Vintage':
        this.filterBrightness = 95;
        this.filterContrast = 110;
        this.filterSaturation = 85;
        this.filterGrayscale = 0;
        this.filterSepia = 65;
        this.filterBlur = 0;
        break;
      case 'Noir':
        this.filterBrightness = 105;
        this.filterContrast = 135;
        this.filterSaturation = 100;
        this.filterGrayscale = 100;
        this.filterSepia = 0;
        this.filterBlur = 0;
        break;
      case 'Warm Glow':
        this.filterBrightness = 105;
        this.filterContrast = 105;
        this.filterSaturation = 125;
        this.filterGrayscale = 0;
        this.filterSepia = 25;
        this.filterBlur = 0;
        break;
      case 'Cool Crisp':
        this.filterBrightness = 105;
        this.filterContrast = 120;
        this.filterSaturation = 110;
        this.filterGrayscale = 0;
        this.filterSepia = 0;
        this.filterBlur = 0;
        break;
    }
  }

  resetFilters() {
    this.filterBrightness = 100;
    this.filterContrast = 100;
    this.filterSaturation = 100;
    this.filterGrayscale = 0;
    this.filterSepia = 0;
    this.filterBlur = 0;
    this.activePreset = 'Normal';
  }

  onFilterChange() {
    this.activePreset = 'Custom';
  }

  getFilterCss(): string {
    return `brightness(${this.filterBrightness}%) contrast(${this.filterContrast}%) saturate(${this.filterSaturation}%) grayscale(${this.filterGrayscale}%) sepia(${this.filterSepia}%) blur(${this.filterBlur}px)`;
  }

  async convertImageFormat(src: string, width: number, height: number, mimeType: string): Promise<Blob | null> {
    return new Promise(async (resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = width || img.width;
        canvas.height = height || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Fill white background for formats that don't support transparency
        if (mimeType === 'image/jpeg' || mimeType === 'image/bmp') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (mimeType === 'image/bmp') {
          resolve(this.convertToBmp(canvas));
        } else if (mimeType === 'image/x-icon') {
          try {
            const icoBlob = await this.convertToIco(canvas);
            resolve(icoBlob);
          } catch (e) {
            console.error('ICO conversion error:', e);
            resolve(null);
          }
        } else if (mimeType === 'image/svg+xml') {
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${src}" width="100%" height="100%"/></svg>`;
          resolve(new Blob([svgString], { type: 'image/svg+xml' }));
        } else {
          canvas.toBlob((blob) => {
            if (blob) {
              if (blob.type !== mimeType) {
                resolve(new Blob([blob], { type: mimeType }));
              } else {
                resolve(blob);
              }
            } else {
              resolve(null);
            }
          }, mimeType, 0.95);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  convertToBmp(canvas: HTMLCanvasElement): Blob {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const rowSize = (width * 3 + 3) & ~3;
    const fileSize = 54 + rowSize * height;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    view.setUint16(0, 0x4D42, false);
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, 54, true);

    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, rowSize * height, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    let offset = 54;
    const padding = rowSize - width * 3;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        view.setUint8(offset++, b);
        view.setUint8(offset++, g);
        view.setUint8(offset++, r);
      }
      for (let p = 0; p < padding; p++) {
        view.setUint8(offset++, 0);
      }
    }

    return new Blob([buffer], { type: 'image/bmp' });
  }

  async convertToIco(canvas: HTMLCanvasElement): Promise<Blob> {
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('Failed to create PNG for ICO conversion');
    
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngSize = pngBuffer.byteLength;
    
    const icoBuffer = new ArrayBuffer(22 + pngSize);
    const view = new DataView(icoBuffer);
    
    const width = canvas.width >= 256 ? 0 : canvas.width;
    const height = canvas.height >= 256 ? 0 : canvas.height;
    
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, 1, true);
    
    view.setUint8(6, width);
    view.setUint8(7, height);
    view.setUint8(8, 0);
    view.setUint8(9, 0);
    view.setUint16(10, 1, true);
    view.setUint16(12, 32, true);
    view.setUint32(14, pngSize, true);
    view.setUint32(18, 22, true);
    
    const destArray = new Uint8Array(icoBuffer, 22);
    destArray.set(new Uint8Array(pngBuffer));
    
    return new Blob([icoBuffer], { type: 'image/x-icon' });
  }

  async downloadBlob(blob: Blob, mimeType: string, loading?: any) {
    const ext = this.getOutputExtension(mimeType);
    const originalName = this.selectedFile?.name || 'image';
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const newName = `${nameWithoutExt}-${this.activeMode}.${ext}`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        let base64Data = await this.convertBlobToBase64(blob) as string;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        let fileUri = '';
        try {
          await Filesystem.mkdir({
            path: 'Utilities',
            directory: Directory.Documents,
            recursive: true
          });
        } catch (e) {
          // Ignore if exists
        }

        try {
          const writeRes = await Filesystem.writeFile({
            path: `Utilities/${newName}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          fileUri = writeRes.uri;
          await this.showToast(`Saved to Documents/Utilities/${newName}`);
        } catch (docErr) {
          console.warn('Could not write to Documents, falling back to Cache/Data directory for Android compatibility', docErr);
          const writeRes = await Filesystem.writeFile({
            path: newName,
            data: base64Data,
            directory: Directory.Cache
          });
          fileUri = writeRes.uri;
          await this.showToast(`Saved image on device.`);
        }

        if (loading) {
          await this.dismissLoading(loading);
        }

        if (fileUri) {
          try {
            await Share.share({
              title: newName,
              text: `Here is your converted image: ${newName}`,
              url: fileUri,
              dialogTitle: 'Save / Share Image'
            });
          } catch (shareErr) {
            console.log('Share dialog cancelled or not available', shareErr);
          }
        }
      } catch (error) {
        console.error('Error saving file on device:', error);
        await this.showToast('Failed to save image on device.', 'danger');
      }
    } else {
      if (loading) {
        await this.dismissLoading(loading);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = newName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  convertBlobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }

  onCustomWidthChange() {
    if (this.maintainAspectRatio && this.originalWidth > 0) {
      this.customHeight = Math.round((this.customWidth / this.originalWidth) * this.originalHeight);
    }
  }

  onCustomHeightChange() {
    if (this.maintainAspectRatio && this.originalHeight > 0) {
      this.customWidth = Math.round((this.customHeight / this.originalHeight) * this.originalWidth);
    }
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
