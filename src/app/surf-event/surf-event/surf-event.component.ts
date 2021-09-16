import {Component, OnInit} from '@angular/core';
import {SurfEvent, exampleEvent} from "../../core/models/surf-event.model";
import {SurfEventService} from "../../core/services/surf-event.service";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";
import {switchMap} from "rxjs/operators";
import {SnackbarService} from "../../core/services/snackbar.service";

@Component({
    selector: 'rs-surf-event',
    templateUrl: './surf-event.component.html',
    styleUrls: ['./surf-event.component.scss']
})
export class SurfEventComponent implements OnInit {
    routeSubscription?: Subscription;
    surfEvent!: SurfEvent;
    isLoading = true;

    constructor(
        private surfEventService: SurfEventService,
        private route: ActivatedRoute,
        private snackBarService: SnackbarService) {
    }

    ngOnInit(): void {
        this.routeSubscription = this.route.params
            .pipe(
                switchMap(params => {
                    const id = params['id'].split('-').pop();
                    return this.surfEventService.getSurfEvent(id)
                })
            )
            .subscribe(
                surfEvent => {
                    this.isLoading = false;
                    this.surfEvent = surfEvent;
                },
                error => {
                    this.isLoading = false;
                    this.snackBarService.send("Unable to load Surf Event", "error");
                    console.log('ERROR loading surf event data :-(', error)
                });
    }

}
