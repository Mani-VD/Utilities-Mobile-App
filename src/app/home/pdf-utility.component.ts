import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular/standalone';
// @ts-ignore
import createModule from '@neslinesli93/qpdf-wasm';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-pdf-utility',
  templateUrl: './pdf-utility.component.html',
  styleUrls: ['./pdf-utility.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar]
})
export class PdfUtilityComponent {
  activeTab = 'create';

  activeStyles = {
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false
  };

  encryptPassword = '';
  selectedEncryptFile: File | null = null;

  decryptPassword = '';
  selectedDecryptFile: File | null = null;

  scannedImages: string[] = [];

  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild('scanInput', { static: false }) scanInput!: ElementRef<HTMLInputElement>;

  constructor(private toastController: ToastController) { }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  onEncryptFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedEncryptFile = input.files[0];
    } else {
      this.selectedEncryptFile = null;
    }
  }

  async onDecryptFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedDecryptFile = input.files[0];
      await this.checkIfProtected(this.selectedDecryptFile);
    } else {
      this.selectedDecryptFile = null;
    }
  }

  async checkIfProtected(file: File) {
    try {
      const fileBuffer = await file.arrayBuffer();

      const qpdf = await createModule({
        locateFile: (path: string) => `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/${path}`,
        print: () => { },
        printErr: () => { }
      } as any);

      const uint8Array = new Uint8Array(fileBuffer);
      (qpdf.FS as any).writeFile("/check.pdf", uint8Array);

      let exitCode = 0;
      try {
        exitCode = qpdf.callMain(["--requires-password", "/check.pdf"]);
      } catch (err: any) {
        // Emscripten throws an exception when the process exits with a non-zero status code.
        // The exit code is usually stored in the 'status' property.
        exitCode = err.status ?? 2;
      }

      // Exit code 3 means the file does not require a password (or is unencrypted)
      if (exitCode === 3) {
        const toast = await this.toastController.create({
          message: 'The selected file is not password protected.',
          duration: 3000,
          position: 'bottom',
          color: 'warning'
        });
        await toast.present();
        // Clear the selected file to prevent them from attempting to decrypt it
        this.selectedDecryptFile = null;
      }
    } catch (error) {
      console.error('Error checking PDF protection', error);
    }
  }

  async encryptPDF() {
    if (!this.selectedEncryptFile) {
      alert('Please select a PDF file to encrypt.');
      return;
    }
    if (!this.encryptPassword) {
      alert('Please enter a password.');
      return;
    }

    try {
      const fileBuffer = await this.selectedEncryptFile.arrayBuffer();

      const qpdf = await createModule({
        locateFile: (path: string) => `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/${path}`,
        printErr: (msg: string) => console.warn(msg)
      } as any);

      const uint8Array = new Uint8Array(fileBuffer);
      (qpdf.FS as any).writeFile("/input.pdf", uint8Array);

      // Run the encryption command
      const exitCode = qpdf.callMain(["--encrypt", this.encryptPassword, this.encryptPassword, "256", "--", "/input.pdf", "/output.pdf"]);

      if (exitCode !== 0 && exitCode !== 3) {
        throw new Error(`qpdf exit code: ${exitCode}`);
      }

      const encryptedData = qpdf.FS.readFile("/output.pdf");

      const fileName = `encrypted-${this.getTimestamp()}-${this.selectedEncryptFile.name}`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = this.uint8ArrayToBase64(encryptedData);
        await this.saveNativePDF(fileName, base64Data, 'Encrypted PDF saved.');
      } else {
        const blob = new Blob([encryptedData as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      this.encryptPassword = ''; // clear password after successful encryption
    } catch (error) {
      console.error('Error encrypting PDF', error);
      alert('Failed to encrypt the PDF. Please try again.');
    }
  }

  async decryptPDF() {
    if (!this.selectedDecryptFile) {
      alert('Please select a PDF file to decrypt.');
      return;
    }
    if (!this.decryptPassword) {
      alert('Please enter a password.');
      return;
    }

    try {
      const fileBuffer = await this.selectedDecryptFile.arrayBuffer();

      const qpdf = await createModule({
        locateFile: (path: string) => `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/${path}`,
        printErr: (msg: string) => console.warn(msg)
      } as any);

      const uint8Array = new Uint8Array(fileBuffer);
      (qpdf.FS as any).writeFile("/input.pdf", uint8Array);

      // Run the decryption command
      const exitCode = qpdf.callMain(["--password=" + this.decryptPassword, "--decrypt", "/input.pdf", "/output.pdf"]);

      if (exitCode !== 0 && exitCode !== 3) {
        throw new Error(`qpdf exit code: ${exitCode}`);
      }

      const decryptedData = qpdf.FS.readFile("/output.pdf");

      const fileName = `decrypted-${this.getTimestamp()}-${this.selectedDecryptFile.name}`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = this.uint8ArrayToBase64(decryptedData);
        await this.saveNativePDF(fileName, base64Data, 'Decrypted PDF saved.');
      } else {
        const blob = new Blob([decryptedData as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      this.decryptPassword = ''; // clear password after successful decryption
    } catch (error: any) {
      console.error('Error decrypting PDF', error);
      alert('Failed to decrypt the PDF. Please make sure the password is correct.');
    }
  }

  formatDoc(event: MouseEvent, command: string, value?: string) {
    event.preventDefault();
    document.execCommand(command, false, value);
    this.editor.nativeElement.focus();
    this.checkStyles();
  }

  checkStyles() {
    this.activeStyles.bold = document.queryCommandState('bold');
    this.activeStyles.italic = document.queryCommandState('italic');
    this.activeStyles.underline = document.queryCommandState('underline');

    const block = document.queryCommandValue('formatBlock');
    this.activeStyles.h1 = block === 'h1' || block === 'H1';
    this.activeStyles.h2 = block === 'h2' || block === 'H2';
  }

  insertImage(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.editor.nativeElement.focus();
        document.execCommand('insertImage', false, dataUrl);
        input.value = '';
      };
      reader.readAsDataURL(file);
    }
  }

  async startDocumentScan() {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await DocumentScanner.scanDocument({
          galleryImportAllowed: true,
          pageLimit: 24,
          resultFormats: 'JPEG',
          scannerMode: 'FULL',
        });

        if (result.scannedImages && result.scannedImages.length > 0) {
          result.scannedImages.forEach((imagePath: string) => {
            this.scannedImages.push(Capacitor.convertFileSrc(imagePath));
          });
        }
      } catch (error) {
        console.error('Error scanning document', error);
        if (!String(error).toLowerCase().includes('canceled')) {
          this.scanInput.nativeElement.click(); // Fallback to HTML image scan on error
        }
      }
    } else {
      this.scanInput.nativeElement.click(); // Web fallback
    }
  }

  onScanImages(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          this.scannedImages.push(dataUrl);
        };
        reader.readAsDataURL(file);
      });
      input.value = ''; // Reset input so the user can select more files if needed
    }
  }

  removeScannedImage(index: number) {
    this.scannedImages.splice(index, 1);
  }

  async generateScannedPDF() {
    if (this.scannedImages.length === 0) {
      alert('Please scan or select at least one image.');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      for (let i = 0; i < this.scannedImages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        await new Promise<void>((resolve) => {
          const img = new Image();
          const imgSrc = this.scannedImages[i];
          if (imgSrc.startsWith('http') && !imgSrc.includes('localhost')) {
            img.crossOrigin = 'Anonymous';
          }
          img.onload = () => {
            const ratio = img.height / img.width;
            let printWidth = pageWidth - (margin * 2);
            let printHeight = printWidth * ratio;

            // Scale down if it exceeds page height
            if (printHeight > pageHeight - (margin * 2)) {
              printHeight = pageHeight - (margin * 2);
              printWidth = printHeight / ratio;
            }

            // Center the image on the page
            const xPos = margin + ((pageWidth - (margin * 2) - printWidth) / 2);
            const yPos = margin + ((pageHeight - (margin * 2) - printHeight) / 2);

            // Use the loaded image element directly instead of the source string.
            // jsPDF handles various image formats better when given an HTMLImageElement.
            // The format is specified as 'JPEG' to handle both .jpg and .JPG extensions.
            // The 'FAST' compression option can help with performance and file size.
            pdf.addImage(img, 'JPEG', xPos, yPos, printWidth, printHeight, undefined, 'FAST');
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imgSrc;
        });
      }

      const fileName = `scanned-document-${this.getTimestamp()}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdf.output('datauristring').split(',')[1];
        await this.saveNativePDF(fileName, base64Data, 'Scanned PDF saved.');

      } else {
        pdf.save(fileName);
        await this.showToast('Scanned PDF generated successfully!', 'success');
      }

      this.scannedImages = []; // Clear images after saving

    } catch (error) {
      console.error('Error generating scanned PDF', error);
      alert('An error occurred while generating the scanned PDF.');
    }
  }

  async generatePDF() {
    const editorEl = this.editor.nativeElement;

    if (!editorEl.innerText.trim() && !editorEl.querySelector('img')) {
      alert('Please enter some text or insert an image to generate a PDF.');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxLineWidth = pageWidth - (margin * 2);

      let currentX = margin;
      let yPosition = margin + 5;

      const getLineHeight = (size: number) => size * 0.3527 * 1.15; // pt to mm approx
      let maxLineHeightInCurrentLine = getLineHeight(12);

      const checkPageBreak = (neededSpace = maxLineHeightInCurrentLine) => {
        if (yPosition + neededSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin + 5;
          currentX = margin;
        }
      };

      const tokens: any[] = [];

      // Parse DOM tree into linear stylistic tokens
      const parseNode = (node: Node, state: any) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.replace(/[\r\n]+/g, '').replace(/\s+/g, ' ');
          if (text?.trim()) {
            tokens.push({ type: 'text', content: text, ...state });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const newState = { ...state };

          const fontWeight = el.style?.fontWeight || '';
          if (tag === 'b' || tag === 'strong' || fontWeight === 'bold' || parseInt(fontWeight, 10) >= 600) newState.bold = true;

          const fontStyle = el.style?.fontStyle || '';
          if (tag === 'i' || tag === 'em' || fontStyle === 'italic') newState.italic = true;

          const textDec = el.style?.textDecoration || '';
          if (tag === 'u' || textDec.includes('underline')) newState.underline = true;

          let isBlock = false;
          if (tag === 'h1') { newState.fontSize = 24; newState.bold = true; isBlock = true; }
          if (tag === 'h2') { newState.fontSize = 18; newState.bold = true; isBlock = true; }
          if (tag === 'h3') { newState.fontSize = 14; newState.bold = true; isBlock = true; }
          if (tag === 'p' || tag === 'div') isBlock = true;

          if (isBlock || tag === 'br') tokens.push({ type: 'newline' });

          if (tag === 'img') {
            tokens.push({ type: 'newline' });
            tokens.push({ type: 'image', imgEl: el as HTMLImageElement });
            tokens.push({ type: 'newline' });
          }

          if (tag === 'li') {
            tokens.push({ type: 'newline' });
            tokens.push({ type: 'text', content: '\u2022 ', ...newState });
          }

          Array.from(el.childNodes).forEach(child => parseNode(child, newState));

          if (isBlock || tag === 'li') tokens.push({ type: 'newline' });
        }
      };

      Array.from(editorEl.childNodes).forEach(child =>
        parseNode(child, { bold: false, italic: false, underline: false, fontSize: 12 })
      );

      // Compress consecutive newlines (allow max 2 for paragraph spacing)
      const cleanTokens: any[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'newline') {
          const prev1 = cleanTokens[cleanTokens.length - 1];
          const prev2 = cleanTokens[cleanTokens.length - 2];
          if (prev1?.type === 'newline' && prev2?.type === 'newline') {
            continue; // Skip 3+ consecutive newlines
          }
        }
        cleanTokens.push(tokens[i]);
      }

      while (cleanTokens[0]?.type === 'newline') {
        cleanTokens.shift();
      }

      while (cleanTokens[cleanTokens.length - 1]?.type === 'newline') {
        cleanTokens.pop();
      }

      // Render tokens
      for (let i = 0; i < cleanTokens.length; i++) {
        const token = cleanTokens[i];
        if (token.type === 'newline') {
          const hasDrawableContentAfter = cleanTokens.slice(i + 1).some(nextToken => nextToken.type !== 'newline');
          if (!hasDrawableContentAfter) {
            continue;
          }

          currentX = margin;
          yPosition += maxLineHeightInCurrentLine;
          maxLineHeightInCurrentLine = getLineHeight(12);
          checkPageBreak();
        } else if (token.type === 'image') {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              const ratio = img.height / img.width;
              let printWidth = maxLineWidth;
              let printHeight = printWidth * ratio;

              let maxImageHeight = pageHeight - margin - yPosition;
              if (printHeight > maxImageHeight && yPosition > margin + 5) {
                pdf.addPage();
                yPosition = margin + 5;
                currentX = margin;
                maxImageHeight = pageHeight - margin - yPosition;
              }

              if (printHeight > maxImageHeight) {
                printHeight = maxImageHeight;
                printWidth = printHeight / ratio;
              }

              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                pdf.addImage(dataUrl, 'JPEG', margin, yPosition, printWidth, printHeight);
                yPosition += printHeight;
                currentX = margin;
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = token.imgEl.src;
          });
        } else if (token.type === 'text') {
          let style = 'normal';
          if (token.bold && token.italic) style = 'bolditalic';
          else if (token.bold) style = 'bold';
          else if (token.italic) style = 'italic';

          pdf.setFont("helvetica", style);
          pdf.setFontSize(token.fontSize);

          const lh = getLineHeight(token.fontSize);
          if (lh > maxLineHeightInCurrentLine) maxLineHeightInCurrentLine = lh;

          // Split by whitespace but keep the space as an element to calculate bounds accurately
          const words = token.content.match(/(\S+|\s+)/g) || [];

          for (const word of words) {
            const wordWidth = pdf.getTextWidth(word);

            // Text Wrap Check
            if (currentX + wordWidth > pageWidth - margin && currentX > margin && word.trim() !== '') {
              currentX = margin;
              yPosition += maxLineHeightInCurrentLine;
              checkPageBreak();
            }

            if (word.trim() !== '') {
              pdf.text(word, currentX, yPosition);

              if (token.underline) {
                pdf.setLineWidth(0.3);
                pdf.line(currentX, yPosition + 1, currentX + wordWidth, yPosition + 1);
              }
            }
            currentX += wordWidth;
          }
        }
      }

      const fileName = `generated-document-${this.getTimestamp()}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdf.output('datauristring').split(',')[1];
        await this.saveNativePDF(fileName, base64Data, 'PDF saved.');
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('An error occurred while generating the PDF.');
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  private uint8ArrayToBase64(uint8array: Uint8Array): string {
    let binary = '';
    const len = uint8array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8array[i]);
    }
    return window.btoa(binary);
  }

  private async saveNativePDF(fileName: string, base64Data: string, successMessage: string) {
    try {
      // Ensure the Utilities directory exists
      try {
        await Filesystem.mkdir({
          path: 'Utilities',
          directory: Directory.Documents,
          recursive: false
        });
      } catch (e) {
        // Ignore error if directory already exists
      }

      await Filesystem.writeFile({
        path: `Utilities/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
      });

      await this.showToast(`${successMessage} Saved to Documents/Utilities/${fileName}`);
    } catch (error) {
      console.error('Error saving PDF:', error);
      await this.showToast('Failed to save PDF to the Utilities folder.', 'danger');
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
