import {Component, computed, effect, inject, input, OnInit, signal} from '@angular/core';
import {Waypoint} from "../../helpers/routeHelpers";
import {TranslocoService} from "@jsverse/transloco";
import {map, switchMap} from "rxjs";
import {toObservable, toSignal} from "@angular/core/rxjs-interop";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar, ModalController
} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import * as ionIcons from 'ionicons/icons';

@Component({
  selector: 'app-point-of-interest',
  templateUrl: './point-of-interest.component.html',
  styleUrls: ['./point-of-interest.component.scss'],
  imports: [
    IonButtons, IonContent, IonHeader, IonToolbar, IonButton, IonIcon
  ],
  standalone: true
})
export class PointOfInterestComponent {

  waypoint = signal<Waypoint | null>(null);
  private waypoint$ = toObservable(this.waypoint);

  public set waypointSet(value: Waypoint | null) {
    this.waypoint.set(value);
  }

  translocoService = inject(TranslocoService);
  modalController = inject(ModalController);

  translation$ = this.translocoService.langChanges$
    .pipe(
      switchMap(language => {
        return this.waypoint$
          .pipe(
            map(waypoint => waypoint?.translations?.[language].content)
          )
      })
    );

  content = toSignal(this.translation$);
  imageSrc = computed(() => {
    const waypoint = this.waypoint();
    return `assets/images/route/object${waypoint?.id}.jpg`
  })

  constructor() {
    effect(() => {
      console.log(this.waypoint())
    })

    addIcons({
      'arrow-back-outline': ionIcons.arrowBackOutline
    })
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
