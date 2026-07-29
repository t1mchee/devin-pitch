import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Section navigation for the accounts dashboard. Ink bar styling is OV-10. */
@Component({
  selector: 'bofa-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-tab-group class="bofa-tabs" [ngClass]="{ 'bofa-legacy-shell': legacyShell }" [attr.data-state]="null">
      <!--
        The first tab's content is rendered by the page below the strip; the
        remaining tabs carry an empty state rather than placeholder copy.
      -->
      <mat-tab *ngFor="let tab of tabs; let first = first" [label]="tab">
        <div class="bofa-tabs__panel" *ngIf="!first">Nothing here yet.</div>
      </mat-tab>
    </mat-tab-group>
  `,
})
export class BofaTabsComponent {
  @Input() tabs: string[] = ['Accounts', 'Payments', 'Statements'];
  @Input() legacyShell = false;
}
