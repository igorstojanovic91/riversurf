import {Component, OnInit} from '@angular/core';
import {Competition, exampleComp, Result} from "../../../core/models/competition.model";
import {SnackbarService} from "../../../core/services/snackbar.service";

export interface RoundModel {
    id: number;
    riders: string[];
    results: Result[];
}

@Component({
    selector: 'rs-competition',
    templateUrl: './competition.component.html',
    styleUrls: ['./competition.component.scss']
})
export class CompetitionComponent implements OnInit {

    competition: Competition = {...exampleComp};

    rounds: RoundModel[] = [];
    selectedTabIndex: number = 0;

    constructor(private snackBarService: SnackbarService) {
    }

    ngOnInit(): void {
        let initialRound: RoundModel = {
            id: 0,
            riders: this.competition.riders,
            results: []
        }
        this.rounds.push(initialRound);
        const maxRounds = Math.ceil(this.competition.riders.length / 8);
        for (let i = 0; i < maxRounds; i++) {
            this.rounds.push({
                id: i + 1,
                riders: [],
                results: []
            });
        }
    }

    onFinishedRound(promotedRiders: string[]) {
        console.log(promotedRiders)
        for(let i = 0; i < this.rounds.length; i++) {
            console.log(this.rounds[i].riders) // IDEA: PUSH IN NEXT ROUND WITHOUT RIDERS, NOT YET WORKING
            if(!this.rounds[i].riders.length) {
                this.rounds[i].riders = promotedRiders;
            }
        }
        this.selectedTabIndex = this.selectedTabIndex + 1;
        this.snackBarService.send('Round successfully finished!', 'success');
    }

    getRoundLabel(roundIndex: number): string {
        let label = 'Round ' + (+roundIndex);
        if (roundIndex === 0) {
            label = 'Seeding round';
        } else if (roundIndex === this.rounds.length - 1) {
            label = 'Finals';
        } else if (roundIndex === this.rounds.length - 2) {
            label = 'Semifinals';
        }
        return label;
    }
}
