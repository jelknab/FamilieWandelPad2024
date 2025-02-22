import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { StartComponent } from './pages/start/start.component';
import { MapComponent } from './pages/map/map.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'start'
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

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
