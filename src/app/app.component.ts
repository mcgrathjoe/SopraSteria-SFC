import 'core-js';

import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Angulartics2GoogleGlobalSiteTag } from 'angulartics2/gst';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'ng-sfc-v2';

  constructor(private router: Router, angulartics: Angulartics2GoogleGlobalSiteTag) {
    angulartics.startTracking();
  }

  ngOnInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      window.scrollTo(0, 0);
    });

    if (localStorage.getItem('auth-token')) {
      localStorage.clear();
    }
  }
}
