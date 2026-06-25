import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { IonApp, IonRouterOutlet, ToastController, NavController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private backButtonListener?: PluginListenerHandle;
  private lastBackPress = 0;
  private readonly exitThresholdMs = 2000;

  constructor(private toastController: ToastController, private navCtrl: NavController, private router: Router) { }

  async ngOnInit() {

    this.backButtonListener = await CapacitorApp.addListener('backButton', async () => {
      if (this.router.url !== "/home") {
        this.navCtrl.back();
        return;
      }
      else if (this.router.url === "/home") {
        const now = Date.now();
        if (now - this.lastBackPress < this.exitThresholdMs) {
          await CapacitorApp.exitApp();
          return;
        }

        this.lastBackPress = now;
        const toast = await this.toastController.create({
          message: 'Press back again to exit',
          duration: this.exitThresholdMs,
          position: 'bottom',
        });
        await toast.present();
      }

    });
  }

  ngOnDestroy() {
    this.backButtonListener?.remove();
  }
}
