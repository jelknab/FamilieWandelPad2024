import {Component, inject} from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import {TranslocoService} from "@jsverse/transloco";
import { Device } from '@capacitor/device';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    IonApp,
    IonRouterOutlet
  ]
})
export class AppComponent {
  transloco = inject(TranslocoService);

  constructor() {
    Geolocation.checkPermissions()
      .then(permissionStatus => {
        if (permissionStatus.location !== 'granted' ) {
          return Geolocation.requestPermissions();
        }

        return null;
      })
      .then(permissionStatus => {
        if (permissionStatus?.location === 'denied') {
          // TODO
        }
      });

    Device.getLanguageCode().then(l => {
      this.transloco.setActiveLang(l.value);
    });
  }
}
