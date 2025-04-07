import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    selector: 'app-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.scss'],
    imports: [TranslocoPipe, IonButton]
})
export class StartComponent  implements OnInit {

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
    this.router.navigate(['/', 'map']);
  }

}
