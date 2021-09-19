import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {Competition, Heat, Result} from "../../core/models/competition.model";
import {RiderResultComponent} from "../surf-event/competition/round/rider-result/rider-result.component";
import {Subject} from "rxjs";
import {ActivatedRoute} from "@angular/router";
import {SurfEventService} from "../../core/services/surf-event.service";
import {switchMap, takeUntil, tap} from "rxjs/operators";
import {SnackbarService} from "../../core/services/snackbar.service";
import {BreakpointObserver} from "@angular/cdk/layout";
import {CarouselComponent} from "../../shared/carousel/carousel.component";

export interface Line {
    source: Point,
    target: Point,
    path: string,
    riderId: string
}

interface Point {
    x: number,
    y: number
}

interface RiderProgress {
    riderId: string,
    maxRound: number
}

@Component({
    selector: 'rs-result-view',
    templateUrl: './result-view.component.html',
    styleUrls: ['./result-view.component.scss']
})
export class ResultViewComponent implements OnInit, AfterViewInit, OnDestroy {

    competition!: Competition;
    @ViewChildren(RiderResultComponent) results!: QueryList<any>;
    @ViewChildren(CarouselComponent) carousel?: QueryList<any>

    lines: Line[] = [];
    points: Point[] = []
    modifiedRounds: any;

    highlightedRider?: string;
    highlightActive = false;

    RIDER_WIDTH = 250;
    RIDER_HALF_HEIGHT = 25;

    CURVE_RADIUS = 20;
    VARIANZ = 0;
    VARIANZ_OFFSET = 0;

    isLoading = true;
    init: any;
    resultAndHeatData!: { riderId: string, result: Result }[];
    smallScreen?: boolean;
    private destroy$ = new Subject();

    constructor(private cd: ChangeDetectorRef,
                private snackBarService: SnackbarService,
                private route: ActivatedRoute,
                private surfEventService: SurfEventService,
                private observer: BreakpointObserver) {
    }

    ngOnInit(): void {
        this.init = this.route.params
            .pipe(
                switchMap(params => {
                    const id = params['id'].split('-').pop();
                    const division = params['division'].toLowerCase();
                    return this.surfEventService.getCompetitionByDivision(id, division);
                }),
                tap(competition => {
                        this.competition = competition;
                        this.isLoading = false;

                    },
                    error => {
                        this.snackBarService.send("Unable to load Competition", "error");
                        console.log('ERROR loading competition data :-(', error)
                    })
            )

        this.observer.observe('(max-width: 878px)')
            .pipe(takeUntil(this.destroy$))
            .subscribe(result => {
                this.smallScreen = result.matches;
            });
    }

    highlightRider(riderId: string) {
        this.highlightedRider = riderId;
        this.highlightActive = !this.highlightActive;

        if (this.smallScreen) {
            this.carousel?.forEach((item, roundIndex) => {
                const heatNumber = this.getHeatNumberOfRider(roundIndex, riderId)
                if(heatNumber !== undefined) {
                    item.setIndex(heatNumber)
                }
            });
        }
    }

    getHeatNumberOfRider(roundIndex: number, riderId: string): number | undefined {
        let resultIndex: number | undefined = undefined;
        let riderIndex: number | undefined = undefined;
        const heats = this.competition.rounds[roundIndex].heats;

        for (let i = 0; i < heats.length; i++) {
             if(heats[i].results.map(result => result.riderId).indexOf(riderId) > -1)  {
                 resultIndex = i;
                 break;
             }
             if(heats[i].riders.indexOf(riderId) > -1) {
                 riderIndex = i;
             }
        }
        if(resultIndex !== undefined) {
            return resultIndex;
        } else if (riderIndex !== undefined) {
            return  riderIndex;
        }
        return undefined;
    }


    getHeatStatus(heat: Heat) {
        switch (heat.state) {
            case 'finished':
            case 'completed':
                return 'finished';
            case 'running':
                return 'surfing';
            default:
                return 'assigned';
        }
    }


    getPointsAndLines() {
        const ridersWithTheirMaxRound: RiderProgress[] = []
        this.competition.rounds.forEach((round, roundNumber) =>
            round.heats.forEach(heat =>
                heat.results.forEach(result => {
                        ridersWithTheirMaxRound.push({riderId: result.riderId, maxRound: roundNumber})
                    }
                )
            ));

        const result = this.getRidersWithRespectiveMaxRound(ridersWithTheirMaxRound);

        for (const rider of result) {
            let points: Point[] = [];
            this.results.forEach(resultElementRef => {
                if (resultElementRef.riderId === rider.riderId) {
                    const leftPoint = {
                        x: resultElementRef.elementRef.nativeElement.offsetLeft - 3,
                        y: resultElementRef.elementRef.nativeElement.offsetTop + this.RIDER_HALF_HEIGHT
                    }
                    const rightPoint = {
                        ...leftPoint,
                        x: resultElementRef.elementRef.nativeElement.offsetLeft + this.RIDER_WIDTH + 3
                    }

                    if (resultElementRef.roundNumber === 0) {
                        points.push(rightPoint)
                        this.points.push(rightPoint)
                    } else if (resultElementRef.roundNumber === (this.competition.rounds.length - 1) || resultElementRef.roundNumber === rider.maxRound) {
                        points.push(leftPoint)
                        this.points.push(leftPoint)
                    } else {
                        points.push(leftPoint, rightPoint)
                        this.points.push(leftPoint, rightPoint)
                    }
                }
            })

            for (let i = 0; i < points.length; i += 2) {
                try {
                    let {a, b} = this.extractPoints(points, i);
                    let path = this.calculatePath(a, b);
                    this.lines.push({
                        source: a,
                        target: b,
                        path: path,
                        riderId: rider.riderId
                    })
                } catch (notLineException) {
                    // EMPTY AS NO NEED TO ADD LINE
                }
            }

        }
    }

    getRidersWithRespectiveMaxRound(ridersWithResult: RiderProgress[]): RiderProgress[] {
        const temp = new Map();

        for (const item of ridersWithResult) {
            const element = temp.get(item.riderId)
            if (element) {
                element.riderId = item.riderId
                element.maxRound = Math.max(element.maxRound, item.maxRound);
            } else {
                temp.set(item.riderId,
                    {riderId: item.riderId, maxRound: item.maxRound})
            }
        }

        return Array.from(temp.values());
    }

    ngAfterViewInit(): void {
        this.init.subscribe(() => {
                console.log("SUBSCRIBE")
                this.isLoading = false;
                this.cd.detectChanges();
                this.getPointsAndLines();
            }
        )
    }

    ngOnDestroy(): void {
        this.destroy$.next(null);
        this.destroy$.complete();
    }

    private extractPoints(points: Point[], i: number): { a: Point, b: Point } {
        return {
            a: {
                x: points[i].x,
                y: points[i].y
            },
            b: {
                x: points[i + 1].x,
                y: points[i + 1].y
            }

        }
    }

    private calculatePath(a: Point, b: Point) {

        const deltaX = b.x - a.x;
        const varianz = Math.random() * this.VARIANZ + this.VARIANZ_OFFSET;
        const middleX = a.x + (deltaX / 2) + varianz;
        console.log("middleX:", middleX);
        let deltaY = b.y - a.y;
        let middleY = a.y + (deltaY / 2);
        let signY = Math.sign(deltaY)
        // TODO: funktionert momentan nur für horizontale verbindungen, für vertikale, muss wohl auch noch ein signX eingesetzt werden
        // M 0 0 L 1 0 Q 2 0 2 1 L 2 2 L 2 3 Q 2 4 3 4 L 4 4
        let path = `M ${a.x} ${a.y}, L ${middleX - this.CURVE_RADIUS} ${a.y}, Q ${middleX} ${a.y} ${middleX} ${a.y + signY * this.CURVE_RADIUS}, L ${middleX} ${middleY}, L ${middleX} ${b.y - signY * this.CURVE_RADIUS}, Q ${middleX} ${b.y} ${middleX + this.CURVE_RADIUS} ${b.y}, L ${b.x} ${b.y}`;
        return path;
    }
}