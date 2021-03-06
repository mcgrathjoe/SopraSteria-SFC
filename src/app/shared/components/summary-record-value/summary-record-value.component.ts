import { Component, Input } from '@angular/core';
import { Eligibility, WDFValue } from '@core/model/wdf.model';

@Component({
  selector: 'app-summary-record-value',
  templateUrl: './summary-record-value.component.html',
})
export class SummaryRecordValueComponent {
  @Input() wdfView: boolean;
  @Input() wdfValue: WDFValue;
  public ELIGIBILITY = Eligibility;
}
