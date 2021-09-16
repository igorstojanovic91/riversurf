import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {SnackbarService} from "../../../../core/services/snackbar.service";
import {Heat, Round} from "../../../../core/models/competition.model";

@Component({
    selector: 'rs-round',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss']
})
export class RoundComponent implements OnInit, OnChanges {

    @Input() round!: Round;
    @Input() isFinalRound!: boolean;
    @Output() finishedRound = new EventEmitter<string[]>();

    unassignedRiders!: string[];
    heatSize = 4;
    oneHeatStarted = false;
    heatsFinished: boolean[] = [];

    constructor(private snackbarService: SnackbarService) {
    }

    ngOnInit(): void {
    }

    ngOnChanges(): void {
        this.setupRound();
    }

    setupRound(): void {
        // ToDo: search for unassigned riders
        this.unassignedRiders = [...this.round.riders];
        const numberOfHeats = Math.ceil(this.unassignedRiders.length / this.heatSize);
        for (let i = 0; i < numberOfHeats; i++) {
            this.round.heats.push({
                id: i,
                riders: [],
                state: 'idle',
                results: []
            })
            this.heatsFinished.push(false);
        }
    }

    drop(event: CdkDragDrop<string[], any>) {
        console.log(`event`, event);
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
            return
        } else {
            if (event.container.data.length !== this.heatSize || event.container.id === 'unassignedRiders') {
                transferArrayItem(event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex);
                this.snackbarService.send(`Successfully Assigned!`, "success")
                return
            }
        }
        this.snackbarService.send(`Sorry, this heat is already complete!`, "warning")
        console.log(`heats`, this.round.heats);
    }

    revert() {
        for (const heat of this.round.heats) {
            const heatLength = heat.riders.length;
            for (let i = 0; i <= heatLength; i++) {
                const removedRider = heat.riders.pop()
                if (removedRider)
                    this.unassignedRiders.push(removedRider);
            }
            this.snackbarService.send("All riders are no longer assigned", "success");
        }
    }

    automaticallyAssignRiders() {
        for (let i = this.unassignedRiders.length - 1; i >= 0; i--) {
            const riderId = this.unassignedRiders.splice(Math.floor(Math.random() * this.unassignedRiders.length), 1);
            this.assignRiderToHeat(riderId[0]);
        }
        this.snackbarService.send("Hope you like my heat assignment?", "success")
    }

    assignRiderToHeat(riderId: string) {
        const randomGroupNumber = Math.floor(Math.random() * this.round.heats.length);
        this.round.heats[randomGroupNumber].riders.length < this.heatSize
            ? this.round.heats[randomGroupNumber].riders.push(riderId)
            : this.assignRiderToHeat(riderId);
    }

    checkAllHeatsFinished(): boolean {
        return !this.round.heats.map(heat => heat.riders.length === heat.results.length && heat.results.length > 0).every(element => element)
    }

    heatHasAllResults(heatNumber: number): boolean {
        const hasAllResults = this.round.heats[heatNumber].results.length === this.round.heats[heatNumber].riders.length && this.round.heats[heatNumber].riders.length > 0;
        if (hasAllResults) {
            this.round.heats[heatNumber].state = 'finished';
        }
        return hasAllResults;
    }

    moveToNextRound(roundNumber: number) {
        let promotedRiders = [];
        for (const heat of this.round.heats) {
            const sortedArray = heat.results.sort((a, b) => a.value > b.value ? 1 : -1)
            if (roundNumber === 0) {
                promotedRiders.push(sortedArray.map(result => result.riderId));
            } else {
                promotedRiders.push(sortedArray.map(result => result.riderId).splice(0, 2));
            }
        }
        promotedRiders = promotedRiders.reduce((acc, val) => acc.concat(val), []);
        this.finishedRound.emit(promotedRiders);
    }

    handleStatusChange(event: { action: string, heat: Heat }) {
        let msg = `Heat ${event.heat.id + 1} `
        switch (event.action) {
            case "start":
                this.round.heats[event.heat.id] = {...event.heat, state: 'running'}
                this.oneHeatStarted = true;
                msg += "started!"
                break;
            case "stop":
                this.round.heats[event.heat.id] = {...event.heat, state: 'finished'}
                this.snackbarService.send(`Heat ${event.heat.id + 1} started!`, 'success')
                msg += "stopped!"
                break;
            case "save":
                //TODO ADD RESULTS AND CHECK IF ALL RESULTS ARE AVIALBE
                this.round.heats[event.heat.id] = {...event.heat, state: 'completed'}
                //this.heatHasAllResults(event.heatNumber);
                msg += "saved!"
                break;
        }
        this.snackbarService.send(msg, "success");
    }

    finishCompetition() {
        // TODO WHAT TO DO here?
        this.snackbarService.send("Competition finished", "success");
    }


}
