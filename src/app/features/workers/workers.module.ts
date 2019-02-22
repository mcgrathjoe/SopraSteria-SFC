import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { AdultSocialCareStartedComponent } from './adult-social-care-started/adult-social-care-started.component';
import { ApprenticeshipTrainingComponent } from './apprenticeship-training/apprenticeship-training.component';
import { AverageWeeklyHoursComponent } from './average-weekly-hours/average-weekly-hours.component';
import { BritishCitizenshipComponent } from './british-citizenship/british-citizenship.component';
import { CareCertificateComponent } from './care-certificate/care-certificate.component';
import { ContractWithZeroHoursComponent } from './contract-with-zero-hours/contract-with-zero-hours.component';
import { CountryOfBirthComponent } from './country-of-birth/country-of-birth.component';
import { CreateStaffRecordStartScreenComponent } from './create-staff-record-start-screen/create-staff-record-start-screen.component';
import { CreateStaffRecordComponent } from './create-staff-record/create-staff-record.component';
import { DateOfBirthComponent } from './date-of-birth/date-of-birth.component';
import { DaysOfSicknessComponent } from './days-of-sickness/days-of-sickness.component';
import { DisabilityComponent } from './disability/disability.component';
import { EditWorkerComponent } from './edit-worker/edit-worker.component';
import { EthnicityComponent } from './ethnicity/ethnicity.component';
import { GenderComponent } from './gender/gender.component';
import { HomePostcodeComponent } from './home-postcode/home-postcode.component';
import { MainJobStartDateComponent } from './main-job-start-date/main-job-start-date.component';
import { MentalHealthComponent } from './mental-health/mental-health.component';
import { NationalInsuranceNumberComponent } from './national-insurance-number/national-insurance-number.component';
import { NationalityComponent } from './nationality/nationality.component';
import { OtherJobRolesComponent } from './other-job-roles/other-job-roles.component';
import { OtherQualificationsLevelComponent } from './other-qualifications-level/other-qualifications-level.component';
import { OtherQualificationsComponent } from './other-qualifications/other-qualifications.component';
import { RecruitedFromComponent } from './recruited-from/recruited-from.component';
import { SalaryComponent } from './salary/salary.component';
import { SocialCareQualificationLevelComponent } from './social-care-qualification-level/social-care-qualification-level.component';
import { SocialCareQualificationComponent } from './social-care-qualification/social-care-qualification.component';
import { WeeklyContractedHoursComponent } from './weekly-contracted-hours/weekly-contracted-hours.component';
import { WorkerSaveSuccessComponent } from './worker-save-success/worker-save-success.component';
import { WorkerSummaryComponent } from './worker-summary/worker-summary.component';
import { WorkersRoutingModule } from './workers-routing.module';
import { YearArrivedUkComponent } from './year-arrived-uk/year-arrived-uk.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, SharedModule, WorkersRoutingModule],
  declarations: [
    AdultSocialCareStartedComponent,
    ApprenticeshipTrainingComponent,
    AverageWeeklyHoursComponent,
    BritishCitizenshipComponent,
    CareCertificateComponent,
    ContractWithZeroHoursComponent,
    CountryOfBirthComponent,
    CreateStaffRecordStartScreenComponent,
    CreateStaffRecordComponent,
    DateOfBirthComponent,
    DaysOfSicknessComponent,
    DisabilityComponent,
    EditWorkerComponent,
    EthnicityComponent,
    GenderComponent,
    HomePostcodeComponent,
    MainJobStartDateComponent,
    MentalHealthComponent,
    NationalInsuranceNumberComponent,
    NationalityComponent,
    OtherJobRolesComponent,
    OtherQualificationsLevelComponent,
    OtherQualificationsComponent,
    RecruitedFromComponent,
    SalaryComponent,
    SocialCareQualificationLevelComponent,
    SocialCareQualificationComponent,
    WeeklyContractedHoursComponent,
    WorkerSaveSuccessComponent,
    WorkerSummaryComponent,
    YearArrivedUkComponent,
  ],
})
export class WorkersModule {}
