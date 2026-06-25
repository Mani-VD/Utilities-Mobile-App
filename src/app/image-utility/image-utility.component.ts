import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, 
  IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
  IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonIcon,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { contractOutline, resizeOutline, cropOutline } from 'ionicons/icons';
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
    IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonIcon
  ]
})
export class ImageUtilityComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cropperImage') cropperImage!: ElementRef<HTMLImageElement>;
  
  activeMode: 'compress' | 'resize' | 'crop' = 'compress';
  
  selectedFile: File | null = null;
  imageSrc: string | null = null;
  
  // Settings
  outputFormat: string = 'auto'; // 'auto' | 'image/jpeg' | 'image/png' | 'image/webp'
  
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

  constructor(private toastController: ToastController) {
    addIcons({ contractOutline, resizeOutline, cropOutline });
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageSrc = e.target.result;
        this.loadOriginalDimensions();
        this.loadOriginalDimensions();
        if (this.activeMode === 'crop') {
          setTimeout(() => this.initCropper(), 100);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  loadOriginalDimensions() {
    if (!this.imageSrc) return;
    const img = new Image();
    img.onload = () => {
      this.originalWidth = img.width;
      this.originalHeight = img.height;
      if (this.maintainAspectRatio) {
        this.customWidth = img.width;
        this.customHeight = img.height;
      }
    };
    img.src = this.imageSrc;
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
      'image/png': 'png',
      'image/webp': 'webp'
    };
    return map[mimeType] || 'jpg';
  }

  async processImage() {
    if (!this.selectedFile || !this.imageSrc) return;

    const mimeType = this.getOutputMimeType();
    let resultBlob: Blob | null = null;

    if (this.activeMode === 'compress') {
      const options = {
        maxSizeMB: this.targetSizeKB / 1024,
        useWebWorker: true,
        fileType: mimeType
      };
      try {
        resultBlob = await imageCompression(this.selectedFile, options);
      } catch (error) {
        console.error('Compression error:', error);
        return;
      }
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
    }

    if (resultBlob) {
      this.downloadBlob(resultBlob, mimeType);
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

  async downloadBlob(blob: Blob, mimeType: string) {
    const ext = this.getOutputExtension(mimeType);
    const originalName = this.selectedFile?.name || 'image';
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const newName = `${nameWithoutExt}-${this.activeMode}.${ext}`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await this.convertBlobToBase64(blob) as string;
        
        try {
          await Filesystem.mkdir({
            path: 'Utilities',
            directory: Directory.Documents,
            recursive: false
          });
        } catch (e) {
          // Ignore if exists
        }

        await Filesystem.writeFile({
          path: `Utilities/${newName}`,
          data: base64Data,
          directory: Directory.Documents
        });
        
        await this.showToast(`Saved to Documents/Utilities/${newName}`);
      } catch (error) {
        console.error('Error saving file on device:', error);
        await this.showToast('Failed to save image to the Utilities folder.', 'danger');
      }
    } else {
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
