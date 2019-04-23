import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Contracts } from '@core/constants/contracts.enum';
import { BackService } from '@core/services/back.service';
import { ErrorSummaryService } from '@core/services/error-summary.service';
import { WorkerService } from '@core/services/worker.service';
import * as moment from 'moment';

import { QuestionComponent } from '../question/question.component';

@Component({
  selector: 'app-adult-social-care-started',
  templateUrl: './adult-social-care-started.component.html',
})
export class AdultSocialCareStartedComponent extends QuestionComponent {
  constructor(
    protected formBuilder: FormBuilder,
    protected router: Router,
    protected backService: BackService,
    protected errorSummaryService: ErrorSummaryService,
    protected workerService: WorkerService
  ) {
    super(formBuilder, router, backService, errorSummaryService, workerService);

    this.form = this.formBuilder.group({
      yearKnown: null,
      year: null,
    });
  }

  init(): void {
    this.subscriptions.add(
      this.form.get('yearKnown').valueChanges.subscribe(value => {
        this.form.get('year').reset();
        this.form.get('year').clearValidators();

        if (value === 'Yes') {
          this.form.get('year').setValidators([
            Validators.required,
            Validators.min(
              moment()
                .subtract(100, 'years')
                .year()
            ),
            Validators.max(moment().year()),
          ]);
        }

        this.form.get('year').updateValueAndValidity();
      })
    );

    if (this.worker.socialCareStartDate) {
      this.form.patchValue({
        yearKnown: this.worker.socialCareStartDate.value,
        year: this.worker.socialCareStartDate.year ? this.worker.socialCareStartDate.year : null,
      });
    }

    this.next = [Contracts.Permanent, Contracts.Temporary].includes(this.worker.contract)
      ? ['/worker', this.worker.uid, 'days-of-sickness']
      : ['/worker', this.worker.uid, 'contract-with-zero-hours'];
    this.previous = ['/worker', this.worker.uid, 'recruited-from'];
  }

  setupFormErrorsMap(): void {
    this.formErrorsMap = [
      {
        item: 'year',
        type: [
          {
            name: 'required',
            message: 'Year is required.',
          },
          {
            name: 'min',
            message: `Year can't be earlier than 100 years ago.`,
          },
          {
            name: 'max',
            message: `Year can't be in future.`,
          },
        ],
      },
    ];
  }

  generateUpdateProps() {
    const { yearKnown, year } = this.form.value;

    if (!yearKnown) {
      return null;
    }

    return {
      socialCareStartDate: {
        value: yearKnown.value,
        year: year.value,
      },
    };
  }
}
