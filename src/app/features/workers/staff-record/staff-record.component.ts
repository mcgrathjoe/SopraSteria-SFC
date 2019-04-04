import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Worker } from '@core/model/worker.model';
import { DialogService } from '@core/services/dialog.service';
import { WorkerService } from '@core/services/worker.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { DeleteWorkerDialogComponent } from '../delete-worker-dialog/delete-worker-dialog.component';

@Component({
  selector: 'app-staff-record',
  templateUrl: './staff-record.component.html',
  styleUrls: ['./staff-record.component.scss'],
})
export class StaffRecordComponent implements OnInit, OnDestroy {
  public traingRecordCreated = false;
  public traingRecordDeleted = false;
  private worker: Worker;
  private subscriptions: Subscription = new Subscription();

  constructor(private router: Router, private dialogService: DialogService, private workerService: WorkerService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.workerService.worker$.pipe(take(1)).subscribe(worker => {
        this.worker = worker;
      })
    );

    this.traingRecordCreated = this.workerService.getTrainingRecordCreated();
    this.subscriptions.add(
      this.workerService.trainingRecordDeleted$.subscribe(bool => {
        if (bool) {
          window.scrollTo(0, 0);
        }
        this.traingRecordDeleted = bool;
      })
    );
  }

  ngOnDestroy() {
    if (this.traingRecordCreated) {
      this.workerService.resetTrainingRecordCreated();
    }
    this.workerService.setTrainingRecordDeleted(false);
    this.subscriptions.unsubscribe();
  }

  deleteWorker(event) {
    event.preventDefault();
    const dialog = this.dialogService.open(DeleteWorkerDialogComponent, this.worker);
    dialog.afterClosed.pipe(take(1)).subscribe(nameOrId => {
      if (nameOrId) {
        this.workerService.setLastDeleted(nameOrId);
        this.router.navigate(['/worker', 'delete-success']);
      }
    });
  }

  closeTrainingCreatedAlert(event) {
    event.preventDefault();
    this.workerService.resetTrainingRecordCreated();
    this.traingRecordCreated = false;
  }

  closeTrainingDeletedAlert(event) {
    event.preventDefault();
    this.workerService.setTrainingRecordDeleted(false);
  }
}
