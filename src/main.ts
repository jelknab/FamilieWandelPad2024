import {enableProdMode, importProvidersFrom, isDevMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';


import {environment} from './environments/environment';
import {AppComponent} from './app/app.component';
import {BrowserModule, bootstrapApplication} from '@angular/platform-browser';
import {IonicRouteStrategy, IonicModule} from '@ionic/angular';
import {provideRouter, RouteReuseStrategy, Routes} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {TranslocoHttpLoader} from './transloco-loader';
import {provideTransloco} from '@jsverse/transloco';
import {provideIonicAngular} from '@ionic/angular/standalone';
import {StartComponent} from "./app/pages/start/start.component";
import {MapComponent} from "./app/pages/map/map.component";

if (environment.production) {
  enableProdMode();
}

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // redirectTo: 'start',
    component: StartComponent
  },
  {
    path: 'start',
    pathMatch: 'full',
    component: StartComponent
  },
  {
    path: 'map',
    pathMatch: 'full',
    component: MapComponent
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    //importProvidersFrom(BrowserModule),
    provideIonicAngular(),
    provideRouter(routes),
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['en', 'nl', 'fr', 'es', 'de'],
        defaultLang: 'en',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    })
  ]
})
  .catch(err => console.log(err));
