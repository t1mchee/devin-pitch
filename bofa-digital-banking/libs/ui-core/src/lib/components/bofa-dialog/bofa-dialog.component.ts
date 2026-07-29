import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface BofaDialogData {
  title: string;
  body: string;
  confirmLabel?: string;
}

/** Step-up authentication / confirmation dialog. Surface styling is OV-12. */
@Component({
  selector: 'bofa-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bofa-dialog" data-state="open">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>{{ data.body }}</mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="close(false)">Cancel</button>
        <button mat-flat-button color="primary" (click)="close(true)">
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class BofaDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BofaDialogData,
    private readonly ref: MatDialogRef<BofaDialogComponent>
  ) {}

  close(confirmed: boolean): void {
    this.ref.close(confirmed);
  }
}
