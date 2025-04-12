import { Component, OnInit } from '@angular/core';
import {Router, RouterLinkWithHref} from '@angular/router';
import {IonButton, IonRouterLink} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    selector: 'app-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.scss'],
  imports: [TranslocoPipe, IonButton, RouterLinkWithHref ]
})
export class StartComponent {
}
