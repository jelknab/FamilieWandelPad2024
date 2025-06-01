import {Component, inject} from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import {TranslocoService} from "@jsverse/transloco";
import { Device } from '@capacitor/device';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { Dialog } from '@capacitor/dialog';

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
        console.log(permissionStatus);
        if (permissionStatus?.location === 'denied') {
          return this.toNativeOptions();
        }
        return null;
      })
      .catch(() => {
        return this.toNativeOptions();
      });

    Device.getLanguageCode().then(l => {
      this.transloco.setActiveLang(l.value);
    });
  }

  private async toNativeOptions() {
    console.log('to native options');
    const { value } = await Dialog.confirm({
      title: this.transloco.translate('app.settings.geolocation.title'),
      message: this.transloco.translate('app.settings.geolocation.description'),
    });

    if (!value) {
      return;
    }

    return NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App
    })
  }
}
