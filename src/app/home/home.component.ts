import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonCard, 
  IonCardContent 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [
    RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent
  ]
})
export class HomeComponent {}