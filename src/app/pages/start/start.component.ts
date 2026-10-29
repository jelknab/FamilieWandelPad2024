import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {Router, RouterLinkWithHref} from '@angular/router';
import {IonButton, IonRouterLink} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    selector: 'app-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslocoPipe, IonButton, RouterLinkWithHref ]
})
export class StartComponent {
}
