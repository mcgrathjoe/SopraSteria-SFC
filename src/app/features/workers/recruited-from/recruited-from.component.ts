import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from "@angular/forms"
import { ActivatedRoute, Router } from "@angular/router"

import { MessageService } from "../../../core/services/message.service"
import { WorkerService } from "../../../core/services/worker.service"
import { RecruitmentService, RecruitmentResponse } from "../../../core/services/recruitment.service"
import { Worker } from "../../../core/model/worker.model"


@Component({
  selector: 'app-recruited-from',
  templateUrl: './recruited-from.component.html'
})
export class RecruitedFromComponent implements OnInit, OnDestroy {

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private workerService: WorkerService,
    private recruitmentService: RecruitmentService,
    private messageService: MessageService
  ) {
    this.saveHandler = this.saveHandler.bind(this)
    this.recruitedFromIdValidator = this.recruitedFromIdValidator.bind(this)
    this.recruitmentKnownChangeHandler = this.recruitmentKnownChangeHandler.bind(this)
  }

  form: FormGroup

  private subscriptions = []
  private worker: Worker
  private workerId: string

  availableRecruitments: RecruitmentResponse[]

  async submitHandler() {
    try {
      await this.saveHandler()
      this.router.navigate([`/worker/adult-social-care-started/${this.workerId}`])

    } catch (err) {
      // keep typescript transpiler silent
    }
  }

  saveHandler() {
    return new Promise((resolve, reject) => {
      if (this.form.valid) {
        const { recruitedFromId, recruitmentKnown } = this.form.value
        this.worker.recruitedFrom = {
          value: recruitmentKnown,
          from: {
            recruitedFromId: parseInt(recruitedFromId)
          }
        }
        this.subscriptions.push(
          this.workerService.updateWorker(this.workerId, this.worker).subscribe(resolve, reject)
        )

      } else {
        this.messageService.clearError()
        this.messageService.show("error", "Please fill required fields.")
        reject()
      }
    })
  }

  recruitmentKnownChangeHandler() {
    this.form.controls.recruitedFromId.reset()
  }

  recruitedFromIdValidator() {
    if (this.form) {
      const { recruitmentKnown } = this.form.value
      const recruitedFromId = this.form.controls.recruitedFromId.value

      if (recruitmentKnown === "Yes") {
        return recruitedFromId ? null : { recruitedFromIdValid: true }
      }
    }

    return null
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      recruitmentKnown: ["", Validators.required],
      recruitedFromId: ["", this.recruitedFromIdValidator]
    })

    const params = this.route.snapshot.paramMap
    this.workerId = params.has("id") ? params.get("id") : null

    if (this.workerId) {
      this.subscriptions.push(
        this.workerService.getWorker(this.workerId).subscribe(worker => {
          this.worker = worker

          if (worker.recruitedFrom) {
            this.form.patchValue({
              recruitmentKnown:  worker.recruitedFrom.value,
              recruitedFromId: worker.recruitedFrom.other ?
                worker.recruitedFrom.other.recruitedFromId : null
            })
          }
        })
      )
    }

    this.subscriptions.push(
      this.recruitmentService.getRecruitedFrom().subscribe(res => this.availableRecruitments = res)
    )
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe())
    this.messageService.clearAll()
  }
}
