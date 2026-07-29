import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type BofaButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Brand button. Application code must never use `mat-button` directly; the
 * variant mapping to Material appearances is owned here so a brand change is a
 * single-file change in ui-core.
 */
@Component({
  selector: 'bofa-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container [ngSwitch]="variant">
      <button
        *ngSwitchCase="'primary'"
        mat-flat-button
        color="primary"
        class="bofa-button bofa-button--primary"
        [attr.data-variant]="variant"
        [attr.data-state]="disabled ? 'disabled' : null"
        [disabled]="disabled"
        (click)="pressed.emit($event)"
      >
        <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
        <ng-container *ngTemplateOutlet="label"></ng-container>
      </button>

      <button
        *ngSwitchCase="'secondary'"
        mat-stroked-button
        color="accent"
        class="bofa-button bofa-button--secondary"
        [attr.data-variant]="variant"
        [attr.data-state]="disabled ? 'disabled' : null"
        [disabled]="disabled"
        (click)="pressed.emit($event)"
      >
        <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
        <ng-container *ngTemplateOutlet="label"></ng-container>
      </button>

      <button
        *ngSwitchDefault
        mat-button
        class="bofa-button bofa-button--ghost"
        [attr.data-variant]="variant"
        [attr.data-state]="disabled ? 'disabled' : null"
        [disabled]="disabled"
        (click)="pressed.emit($event)"
      >
        <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
        <ng-container *ngTemplateOutlet="label"></ng-container>
      </button>
    </ng-container>

    <ng-template #label><ng-content></ng-content></ng-template>
  `,
})
export class BofaButtonComponent {
  @Input() variant: BofaButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() icon?: string;
  @Output() pressed = new EventEmitter<MouseEvent>();
}
